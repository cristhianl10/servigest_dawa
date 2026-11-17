# 07 — Guías de implementación

Lineamientos concretos para materializar el diseño. El código de ejemplo es orientativo; las reglas y contratos son normativos.

## 1. Puesta en marcha del monorepo

```bash
pnpm install
cp .env.example .env
docker compose up -d db
pnpm --filter api prisma migrate dev
pnpm --filter api prisma db seed
pnpm --filter api dev
pnpm --filter web dev
```

Orden de construcción en CI: `packages/shared` → `apps/api` → `apps/web`.

## 2. Módulo de autenticación

### 2.1. Política de contraseñas

```ts
export const passwordSchema = z.string()
  .min(10, "Mínimo 10 caracteres")
  .max(72, "Máximo 72 caracteres")
  .regex(/[A-Z]/, "Debe incluir una mayúscula")
  .regex(/[a-z]/, "Debe incluir una minúscula")
  .regex(/[0-9]/, "Debe incluir un número")
  .regex(/[^A-Za-z0-9]/, "Debe incluir un símbolo");
```

- Hash con `argon2id` (`memoryCost: 19456`, `timeCost: 2`, `parallelism: 1`) o bcrypt coste 12.
- `password_hash` nunca se selecciona en consultas de salida.

### 2.2. Login y bloqueo

```ts
async function login(email: string, password: string, ip: string) {
  const user = await users.findByEmail(email);
  if (!user) throw new DomainError("CREDENCIALES_INVALIDAS", 401);
  if (user.status !== "ACTIVO") throw new DomainError("USUARIO_INACTIVO", 403);
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new DomainError("DEMASIADOS_INTENTOS", 429);
  }
  const valid = await verify(password, user.passwordHash);
  if (!valid) {
    const attempts = user.failedAttempts + 1;
    await users.registerFailure(user.id, attempts, attempts >= 5 ? addMinutes(new Date(), 15) : null);
    throw new DomainError("CREDENCIALES_INVALIDAS", 401);
  }
  await users.registerSuccess(user.id);
  return tokens.issue(user);
}
```

- Mensaje genérico en `401`: no revelar si el correo existe.
- Rate limit adicional por IP en la ruta (`express-rate-limit`).

### 2.3. Tokens

```ts
const accessToken = jwt.sign(
  { sub: user.id, role: user.role, clientId: user.clientId, jti: randomUUID() },
  env.JWT_SECRET,
  { expiresIn: "15m", issuer: "servigest-api", audience: "servigest-web" }
);

const refreshToken = randomBytes(48).toString("base64url");
await refreshTokens.create({
  userId: user.id,
  tokenHash: sha256(refreshToken),
  expiresAt: addDays(new Date(), 7),
});
```

- Cookie: `httpOnly`, `secure: env.NODE_ENV === "production"`, `sameSite: "strict"`, `path: "/api/auth"`.
- Rotación: al refrescar se revoca el anterior en la misma transacción; si se detecta reutilización, se revocan todas las sesiones.
- Logout: revoca el refresh actual y borra la cookie.

### 2.4. Recuperación de contraseña

- Responder `202` siempre, exista o no el correo.
- Token aleatorio de 32 bytes, guardado como hash, `expires_at = now + 30 min`, `used_at` al consumir.
- Al restablecer: marcar `used_at`, actualizar hash y revocar todos los refresh tokens del usuario.
- El enlace del correo apunta al frontend: `${WEB_URL}/reset-password?token=...`.

### 2.5. Middleware de autenticación y autorización

```ts
export function authenticate(req, res, next) {
  const [scheme, token] = (req.headers.authorization ?? "").split(" ");
  if (scheme !== "Bearer" || !token) return next(new DomainError("TOKEN_INVALIDO", 401));
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, {
      issuer: "servigest-api",
      audience: "servigest-web",
    });
    res.locals.user = { id: payload.sub, role: payload.role, clientId: payload.clientId };
    next();
  } catch {
    next(new DomainError("TOKEN_INVALIDO", 401));
  }
}

export const authorize = (...roles: Role[]) => (req, res, next) => {
  const { role } = res.locals.user;
  if (!roles.includes(role)) return next(new DomainError("SIN_PERMISO", 403));
  next();
};
```

