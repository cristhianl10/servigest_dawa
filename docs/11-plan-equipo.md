# 11 — Plan de equipo, ownership y contratos

**Objetivo:** repartir el trabajo según las fortalezas de cada integrante, sin que la base de datos, el backend y el frontend terminen usando nombres, campos o reglas distintas. Cada artefacto tiene **un dueño**, cada contrato tiene **una fuente de verdad** y cada cambio sigue un **checklist obligatorio**.

> Este documento es el **plan general**. Cada integrante tiene un documento específico enlazado en la sección 6, con sus tareas, entidades, endpoints, pruebas y criterios de aceptación.

## 1. Principio central

> Si una tabla se llama `service_requests`, el modelo Prisma es `ServiceRequest`, la ruta API es `/solicitudes`, el tipo TypeScript es `ServiceRequest` y los campos JSON son los del diccionario de este documento. **Nadie improvisa un sinónimo.**

Flujo obligatorio de cada cambio:

```
Dueño del dato → schema.prisma → migración → packages/shared → OpenAPI → backend → frontend → pruebas
```

Ningún eslabón se salta. Si cambia un eslabón, se actualizan todos en el mismo PR.

## 2. Equipo, fortalezas y roles

| Integrante | Código | Fortaleza | Rol principal | Foco | Rama personal | Documento específico |
| :--- | :-: | :--- | :--- | :--- | :--- | :--- |
| **Jared Ochoa** | JAR | Base de datos | Dueño de datos / Backend core / Seguridad | Modelo, migraciones, auth, usuarios, clientes, técnicos, catálogos, adjuntos, OpenAPI base | `dev/jared` | [01-jared-ochoa.md](equipo/01-jared-ochoa.md) |
| **Jeremy Marquez** | JER | Lógica y reglas | Backend de dominio | Solicitudes, máquina de estados, SLA, asignaciones, auditoría, dashboard SQL | `dev/jeremy` | [02-jeremy-marquez.md](equipo/02-jeremy-marquez.md) |
| **Cristhian Loor** | CRI | Integración y pruebas | Full stack / QA / DevOps | SSE backend, E2E, CI/CD, despliegue, informe de pruebas, video | `dev/cristhian` | [03-cristhian-loor.md](equipo/03-cristhian-loor.md) |
| **Neil Goyes** | NEI | Frontend | Frontend | Shell, rutas, formularios, solicitudes, UI de técnico, dashboard UI, accesibilidad, manual de usuario | `dev/neil` | [04-neil-goyes.md](equipo/04-neil-goyes.md) |

**Regla de revisión:** nadie aprueba su propio PR. Los cambios de esquema o contrato requieren **dos revisores**: el dueño del artefacto y un consumidor.

## 3. Fuentes de verdad y dueños

| Artefacto | Fuente de verdad | Dueño (A/R) | Revisores obligatorios | Consumidores |
| :--- | :--- | :--- | :--- | :--- |
| Modelo entidad-relación | `docs/02-modelo-dominio.md` + `schema.prisma` | Jared | Jeremy | Neil, Cristhian |
| Esquema Prisma | `apps/api/prisma/schema.prisma` | Jared | Jeremy | Neil, Cristhian |
| Migraciones | `apps/api/prisma/migrations/` | Jared | Jeremy | Todos |
| Seed base | `apps/api/prisma/seed/base.ts` | Jared | Jeremy | Todos |
| Seed transaccional | `apps/api/prisma/seed/requests.ts` | Jeremy | Jared | Neil, Cristhian |
| Contratos compartidos | `packages/shared/src/` | Neil (estructura) | Jared (nombres DB), Jeremy (enums de dominio) | Cristhian |
| OpenAPI | `apps/api/src/docs/openapi.ts` | Jared (base) | Dueño del endpoint + Neil | Todos |
| Reglas de negocio | `apps/api/src/domain/` + `docs/01-especificacion.md` | Jeremy | Jared | Neil, Cristhian |
| Autenticación / seguridad | `apps/api/src/modules/auth/` | Jared | Jeremy | Todos |
| Endpoints de dominio | `apps/api/src/modules/requests/` | Jeremy | Jared | Neil, Cristhian |
| SSE / notificaciones | `apps/api/src/modules/notifications/` | Cristhian | Jeremy | Neil |
| Frontend shell / solicitudes | `apps/web/src/features/` | Neil | Cristhian | Jared, Jeremy |
| UI de técnico / dashboard | `apps/web/src/features/` | Neil | Cristhian | Jared, Jeremy |
| Pruebas unitarias de reglas | `apps/api/tests/unit/` | Jeremy | Cristhian | — |
| Pruebas de integración | `apps/api/tests/integration/` | Dueño del módulo | Jared (auth/master data) o Jeremy (dominio) | Cristhian |
| E2E | `apps/web/e2e/` | Cristhian | Neil | — |
| CI/CD y despliegue | `.github/workflows/` + `docker-compose.yml` | Cristhian | Jared | Todos |
| Manual técnico | `docs/08-despliegue.md` + `docs/07-implementacion.md` | Jared / Cristhian | Jeremy | Neil |
| Manual de usuario | `docs/09-manual-usuario.md` | Neil | Jared | — |
| Trazabilidad | `docs/10-trazabilidad.md` | Jared | Jeremy | Todos |