La **propiedad** se valida en el servicio:

```ts
if (actor.role === "CLIENTE" && request.clientId !== actor.clientId) {
  throw new DomainError("RECURSO_NO_ENCONTRADO", 404);
}
if (actor.role === "TECNICO" && request.assignedTechnicianId !== actor.technicianId) {
  throw new DomainError("SIN_ASIGNACION", 403);
}
```

### 2.6. SSE y autenticación

`EventSource` nativo no permite enviar `Authorization`. El cliente usa un lector SSE basado en `fetch` (por ejemplo `@microsoft/fetch-event-source`) que adjunta el Bearer y gestiona reconexión; alternativa: ticket efímero de un solo uso. No se acepta el token en la URL en producción.

## 3. Registro de solicitudes

```ts
async function createRequest(input: CreateRequestDto, actor: Actor) {
  const category = await catalogs.findCategory(input.categoryId);
  if (!category || category.status !== "ACTIVA") {
    throw new DomainError("CATEGORIA_INVALIDA", 422);
  }
  const site = await clients.findSite(input.siteId);
  if (!site) throw new DomainError("SEDE_NO_ENCONTRADA", 404);
  const clientId = actor.role === "CLIENTE" ? actor.clientId : site.clientId;
  if (site.clientId !== clientId) {
    throw new DomainError("SEDE_NO_PERTENECE_AL_CLIENTE", 422);
  }
  if (input.assetId) {
    const asset = await assets.find(input.assetId);
    if (!asset || asset.siteId !== site.id) {
      throw new DomainError("EQUIPO_INVALIDO", 422);
    }
  }
  const code = await codes.next(clientId);
  const dueAt = sla.calculateDueAt(new Date(), input.priority, 0);
  return prisma.$transaction(async (tx) => {
    const request = await tx.serviceRequest.create({
      data: { ...input, code, clientId, createdBy: actor.id, status: "REGISTRADA", dueAt },
    });
    await audit.record(tx, {
      requestId: request.id,
      actorId: actor.id,
      action: "CREACION",
      toStatus: "REGISTRADA",
      comment: input.description,
    });
    await notifications.enqueue(tx, recipientsForNewRequest(request), request);
    return request;
  });
}
```

### 3.1. Código único

- Formato: `SOL-YYYYMM-#####` (secuencia por mes).
- Implementación: tabla `request_code_sequences (period, last_value)` o `SELECT nextval` por período dentro de la transacción.
- `code` es inmutable: el `PATCH` no lo acepta.

### 3.2. Cálculo de `dueAt`

- Se calcula siempre con `SlaService`; nunca se acepta del cliente.
- Cambio de prioridad: recalcular desde `created_at` con `sla_paused_minutes`.
- `PENDIENTE_INFO`: guardar `paused_at`; al reanudar acumular minutos y recalcular.

## 4. Máquina de estados

### 4.1. Tabla declarativa