### 3.1. Reglas de edición

1. **Solo Jared** ejecuta `prisma migrate dev` y mergea migraciones a `develop`. Jeremy puede proponer cambios al `schema.prisma` en su rama, pero la migración la genera y revisa Jared.
2. **Solo Neil** modifica la estructura de `packages/shared`; cada dueño de dominio agrega sus esquemas en su archivo (`requests.ts`, `notifications.ts`, etc.). Jared revisa nombres de BD y Jeremy revisa enums de dominio.
3. **Solo Jared** publica el OpenAPI consolidado. Cada dueño documenta sus rutas; el CI falla si una ruta no tiene descripción.
4. **Nadie** define tipos manuales en el frontend para datos que vienen de la API; se importan de `packages/shared`.
5. **Nadie** escribe SQL fuera de `dashboard`; el SQL del dashboard lo escribe Jeremy y lo revisa Jared.
6. **Nadie** hace push directo a `develop` ni a `main`; todo va por PR.
7. **Nadie** cambia un nombre canónico sin actualizar el diccionario y avisar en la reunión de contratos.

## 4. Diccionario canónico

### 4.1. Entidades y nombres

| Tabla PostgreSQL | Modelo Prisma | Recurso API | Tipo TypeScript | Dueño de datos | Consumidores |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `users` | `User` | `/usuarios` | `User` | Jared | Todos |
| `roles` | `Role` | `/roles` | `Role` | Jared | Todos |
| `clients` | `Client` | `/clientes` | `Client` | Jared | Jeremy, Neil |
| `client_sites` | `ClientSite` | `/sedes` | `ClientSite` | Jared | Jeremy, Neil |
| `assets` | `Asset` | `/equipos` | `Asset` | Jared | Jeremy, Neil |
| `technicians` | `Technician` | `/tecnicos` | `Technician` | Jared | Jeremy, Neil |
| `specialties` | `Specialty` | `/especialidades` | `Specialty` | Jared | Jeremy, Neil |
| `technician_specialties` | `TechnicianSpecialty` | anidado en `/tecnicos/:id` | `TechnicianSpecialty` | Jared | Jeremy |
| `service_categories` | `ServiceCategory` | `/categorias-servicio` | `ServiceCategory` | Jared | Jeremy, Neil |
| `system_parameters` | `SystemParameter` | `/parametros` | `SystemParameter` | Jared | Jeremy |
| `holidays` | `Holiday` | `/feriados` | `Holiday` | Jared | Jeremy |
| `service_requests` | `ServiceRequest` | `/solicitudes` | `ServiceRequest` | Jeremy | Neil, Cristhian |
| `request_statuses` | `RequestStatus` | `/estados` | `RequestStatus` | Jeremy | Todos |
| `request_assignments` | `RequestAssignment` | `/solicitudes/:id/asignaciones` | `RequestAssignment` | Jeremy | Neil, Cristhian |
| `request_history` | `RequestHistory` | `/solicitudes/:id/historial` | `HistoryEvent` | Jeremy | Neil, Cristhian |
| `request_attachments` | `RequestAttachment` | `/solicitudes/:id/adjuntos` | `RequestAttachment` | Jeremy (datos) / Jared (storage) | Neil |
| `notifications` | `Notification` | `/notificaciones` | `Notification` | Jeremy (datos) / Cristhian (entrega SSE) | Neil |
| `refresh_tokens` | `RefreshToken` | interno | — | Jared | — |
| `password_reset_tokens` | `PasswordResetToken` | interno | — | Jared | — |
| `request_code_sequences` | `RequestCodeSequence` | interno | — | Jeremy | — |