```ts
type TransitionRule = {
  from: Status[];
  to: Status;
  roles: Role[];
  requiresAssignment?: boolean;
  requiredFields?: Array<"comment" | "resolution" | "reason">;
  minLength?: Record<string, number>;
};

export const TRANSITIONS: Record<Action, TransitionRule> = {
  aprobar: { from: ["REGISTRADA"], to: "APROBADA", roles: ["ADMIN", "COORDINADOR"] },
  cancelar: {
    from: ["REGISTRADA", "APROBADA", "ASIGNADA", "EN_PROCESO", "PENDIENTE_INFO"],
    to: "CANCELADA",
    roles: ["ADMIN", "COORDINADOR", "CLIENTE"],
    requiredFields: ["reason"],
    minLength: { reason: 10 },
  },
  asignar: { from: ["APROBADA"], to: "ASIGNADA", roles: ["ADMIN", "COORDINADOR"] },
  iniciar: {
    from: ["ASIGNADA"], to: "EN_PROCESO", roles: ["TECNICO"],
    requiresAssignment: true,
  },
  solicitar_info: {
    from: ["ASIGNADA", "EN_PROCESO"], to: "PENDIENTE_INFO",
    roles: ["TECNICO", "COORDINADOR"], requiresAssignment: true,
    requiredFields: ["comment"], minLength: { comment: 10 },
  },
  reanudar: {
    from: ["PENDIENTE_INFO"], to: "EN_PROCESO",
    roles: ["TECNICO", "COORDINADOR"], requiresAssignment: true,
  },
  resolver: {
    from: ["EN_PROCESO"], to: "RESUELTA", roles: ["TECNICO"],
    requiresAssignment: true, requiredFields: ["resolution"],
    minLength: { resolution: 30 },
  },
  cerrar: {
    from: ["RESUELTA"], to: "CERRADA", roles: ["ADMIN", "COORDINADOR", "CLIENTE"],
  },
  reabrir_trabajo: {
    from: ["RESUELTA"], to: "EN_PROCESO", roles: ["COORDINADOR"],
    requiredFields: ["reason"], minLength: { reason: 10 },
  },
  reapertura: {
    from: ["CERRADA"], to: "APROBADA", roles: ["ADMIN", "COORDINADOR"],
    requiredFields: ["reason"], minLength: { reason: 20 },
  },
};
```

### 4.2. Servicio de transición

```ts
async function transition(requestId: string, input: TransitionDto, actor: Actor) {
  return prisma.$transaction(async (tx) => {
    const request = await requests.lockById(tx, requestId);
    if (!request) throw new DomainError("RECURSO_NO_ENCONTRADO", 404);
    if (request.version !== input.version) {
      throw new DomainError("CONFLICTO_VERSION", 409);
    }
    const rule = TRANSITIONS[input.action];
    if (!rule) throw new DomainError("TRANSICION_INVALIDA", 409);
    if (!rule.from.includes(request.status)) {
      const code = request.status === "CERRADA" ? "SOLICITUD_CERRADA" : "TRANSICION_INVALIDA";
      throw new DomainError(code, 409);
    }
    if (!rule.roles.includes(actor.role)) throw new DomainError("SIN_PERMISO", 403);
    if (rule.requiresAssignment && request.assignedTechnicianId !== actor.technicianId) {
      throw new DomainError("SIN_ASIGNACION", 403);
    }
    if (actor.role === "CLIENTE" && request.clientId !== actor.clientId) {
      throw new DomainError("RECURSO_NO_ENCONTRADO", 404);
    }
    assertRequiredFields(rule, input);
    if (rule.to === "CERRADA" && !request.resolution) {
      throw new DomainError("RESOLUCION_REQUERIDA", 422);
    }

    const now = new Date();
    const updated = await requests.updateStatus(tx, request, rule.to, input, now);
    await audit.record(tx, {
      requestId,
      actorId: actor.id,
      action: input.action === "reapertura" ? "REAPERTURA" : "TRANSICION",
      fromStatus: request.status,
      toStatus: rule.to,
      comment: input.comment ?? input.reason ?? null,
    });
    await notifications.enqueue(tx, recipientsForTransition(request, rule.to), updated);
    return updated;
  });
}
```

### 4.3. Timestamps por estado

| Estado destino | Campo a setear |
| :--- | :--- |
| `APROBADA` | `approved_at` (si es null) |
| `ASIGNADA` | `assigned_at` |
| `EN_PROCESO` | `started_at` (si es null) |
| `RESUELTA` | `resolved_at`, `resolution` |
| `CERRADA` | `closed_at` |
| `CANCELADA` | `cancellation_reason` |
| `PENDIENTE_INFO` | `paused_at` |
| Reanudar | acumular pausa y limpiar `paused_at` |

## 5. Asignación y reasignación

```ts
async function assign(requestId: string, technicianId: string, actor: Actor, reason?: string) {
  return prisma.$transaction(async (tx) => {
    const request = await requests.lockById(tx, requestId);
    if (!request) throw new DomainError("RECURSO_NO_ENCONTRADO", 404);
    if (!["APROBADA", "ASIGNADA"].includes(request.status)) {
      throw new DomainError("TRANSICION_INVALIDA", 409);
    }
    const technician = await technicians.findWithUserAndSpecialties(tx, technicianId);
    if (!technician || technician.user.status !== "ACTIVO") {
      throw new DomainError("TECNICO_NO_DISPONIBLE", 409);
    }
    if (technician.availability !== "DISPONIBLE") {
      throw new DomainError("TECNICO_NO_DISPONIBLE", 409);
    }
    const category = await catalogs.findCategory(tx, request.categoryId);
    if (!technician.specialties.some((s) => s.specialtyId === category.specialtyId)) {
      throw new DomainError("ESPECIALIDAD_INCOMPATIBLE", 409);
    }
    const activeLoad = await assignments.countActive(tx, technicianId);
    if (activeLoad >= technician.maxConcurrentLoad) {
      throw new DomainError("CARGA_EXCEDIDA", 409);
    }
    const current = await assignments.findCurrent(tx, requestId);
    if (current && !reason) throw new DomainError("MOTIVO_REQUERIDO", 422);

    if (current) await assignments.finish(tx, current.id, new Date());
    await assignments.create(tx, { requestId, technicianId, assignedBy: actor.id, reason: reason ?? null });
    await requests.markAssigned(tx, request, technicianId);
    await audit.record(tx, {
      requestId,
      actorId: actor.id,
      action: current ? "REASIGNACION" : "ASIGNACION",
      fromStatus: request.status,
      toStatus: "ASIGNADA",
      metadata: { previousTechnicianId: current?.technicianId ?? null, technicianId },
      comment: reason ?? null,
    });
    await notifications.enqueue(tx, recipientsForAssignment(request, technician, current), request);
  });
}
```

Reglas:

- La consulta de carga cuenta asignaciones `VIGENTE` con solicitud en estado abierto.
- El índice parcial único garantiza una sola asignación vigente.
- La reasignación exige `reason ≥ 10`.
- No se puede asignar un técnico inactivo o no disponible.

## 6. Servicio de SLA

```ts
function addBusinessMinutes(start: Date, minutes: number, calendar: Calendar): Date {
  let cursor = new Date(start);
  let remaining = minutes;
  while (remaining > 0) {
    cursor = calendar.nextBusinessMoment(cursor);
    const available = calendar.minutesUntilClose(cursor);
    const consume = Math.min(remaining, available);
    cursor = new Date(cursor.getTime() + consume * 60_000);
    remaining -= consume;
  }
  return cursor;
}

function calculateDueAt(createdAt: Date, priority: Priority, pausedMinutes: number) {
  const hours = params.slaHours(priority);
  return addBusinessMinutes(createdAt, hours * 60 + pausedMinutes, calendar);
}
```

- `nextBusinessMoment` salta fines de semana y feriados y avanza a las 08:00 si está fuera de horario.
- `minutesUntilClose` devuelve 0 si ya cerró (se vuelve a avanzar al siguiente día hábil).
- Zona horaria `America/Guayaquil`; usar `date-fns-tz`.
- Pruebas obligatorias: viernes, feriado, pausa, cambio de prioridad y límite exacto.

## 7. Auditoría inmutable

```ts
async function record(tx: Tx, event: AuditEvent) {
  await tx.requestHistory.create({ data: event });
}
```

- No existe endpoint de actualización ni borrado del historial.
- Opcional: trigger PostgreSQL que rechace `UPDATE`/`DELETE` sobre `request_history`.
- El evento se inserta en la **misma transacción** que el cambio.