> **Prohibido:** `solicitud`, `request`, `service_request`, `ServiceRequests` como nombres alternativos para el mismo concepto. El nombre canónico depende de la capa, según la tabla anterior.

### 4.2. Campos canónicos de `service_requests`

| Columna PostgreSQL | Campo Prisma | Campo JSON / TypeScript | Tipo | Regla |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `id` | `id` | `string` | UUID v4 |
| `code` | `code` | `code` | `string` | `SOL-YYYYMM-#####`, inmutable |
| `client_id` | `clientId` | `clientId` | `string` | Derivado del token si es CLIENTE |
| `site_id` | `siteId` | `siteId` | `string` | Debe pertenecer al cliente |
| `asset_id` | `assetId` | `assetId` | `string \| null` | Debe pertenecer a la sede |
| `category_id` | `categoryId` | `categoryId` | `number` | Categoría activa |
| `priority` | `priority` | `priority` | `Priority` | Enum canónico |
| `status_id` | `statusId` | — | `number` | No se expone el id |
| `description` | `description` | `description` | `string` | 20–2000 caracteres |
| `resolution` | `resolution` | `resolution` | `string \| null` | ≥ 30 al resolver/cerrar |
| `cancellation_reason` | `cancellationReason` | `cancellationReason` | `string \| null` | ≥ 10 al cancelar |
| `created_by` | `createdBy` | `createdBy` | `string` | Usuario que registra |
| `assigned_technician_id` | `assignedTechnicianId` | `assignedTechnicianId` | `string \| null` | Asignación vigente |
| `due_at` | `dueAt` | `dueAt` | `string` | ISO 8601; calculado en backend |
| `sla_paused_minutes` | `slaPausedMinutes` | `slaPausedMinutes` | `number` | Acumulado |
| `paused_at` | `pausedAt` | `pausedAt` | `string \| null` | ISO 8601 |
| `approved_at` | `approvedAt` | `approvedAt` | `string \| null` | ISO 8601 |
| `assigned_at` | `assignedAt` | `assignedAt` | `string \| null` | ISO 8601 |
| `started_at` | `startedAt` | `startedAt` | `string \| null` | ISO 8601 |
| `resolved_at` | `resolvedAt` | `resolvedAt` | `string \| null` | ISO 8601 |
| `closed_at` | `closedAt` | `closedAt` | `string \| null` | ISO 8601 |
| `version` | `version` | `version` | `number` | Bloqueo optimista |
| `created_at` | `createdAt` | `createdAt` | `string` | ISO 8601 |
| `updated_at` | `updatedAt` | `updatedAt` | `string` | ISO 8601 |

La API expone `status` como **string** (`REGISTRADA`, `APROBADA`, etc.), no `statusId`. El frontend nunca compara contra ids numéricos.

### 4.3. Valores canónicos

**Roles:**

```
ADMIN | COORDINADOR | TECNICO | CLIENTE
```

**Estados:**

```
REGISTRADA | APROBADA | ASIGNADA | EN_PROCESO | PENDIENTE_INFO | RESUELTA | CERRADA | CANCELADA
```

**Prioridades:**

```
CRITICA | ALTA | MEDIA | BAJA
```

**Acciones de transición:**

```
aprobar | cancelar | iniciar | solicitar_info | reanudar | resolver | cerrar | reabrir_trabajo | reapertura
```

**Tipos de notificación:**

```
SOLICITUD_REGISTRADA | ASIGNACION | CAMBIO_ESTADO | INFO_REQUERIDA | CIERRE | REAPERTURA
```

**Acciones de historial:**

```
CREACION | TRANSICION | ASIGNACION | REASIGNACION | REAPERTURA | EDICION | ADJUNTO
```

> Estos valores viven en `packages/shared/src/enums.ts`. Está prohibido escribirlos como texto suelto en cualquier capa.

### 4.4. Convenciones de nombres y formatos