## 8. Notificaciones y SSE

### 8.1. Persistencia

```ts
async function enqueue(tx: Tx, userIds: string[], request: ServiceRequest, title: string, body: string, type: NotificationType) {
  const data = userIds.map((userId) => ({ userId, requestId: request.id, type, title, body }));
  await tx.notification.createMany({ data });
  pendingAfterCommit.push({ userIds, requestId: request.id, type, title, body });
}
```

- `pendingAfterCommit` se publica solo si la transacción hace commit.
- Si el proceso falla antes de publicar, la notificación queda persistida y se recupera por API/polling.

### 8.2. Hub SSE

```ts
const clients = new Map<string, Set<Response>>();

function subscribe(userId: string, res: Response) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write("event: ready\ndata: {}\n\n");
  if (!clients.has(userId)) clients.set(userId, new Set());
  clients.get(userId)!.add(res);
  res.on("close", () => clients.get(userId)?.delete(res));
}

function publish(userIds: string[], payload: object) {
  const frame = `id: ${Date.now()}\nevent: notification\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const userId of userIds) {
    for (const res of clients.get(userId) ?? []) res.write(frame);
  }
}

setInterval(() => {
  for (const set of clients.values()) for (const res of set) res.write(": ping\n\n");
}, 25_000);
```

- Heartbeat cada 25 s.
- Reintento en el cliente con backoff; recuperar no leídas al reconectar.
- Escalado horizontal: sustituir el `Map` por Redis Pub/Sub.

## 9. Adjuntos

- `multer` con `memoryStorage`, `limits.fileSize = 10 MB`.
- Validar MIME real (firma de archivo) además del declarado.
- Clave de almacenamiento aleatoria: `requests/<requestId>/<uuid>.<ext>`.
- Metadatos en BD; el archivo nunca se sirve por ruta pública.
- Descarga: verificar autorización por rol/propiedad y responder con `Content-Disposition: attachment`.
- Borrado lógico o físico controlado solo antes de `CERRADA`.

## 10. Dashboard

### 10.1. Consultas de ejemplo (parametrizadas)

```sql
SELECT st.code AS status, COUNT(*)::int AS count
FROM service_requests r
JOIN request_statuses st ON st.id = r.status_id
WHERE r.created_at >= $1 AND r.created_at < $2
GROUP BY st.code, st.sort_order
ORDER BY st.sort_order;
```

```sql
SELECT t.id,
       u.full_name,
       t.max_concurrent_load AS capacity,
       COUNT(a.id) FILTER (WHERE a.status = 'VIGENTE')::int AS active
FROM technicians t
JOIN users u ON u.id = t.user_id
LEFT JOIN request_assignments a ON a.technician_id = t.id
GROUP BY t.id, u.full_name, t.max_concurrent_load
ORDER BY active DESC;
```

```sql
SELECT
  COUNT(*) FILTER (WHERE resolved_at IS NOT NULL AND resolved_at <= due_at)::int AS within,
  COUNT(*) FILTER (WHERE resolved_at IS NOT NULL)::int AS total