| Elemento | Convención | Ejemplo |
| :--- | :--- | :--- |
| Tabla y columna DB | `snake_case`, tablas en plural | `service_requests`, `due_at` |
| Modelo Prisma | `PascalCase`, singular | `ServiceRequest` |
| Campo Prisma / JSON / TS | `camelCase` | `dueAt` |
| Ruta API | español, plural, `kebab-case` | `/solicitudes`, `/categorias-servicio` |
| Tipo TS | `PascalCase` | `ServiceRequest`, `HistoryEvent` |
| Valores de enum | `UPPER_SNAKE_CASE` | `PENDIENTE_INFO` |
| Acciones | `snake_case` en minúscula | `solicitar_info` |
| Fechas | ISO 8601 con offset | `2026-11-15T14:30:00-05:00` |
| Identificadores | UUID v4 | `f1e2d3c4-...` |
| Paginación | `page`, `pageSize` | `?page=1&pageSize=20` |
| Envelope de listado | `{ data, meta }` | `meta.total`, `meta.totalPages` |
| Envelope de error | `{ error: { code, message, details, requestId } }` | — |

### 4.5. Códigos de error canónicos

```
VALIDACION_FALLIDA, CREDENCIALES_INVALIDAS, USUARIO_INACTIVO, DEMASIADOS_INTENTOS,
TOKEN_INVALIDO, REFRESH_INVALIDO, SIN_PERMISO, SIN_ASIGNACION, RECURSO_NO_ENCONTRADO,
CLIENTE_DUPLICADO, EMAIL_DUPLICADO, ENTIDAD_EN_USO, TRANSICION_INVALIDA, SOLICITUD_CERRADA,
CONFLICTO_VERSION, ASIGNACION_VIGENTE, ESPECIALIDAD_INCOMPATIBLE, TECNICO_NO_DISPONIBLE,
CARGA_EXCEDIDA, TECNICO_SIN_ESPECIALIDAD, RESOLUCION_REQUERIDA, MOTIVO_REQUERIDO,
ADJUNTO_INVALIDO, RANGO_INVALIDO, ERROR_INTERNO
```

Catálogo completo con HTTP y significado en [`04-contratos-api.md § 5`](04-contratos-api.md).

## 5. Ownership por módulo

| Módulo (PDF) | Dueño | Colaboradores | Requisitos | Entidades | Endpoints | Pantallas | Pruebas |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 5.1 Seguridad y usuarios | Jared | Jeremy (revisión) | RF-AUTH-01…06, RF-USR-01/02 | `users`, `roles`, `refresh_tokens`, `password_reset_tokens` | `/auth/*`, `/usuarios/*`, `/roles` | Login, recuperación, usuarios | TC-AUTH, TC-USR, TC-SEC |
| 5.2 Clientes, técnicos y catálogos | Jared | Jeremy (consumo), Neil (UI) | RF-CLI-01…03, RF-TEC-01/02, RF-CAT-01…04 | `clients`, `client_sites`, `assets`, `technicians`, `specialties`, `technician_specialties`, `service_categories`, `system_parameters`, `holidays` | `/clientes`, `/sedes`, `/equipos`, `/tecnicos`, `/especialidades`, `/categorias-servicio`, `/parametros`, `/feriados` | CRUD clientes, técnicos y catálogos | TC-CLI, TC-TEC, TC-CAT, TC-DB |
| 5.3 Gestión de solicitudes | Jeremy | Jared (DB), Neil (UI) | RF-SOL-01…08 | `service_requests`, `request_statuses`, `request_attachments` | `/solicitudes`, `/solicitudes/:id`, `/solicitudes/:id/adjuntos` | Registro, listado, detalle | TC-SOL, TC-RN, TC-ATT |
| 5.4 Asignación y seguimiento | Jeremy | Jared (DB), Neil (UI) | RF-ASI-01…03, RN-01…08 | `request_assignments`, `request_history` | `/solicitudes/:id/asignaciones`, `/solicitudes/:id/historial` | Asignación, reasignación, timeline | TC-ASI, TC-AUD, TC-RN |
| 5.5 Notificaciones e interacción dinámica | Cristhian | Jeremy (eventos), Neil (UI) | RF-NOT-01…03 | `notifications` | `/notificaciones/*`, `/notificaciones/stream` | Campana, toasts, badge | TC-NOT, TC-SSE |
| 5.6 Dashboard y reportes | Jeremy (SQL/API) + Neil (UI) | Jared (índices), Cristhian (pruebas) | RF-DASH-01…03 | `service_requests`, `request_assignments`, `request_history` | `/dashboard/*` | Dashboard y “Mi resumen” | TC-DASH, TC-PERF |
| Transversal: arquitectura y DB | Jared | Todos | NFR-PORT-01, NFR-REL-01 | Todas | `/health`, `/docs` | — | TC-DB, TC-CI |
| Transversal: frontend | Neil | Todos | NFR-USA-01/02 | — | — | Todas | TC-FE, TC-UI |
| Transversal: pruebas, CI/CD y despliegue | Cristhian | Todos | NFR-* | — | — | — | TC-E2E, TC-CI, TC-DEP |

## 6. Resumen de carga por integrante

| Integrante | Módulos | Tareas | Pruebas | Documentación específica |
| :--- | :--- | :--- | :--- | :--- |
| **Jared Ochoa** | 5.1, 5.2, DB, seguridad | T-001…T-004, T-007, T-008, T-010…T-020, T-049, T-050, T-052, T-053, T-058 | TC-DB, TC-AUTH, TC-USR, TC-CLI, TC-TEC, TC-CAT, TC-SEC, TC-ATT | [01-jared-ochoa.md](equipo/01-jared-ochoa.md) |
| **Jeremy Marquez** | 5.3, 5.4, 5.6 SQL | T-005, T-021…T-024, T-036…T-041, T-045…T-047, T-051, T-052 | TC-RN, TC-SOL, TC-ASI, TC-AUD, TC-DASH | [02-jeremy-marquez.md](equipo/02-jeremy-marquez.md) |
| **Cristhian Loor** | 5.5, QA, CI/CD, despliegue | T-009, T-025, T-042, T-043, T-051, T-054, T-056, T-057, T-058, T-059, T-060 | TC-RN (aceptación), TC-SLA, TC-NOT, TC-SSE, TC-E2E, TC-CI, TC-DEP, TC-PERF | [03-cristhian-loor.md](equipo/03-cristhian-loor.md) |
| **Neil Goyes** | Frontend completo, 5.6 UI | T-006, T-026…T-035, T-044, T-048, T-054, T-055, T-058 | TC-FE, TC-UI, TC-CON, TC-E2E | [04-neil-goyes.md](equipo/04-neil-goyes.md) |

## 7. Matriz RACI

**R** = responsable de ejecutar · **A** = accountable (dueño final) · **C** = consultado · **I** = informado.

| Artefacto | Jared | Jeremy | Cristhian | Neil |
| :--- | :-: | :-: | :-: | :-: |
| Modelo ER y `schema.prisma` | A/R | C | I | I |
| Migraciones y seed base | A/R | C | I | I |
| Contratos `packages/shared` | C | C | I | A/R |
| OpenAPI | A/R | C | C | C |
| Auth y seguridad | A/R | C | I | I |
| Clientes/técnicos/catálogos (API) | A/R | C | I | I |
| Solicitudes/estados/SLA (API) | C | A/R | C | I |
| Asignaciones/auditoría (API) | C | A/R | C | I |
| Notificaciones/SSE (API) | I | C | A/R | C |
| Dashboard SQL/API | C | A/R | C | C |
| Frontend shell/solicitudes | I | C | C | A/R |
| Frontend técnico/dashboard | I | C | C | A/R |
| Pruebas unitarias de reglas | I | A/R | R | I |
| Pruebas de integración auth/master data | A/R | C | C | I |
| Pruebas de integración dominio | C | A/R | C | I |
| E2E | I | C | A/R | R |
| CI/CD y despliegue | C | I | A/R | I |
| Manual técnico | A/R | C | R | I |
| Manual de usuario | C | I | I | A/R |
| Informe de pruebas | C | C | A/R | C |
| Video y defensa | R | R | A/R | R |

## 8. Puntos de integración y handoffs

### 8.1. Base de datos → backend

- Jared mantiene `schema.prisma` y genera migraciones.
- Jeremy propone cambios de entidades transaccionales en su rama; **no** ejecuta migraciones contra `develop`.
- Antes de mergear: `prisma validate`, `prisma format`, migración reproducible y actualización de [`02-modelo-dominio.md`](02-modelo-dominio.md).
- Prohibido `db push` en `develop` o `main`.

### 8.2. Backend → frontend

- El contrato es `packages/shared` + OpenAPI, no “lo que devuelve el endpoint en mi máquina”.
- Neil importa tipos y esquemas; no crea interfaces paralelas ni datos mock.
- Si un endpoint cambia, el PR debe actualizar shared, OpenAPI, frontend y pruebas.
- El frontend no accede a la BD.