FROM service_requests
WHERE resolved_at >= $1 AND resolved_at < $2;
```

- Cumplimiento = `within / total * 100` (0 si `total = 0`).
- Tiempo promedio de resolución = promedio de `(resolved_at - created_at) - sla_paused_minutes` en horas.
- Vencidas = abiertas con `due_at < now()`.
- Evolución = `generate_series` por día/semana con conteos de creadas y resueltas.

### 10.2. Reglas

- Filtros de fecha obligatorios y máximo 366 días.
- Roles: ADMIN/COORDINADOR global; TECNICO/CLIENTE solo `/mi-resumen`.
- Respuestas siempre con arreglos y ceros, nunca `null`.
- Índices de `created_at`, `resolved_at`, `status_id`, `assigned_technician_id`.

## 11. Frontend

### 11.1. Sesión

- `AuthProvider` mantiene `accessToken` en memoria y `user`.
- Al montar, intenta `POST /auth/refresh`; si falla, redirige a login.
- Interceptor de `fetch`: agrega Bearer y, ante `401`, intenta refresh una sola vez y reintenta la petición.
- Logout: `POST /auth/logout`, limpiar estado y caché de queries.

### 11.2. Rutas protegidas

```tsx
function RequireAuth({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <ForbiddenPage />;
  return <>{children}</>;
}
```

- Layout y menú calculados por rol.
- `lazy` por módulo para reducir el bundle inicial.

### 11.3. Datos asíncronos

- TanStack Query con `queryKey` por recurso y filtros.
- Invalidar listas y detalle tras mutaciones.
- Manejo explícito de `isLoading`, `isError`, `isEmpty`.
- Errores de API mapeados por `error.code` a mensajes en español; el `requestId` se muestra en errores 500.

### 11.4. Formularios

- React Hook Form + `zodResolver` con esquemas de `packages/shared`.
- Mostrar errores por campo y resumen accesible (`aria-live`).
- Deshabilitar el botón mientras `isSubmitting`.
- Confirmaciones para acciones irreversibles (cancelar, reabrir, cerrar).
- Acciones de estado disponibles solo si la tabla de transiciones y el rol las permiten; el backend revalida.

### 11.5. SSE en React

- Hook `useNotifications` abre el stream al autenticarse.
- En cada evento: invalidar `["notifications"]` y `["requests"]`; mostrar toast y actualizar badge.
- Reconexión con backoff; al reconectar, consultar no leídas.
- `aria-live="polite"` para anunciar notificaciones.

## 12. Paquete compartido

```ts
export const PRIORITIES = ["CRITICA", "ALTA", "MEDIA", "BAJA"] as const;
export const STATUSES = [
  "REGISTRADA", "APROBADA", "ASIGNADA", "EN_PROCESO",
  "PENDIENTE_INFO", "RESUELTA", "CERRADA", "CANCELADA",
] as const;

export const createRequestSchema = z.object({
  siteId: z.string().uuid(),
  assetId: z.string().uuid().nullable().optional(),
  categoryId: z.number().int().positive(),
  priority: z.enum(PRIORITIES),
  description: z.string().min(20).max(2000),
});
```

- Los enums y esquemas se importan en ambos lados.
- La tabla de transiciones se comparte solo para UI; el backend tiene la fuente de verdad.

## 13. Errores y logging

- `DomainError(code, status, message?, details?)`.
- El handler central traduce `ZodError`, `DomainError`, `PrismaClientKnownRequestError` (`P2002` → duplicado, `P2003` → entidad en uso) y errores desconocidos.
- `pino` con `requestId`, método, ruta, status y duración; excluir `authorization`, `password`, `token`.
- No devolver stack traces ni mensajes de Prisma al cliente.

## 14. Checklist de implementación por módulo

| Módulo | Verificación mínima |
| :--- | :--- |
| Auth | Login/logout/refresh, bloqueo, recuperación, cookies seguras |
| Usuarios | CRUD, roles, desactivación, no autodestrucción del último admin |
| Clientes | RUC único, sedes, baja lógica, entidad en uso |
| Técnicos | Especialidades, disponibilidad, carga, usuario vinculado |
| Catálogos | CRUD, parámetros auditados, feriados |
| Solicitudes | Código único, dueAt, filtros por rol, versión |
| Estados | Matriz completa, timestamps, historial transaccional |
| Asignación | Especialidad, disponibilidad, carga, reasignación con motivo |
| SLA | Calendario, feriados, pausas, cambio de prioridad |
| Realtime | SSE autenticado, heartbeat, reconexión, persistencia |
| Dashboard | SQL real, filtros, roles, series vacías |
| Adjuntos | Tamaño, MIME, almacenamiento, descarga autorizada |
| Frontend | Rutas, formularios, estados UI, accesibilidad |