### 8.3. Notificaciones / SSE

- El esquema `NotificationEvent` vive en `packages/shared/src/notifications.ts`.
- Jeremy emite eventos desde las transiciones; Cristhian los entrega por SSE; Neil los consume en la UI.
- El evento debe incluir `id`, `type`, `title`, `body`, `requestId`, `createdAt`.
- Si se agrega un tipo de notificación, se actualiza el enum compartido y las pruebas de ambos lados.

### 8.4. Dashboard

- Jeremy define el esquema `DashboardIndicators` y la semántica de cada métrica.
- Neil construye la UI con ese esquema; no calcula métricas en el cliente.
- Cristhian prueba los agregados y el rendimiento.
- Ambos prueban con el mismo seed; los rangos sin datos devuelven arreglos vacíos y ceros.

### 8.5. Adjuntos

- Jared define el contrato de subida/descarga y el almacenamiento.
- Jeremy vincula el adjunto a la solicitud y su historial.
- Neil construye la UI; nunca usa una URL física directa.

## 9. Calendario, congelamientos y reuniones

| Momento | Qué se congela | Responsable |
| :--- | :--- | :--- |
| Día 3 de la semana 1 | Modelo de datos v1 y nombres canónicos | Jared |
| Día 5 de la semana 1 | Contratos `shared` v1 y OpenAPI base | Neil + Jared |
| Día 5 de la semana 2 | API de auth y catálogos estable | Jared |
| Día 5 de la semana 3 | Flujo de solicitudes integrado | Jeremy + Neil |
| Día 5 de la semana 4 | Reglas, SSE y dashboard completos; **feature freeze** | Jeremy + Cristhian + Neil |
| Día 2 de la semana 5 | Solo correcciones; no nuevas funcionalidades | Todos |
| Día 4 de la semana 5 | QA, despliegue y evidencias cerradas | Cristhian |
| Día 5 de la semana 5 | Ensayo de defensa y entrega | Todos |

**Reuniones:**

- **Lunes 30 min:** planificación semanal y revisión de tablero.
- **Miércoles 15 min:** sincronización de contratos y bloqueos.
- **Viernes 30 min:** demo de lo integrado y merge a `develop`.
- **Canal único:** decisiones y cambios de contrato se escriben en el canal del equipo, no solo en chats privados.

## 10. Git y revisión

### 10.1. Ramas

```
main          ← entrega final / demo estable
develop       ← integración continua
dev/jared
dev/cristhian
dev/jeremy
dev/neil
feat/T-###-<descripcion>  ← opcional para tareas grandes
```

- `main` y `develop` protegidas: sin push directo.
- Cada integrante trabaja en su rama y abre PR a `develop`.
- Al cierre de hitos, `develop` se mergea a `main` con PR revisado.

### 10.2. Commits

Formato:

```
tipo(alcance): descripción [T-###]
```

Ejemplos:

```
feat(db): agregar índice de vencimiento [T-003]
feat(solicitudes): implementar transición a resuelta [T-037]
test(rn-04): cubrir reapertura sin motivo [T-051]
feat(web): construir timeline de historial [T-032]
ci: ejecutar E2E en pull request [T-056]
```

### 10.3. Pull requests

- Título con `T-###` y requisito (`RF-*`/`RN-*`).
- Descripción: qué cambia, cómo se probó y qué contrato se actualizó.
- Revisor: uno distinto del autor.
- Cambios de esquema/contrato: dos revisores (Jared + consumidor).
- CI en verde obligatorio.
- Sin `console.log`, sin secretos, sin TODOs sin tarea.

## 11. Pruebas y evidencias por dueño

| Dueño | Qué prueba | Evidencia |
| :--- | :--- | :--- |
| **Jared** | Migraciones, seed, integridad, unicidad, auth, refresh, recuperación, usuarios, clientes, técnicos, catálogos, adjuntos, autorización/IDOR, rate limit, CORS, OpenAPI. | Reporte de integración + matriz de autorización + logs de migración. |
| **Jeremy** | RN-01…RN-08, SLA (7 casos), solicitudes, asignaciones, reapertura, historial, dashboard SQL, concurrencia, rendimiento de listados. | Reporte unitario + integración + cobertura + `EXPLAIN` de consultas. |
| **Cristhian** | Notificaciones, SSE, E2E-01/E2E-02, CI, despliegue, healthcheck, backup/restore, rendimiento de dashboard, seguridad de cabeceras. | Pipeline en verde + URL desplegada + informe de pruebas + video. |
| **Neil** | Componentes, formularios, rutas protegidas, estados de carga/error/vacío, responsive, accesibilidad, SSE en UI, dashboard UI. | Pruebas de componentes + capturas + Lighthouse + checklist. |

> El detalle de cada caso (`TC-*`), sus pasos y su criterio de aceptación está en los documentos específicos de cada integrante y en [`05-pruebas.md`](05-pruebas.md). No se acepta una regla sin prueba.

## 12. Defensa individual (3 puntos)

Cada integrante debe poder:

1. Explicar su módulo y **un módulo adyacente**.
2. Mostrar el flujo completo en vivo: registro → asignación → atención → cierre.
3. Diagnosticar un error simulado en su área.
4. Hacer una modificación pequeña solicitada por el docente.
5. Justificar una decisión de diseño con su documento o ADR.

**Parejas de defensa cruzada:**

| Pareja | Debe dominar |
| :--- | :--- |
| Jared ↔ Jeremy | Modelo de datos, auth, solicitudes, estados, SLA, auditoría. |
| Neil ↔ Cristhian | Frontend, SSE, dashboard, pruebas E2E, despliegue. |

Cada uno ensaya al menos una vez el flujo completo del otro antes de la entrega.

## 13. Reglas para evitar incongruencias

1. **Un nombre canónico por concepto.** Si existe en el diccionario, se usa ese; no se crea otro.
2. **Un dueño por artefacto.** El dueño revisa todo cambio; el consumidor valida que el contrato le sirva.
3. **Contrato antes que código.** No se implementa un endpoint sin esquema compartido y documentación.
4. **Cambio de contrato = checklist completo.** Schema + migración + shared + OpenAPI + frontend + pruebas + docs en el mismo PR.
5. **Sin enums duplicados.** Se importan de `shared`; si falta uno, se agrega una sola vez.
6. **Sin SQL fuera del dashboard.** Y el del dashboard lo revisa Jared.
7. **Sin datos mock en la demo final.** Todo pasa por API y persistencia real.
8. **Sin migraciones paralelas.** Solo Jared genera/mergea migraciones.
9. **Sin push directo a `develop`/`main`.** Todo por PR con CI.
10. **Sin cambios silenciosos.** Todo cambio de contrato se anuncia en la reunión del miércoles y se registra en el PR.
11. **Sin “lo arreglo en el frontend”.** Las reglas de negocio viven en el backend.
12. **Sin fechas locales ambiguas.** ISO 8601 con offset; el backend calcula el SLA.

## 14. Checklist de arranque para cada integrante

- [ ] Clonar el repo y leer [`00-constitucion.md`](00-constitucion.md), [`01-especificacion.md`](01-especificacion.md) y [`03-arquitectura.md`](03-arquitectura.md).
- [ ] Leer su documento específico en [`equipo/`](equipo/README.md).
- [ ] Crear su rama `dev/<nombre>` desde `develop`.
- [ ] Verificar `pnpm install`, `docker compose up -d db`, migraciones y seed.
- [ ] Revisar el diccionario canónico y los contratos de su módulo.
- [ ] Identificar sus tareas `T-*` y sus requisitos `RF-*`/`RN-*`.
- [ ] Acordar con el dueño del artefacto los puntos de integración.
- [ ] Registrar en su bitácora semanal tareas, commits y PRs revisados.
- [ ] Preparar su explicación de defensa desde la semana 1, no al final.

## 15. Enlaces de referencia

- [Constitución y stack](00-constitucion.md)
- [Especificación funcional, RF/RN/NFR](01-especificacion.md)
- [Modelo de dominio y estados](02-modelo-dominio.md)
- [Arquitectura y ADR](03-arquitectura.md)
- [Contratos API](04-contratos-api.md)
- [Plan de pruebas](05-pruebas.md)
- [Backlog de tareas](06-tareas.md)
- [Guías de implementación](07-implementacion.md)
- [Despliegue y operación](08-despliegue.md)
- [Manual de usuario](09-manual-usuario.md)
- [Matriz de trazabilidad](10-trazabilidad.md)
- [Índice de documentos por integrante](equipo/README.md)
