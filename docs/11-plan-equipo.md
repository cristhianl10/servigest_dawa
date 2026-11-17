# 11 — Plan de equipo, ownership y contratos

**Objetivo:** repartir el trabajo sin que la base de datos, el backend y el frontend terminen usando nombres, campos o reglas distintas. Cada artefacto tiene **un dueño**, cada contrato tiene **una fuente de verdad** y cada cambio sigue un **checklist obligatorio**.

## 1. Principio central

> Si una tabla se llama `service_requests`, el modelo Prisma es `ServiceRequest`, la ruta API es `/solicitudes`, el tipo TypeScript es `ServiceRequest` y los campos JSON son los del diccionario de este documento. **Nadie improvisa un sinónimo.**

El flujo de trabajo es:

```
Dueño del dato → schema.prisma → migración → packages/shared → OpenAPI → backend → frontend → pruebas
```

Ningún eslabón se salta. Si cambia un eslabón, se actualizan todos en el mismo PR.

## 2. Equipo y roles

| Integrante | Código | Rol principal | Foco | Rama personal |
| :--- | :-: | :--- | :--- | :--- |
| **Cristhian Loor** | E1 | Arquitecto / Backend / BD / Seguridad | Modelo de datos, migraciones, auth, usuarios, catálogos, integración y revisión de contratos | `dev/cristhian` |
| **Jeremy Marquez** | E2 | Backend de dominio | Solicitudes, máquina de estados, SLA, asignaciones, auditoría, dashboard SQL | `dev/jeremy` |
| **Jared Ochoa** | E3 | Frontend | Shell, rutas protegidas, formularios, solicitudes, asignación, estados UI, accesibilidad | `dev/jared` |
| **Neil Goyes** | E4 | Full stack / QA / DevOps | Técnico UI, notificaciones SSE, dashboard UI, pruebas E2E, CI/CD, despliegue | `dev/neil` |

**Regla de revisión:** nadie aprueba su propio PR. Los cambios de esquema o contrato requieren **dos revisores**: el dueño del artefacto y un consumidor.

## 3. Fuentes de verdad y dueños

| Artefacto | Fuente de verdad | Dueño (A/R) | Revisor obligatorio | Consumidores |
| :--- | :--- | :--- | :--- | :--- |
| Modelo entidad-relación | `docs/02-modelo-dominio.md` + `schema.prisma` | Cristhian | Jeremy | Todos |
| Esquema Prisma | `apps/api/prisma/schema.prisma` | Cristhian | Jeremy | Jared, Neil |
| Migraciones | `apps/api/prisma/migrations/` | Cristhian | Jeremy | Todos |
| Seed base | `apps/api/prisma/seed/base.ts` | Cristhian | Jeremy | Todos |
| Seed transaccional | `apps/api/prisma/seed/requests.ts` | Jeremy | Cristhian | Jared, Neil |
| Contratos compartidos | `packages/shared/src/` | Jared (estructura) | Cristhian | Jeremy, Neil |
| OpenAPI | `apps/api/src/docs/openapi.ts` | Cristhian (base) | Dueño del endpoint | Jared, Neil |
| Reglas de negocio | `apps/api/src/domain/` + `docs/01-especificacion.md` | Jeremy | Cristhian | Jared, Neil |
| Autenticación / seguridad | `apps/api/src/modules/auth/` | Cristhian | Jeremy | Todos |
| Endpoints de dominio | `apps/api/src/modules/requests/` | Jeremy | Cristhian | Jared, Neil |
| SSE / notificaciones | `apps/api/src/modules/notifications/` | Neil | Jeremy | Jared |
| Frontend shell / solicitudes | `apps/web/src/features/` | Jared | Neil | Cristhian, Jeremy |
| Dashboard UI | `apps/web/src/features/dashboard/` | Neil | Jared | Cristhian, Jeremy |
| Pruebas unitarias de reglas | `apps/api/tests/unit/` | Jeremy | Neil | — |
| Pruebas de integración | `apps/api/tests/integration/` | Dueño del módulo | Cristhian | Neil |
| E2E | `apps/web/e2e/` | Neil | Jared | — |
| CI/CD y despliegue | `.github/workflows/` + `docker-compose.yml` | Neil | Cristhian | Todos |
| Manual técnico | `docs/08-despliegue.md` + `docs/07-implementacion.md` | Cristhian / Neil | Jared | — |
| Manual de usuario | `docs/09-manual-usuario.md` | Jared | Cristhian | — |
| Trazabilidad | `docs/10-trazabilidad.md` | Cristhian | Jeremy | Todos |

### 3.1. Reglas de edición

1. **Solo Cristhian** ejecuta `prisma migrate dev` y mergea migraciones a `develop`. Jeremy puede proponer cambios al `schema.prisma` en su rama, pero la migración la genera y revisa Cristhian.
2. **Solo Jared** modifica la estructura de `packages/shared`; cada dueño de dominio agrega sus esquemas en su archivo (`requests.ts`, `notifications.ts`, etc.). Cristhian revisa que no se dupliquen enums.
3. **Solo Cristhian** publica el OpenAPI consolidado. Cada dueño documenta sus rutas; el CI falla si una ruta no tiene descripción.
4. **Nadie** define tipos manuales en el frontend para datos que vienen de la API; se importan de `packages/shared`.
5. **Nadie** escribe SQL fuera de `dashboard`; el SQL del dashboard lo escribe Jeremy y lo revisa Cristhian.
6. **Nadie** hace push directo a `develop` ni a `main`; todo va por PR.

## 4. Diccionario canónico

### 4.1. Entidades y nombres

| Tabla PostgreSQL | Modelo Prisma | Recurso API | Tipo TypeScript | Dueño de datos | Consumidores |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `users` | `User` | `/usuarios` | `User` | Cristhian | Todos |
| `roles` | `Role` | `/roles` | `Role` | Cristhian | Todos |
| `clients` | `Client` | `/clientes` | `Client` | Cristhian | Jeremy, Jared, Neil |
| `client_sites` | `ClientSite` | `/sedes` | `ClientSite` | Cristhian | Jeremy, Jared |
| `assets` | `Asset` | `/equipos` | `Asset` | Cristhian | Jeremy, Jared |
| `technicians` | `Technician` | `/tecnicos` | `Technician` | Cristhian | Jeremy, Jared, Neil |
| `specialties` | `Specialty` | `/especialidades` | `Specialty` | Cristhian | Jeremy, Jared |
| `technician_specialties` | `TechnicianSpecialty` | anidado en `/tecnicos/:id` | `TechnicianSpecialty` | Cristhian | Jeremy |
| `service_categories` | `ServiceCategory` | `/categorias-servicio` | `ServiceCategory` | Cristhian | Jeremy, Jared |
| `system_parameters` | `SystemParameter` | `/parametros` | `SystemParameter` | Cristhian | Jeremy |
| `holidays` | `Holiday` | `/feriados` | `Holiday` | Cristhian | Jeremy |
| `service_requests` | `ServiceRequest` | `/solicitudes` | `ServiceRequest` | Jeremy | Jared, Neil |
| `request_statuses` | `RequestStatus` | `/estados` | `RequestStatus` | Jeremy | Todos |
| `request_assignments` | `RequestAssignment` | `/solicitudes/:id/asignaciones` | `RequestAssignment` | Jeremy | Jared, Neil |
| `request_history` | `RequestHistory` | `/solicitudes/:id/historial` | `HistoryEvent` | Jeremy | Jared, Neil |
| `request_attachments` | `RequestAttachment` | `/solicitudes/:id/adjuntos` | `RequestAttachment` | Jeremy (datos) / Cristhian (storage) | Jared |
| `notifications` | `Notification` | `/notificaciones` | `Notification` | Jeremy (datos) / Neil (SSE) | Jared, Neil |
| `refresh_tokens` | `RefreshToken` | interno | — | Cristhian | — |
| `password_reset_tokens` | `PasswordResetToken` | interno | — | Cristhian | — |
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

El catálogo completo con HTTP y significado está en [`04-contratos-api.md § 5`](04-contratos-api.md).

## 5. Ownership por módulo

| Módulo (PDF) | Dueño | Colaboradores | Requisitos | Entidades | Endpoints | Pantallas | Pruebas |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 5.1 Seguridad y usuarios | Cristhian | Jeremy (revisión) | RF-AUTH-01…06, RF-USR-01/02 | `users`, `roles`, `refresh_tokens`, `password_reset_tokens` | `/auth/*`, `/usuarios/*`, `/roles` | Login, recuperación, usuarios | Integración auth + IDOR |
| 5.2 Clientes, técnicos y catálogos | Cristhian | Jeremy (consumo), Jared (UI) | RF-CLI-01…03, RF-TEC-01/02, RF-CAT-01…04 | `clients`, `client_sites`, `assets`, `technicians`, `specialties`, `technician_specialties`, `service_categories`, `system_parameters`, `holidays` | `/clientes`, `/sedes`, `/equipos`, `/tecnicos`, `/especialidades`, `/categorias-servicio`, `/parametros`, `/feriados` | CRUD clientes, técnicos y catálogos | Integración CRUD |
| 5.3 Gestión de solicitudes | Jeremy | Cristhian (contrato), Jared (UI) | RF-SOL-01…08 | `service_requests`, `request_statuses`, `request_attachments` | `/solicitudes`, `/solicitudes/:id`, `/solicitudes/:id/adjuntos` | Registro, listado, detalle | Integración + E2E |
| 5.4 Asignación y seguimiento | Jeremy | Cristhian (DB), Jared (UI) | RF-ASI-01…03, RN-01…08 | `request_assignments`, `request_history` | `/solicitudes/:id/asignaciones`, `/solicitudes/:id/historial` | Asignación, reasignación, timeline | Unitarias RN + integración |
| 5.5 Notificaciones e interacción dinámica | Neil | Jeremy (eventos), Jared (UI) | RF-NOT-01…03 | `notifications` | `/notificaciones/*`, `/notificaciones/stream` | Campana, toasts, badge | Integración SSE + E2E |
| 5.6 Dashboard y reportes | Jeremy (SQL/API) + Neil (UI) | Cristhian (índices) | RF-DASH-01…03 | `service_requests`, `request_assignments`, `request_history` | `/dashboard/*` | Dashboard y “Mi resumen” | Integración agregados |
| Transversal: arquitectura y DB | Cristhian | Todos | NFR-PORT-01, NFR-REL-01 | Todas | `/health`, `/docs` | — | CI + revisión |
| Transversal: pruebas y despliegue | Neil | Todos | NFR-* | — | — | — | E2E, CI, despliegue |

## 6. Plan por integrante

### 6.1. Cristhian Loor — E1

**Misión:** garantizar que el modelo de datos y los contratos sean únicos, seguros y reproducibles; implementar autenticación, usuarios y catálogos; actuar como gatekeeper de esquema y API.

**Módulos:** 5.1 y 5.2 del PDF; arquitectura y base de datos.

**Requisitos:** RF-AUTH-01…06, RF-USR-01/02, RF-CLI-01…03, RF-TEC-01/02, RF-CAT-01…04, RN-09, RN-10, RN-15.

**Entidades dueño:** `users`, `roles`, `clients`, `client_sites`, `assets`, `technicians`, `specialties`, `technician_specialties`, `service_categories`, `system_parameters`, `holidays`, `refresh_tokens`, `password_reset_tokens`.

**Endpoints dueño:** `/auth/*`, `/usuarios/*`, `/roles`, `/clientes/*`, `/sedes/*`, `/equipos/*`, `/tecnicos/*`, `/especialidades/*`, `/categorias-servicio/*`, `/parametros/*`, `/feriados/*`, `/health`, `/docs`.

**Tareas:** T-001, T-002, T-003, T-004, T-007, T-008, T-010, T-011, T-012, T-013, T-014, T-015, T-016, T-017, T-018, T-019, T-020, T-049, T-050, T-052, T-053, T-058.

**Entregables por semana:**

| Semana | Entregable |
| :-: | :--- |
| 1 | Monorepo, `schema.prisma`, migración inicial, seed base, esqueleto API, OpenAPI base, ADR ratificados. |
| 2 | Auth completo, RBAC, usuarios, clientes/sedes/equipos, técnicos/especialidades, catálogos y parámetros. |
| 3 | Revisión de contratos, apoyo a integración, corrección de deuda técnica de API. |
| 4 | Adjuntos, auditoría de parámetros/usuarios, revisión de migraciones de dominio. |
| 5 | Integración, matriz de autorización/IDOR, manual técnico, congelamiento de contratos. |

**Defensa:** modelo de datos, migraciones, auth, RBAC, IDOR, capas y decisiones de arquitectura.

### 6.2. Jeremy Marquez — E2

**Misión:** implementar el corazón del negocio: solicitudes, máquina de estados, SLA, asignación, auditoría y consultas del dashboard.

**Módulos:** 5.3, 5.4 y la parte SQL de 5.6.

**Requisitos:** RF-SOL-01…08, RF-ASI-01…03, RF-AUD-01, RN-01…14.

**Entidades dueño:** `service_requests`, `request_statuses`, `request_code_sequences`, `request_assignments`, `request_history`, `request_attachments` (datos), `notifications` (datos).

**Endpoints dueño:** `/solicitudes/*`, `/estados`, `/dashboard/*`.

**Tareas:** T-005, T-021, T-022, T-023, T-024, T-036, T-037, T-038, T-039, T-040, T-041, T-045, T-046, T-047, T-051, T-052.

**Entregables por semana:**

| Semana | Entregable |
| :-: | :--- |
| 1 | Seed transaccional de 60 solicitudes e historial coherente; revisión del modelo de estados. |
| 2 | Registro, listado, detalle, edición con versión y motor de SLA. |
| 3 | Apoyo a la integración del frontend; contratos de solicitudes cerrados. |
| 4 | Máquina de estados, transiciones, reapertura, asignación/reasignación, historial y dashboard SQL/API. |
| 5 | Unitarias RN-01…08, integración de dominio, corrección de defectos. |

**Defensa:** máquina de estados, reglas RN-01…08, SLA, asignación, auditoría, SQL del dashboard.

### 6.3. Jared Ochoa — E3

**Misión:** construir la experiencia React completa de los flujos de cliente y coordinador, con formularios validados, rutas protegidas y estados de UI.

**Módulos:** frontend de 5.1, 5.2, 5.3 y 5.4.

**Requisitos:** RF-AUTH (UI), RF-CLI/TEC/CAT (UI), RF-SOL-01…05/07, RF-ASI-01/02, RF-AUD-01, NFR-USA-01/02.

**Entidades consumidas:** todas las de clientes, técnicos, catálogos y solicitudes.

**Endpoints consumidos:** todos los de Cristhian y Jeremy; no es dueño de endpoints.

**Tareas:** T-006, T-026, T-027, T-028, T-029, T-030, T-031, T-032, T-033, T-035, T-054, T-055, T-058.

**Entregables por semana:**

| Semana | Entregable |
| :-: | :--- |
| 1 | `packages/shared` con enums y esquemas base; acuerdos de tipos con backend. |
| 2 | Cliente HTTP, manejo de tokens y contratos de UI definidos. |
| 3 | Login, layout, rutas protegidas, CRUDs, registro, listado, detalle y asignación. |
| 4 | Integración de acciones por estado y timeline; revisión de contratos con Neil. |
| 5 | E2E con Neil, checklist responsive/accesibilidad, manual de usuario. |

**Defensa:** React, Hooks, rutas protegidas, formularios, integración API, estados de carga/error/vacío, accesibilidad.

### 6.4. Neil Goyes — E4

**Misión:** entregar la funcionalidad en tiempo real, el dashboard visual, la calidad automatizada y el despliegue reproducible.

**Módulos:** 5.5, UI de 5.6, pruebas y despliegue.

**Requisitos:** RF-NOT-01…03, RF-DASH (UI), NFR-PERF-03, NFR-USA-01/02, NFR-PORT-01, NFR-DOC-01, NFR-OBS-01.

**Entidades dueño:** `notifications` (entrega SSE); consumidor de solicitudes, asignaciones e historial.

**Endpoints dueño:** `/notificaciones/*`, `/notificaciones/stream`.

**Tareas:** T-009, T-025, T-034, T-042, T-043, T-044, T-048, T-051, T-054, T-056, T-057, T-059, T-060.

**Entregables por semana:**

| Semana | Entregable |
| :-: | :--- |
| 1 | Docker Compose funcional (db + api + web), CI inicial. |
| 2 | Pruebas de SLA (con Jeremy), pipeline base. |
| 3 | UI del técnico: bandeja, iniciar, solicitar información, resolver. |
| 4 | Notificaciones persistentes, SSE, campana/toasts, dashboard UI. |
| 5 | Suite E2E, CI completo, despliegue, informe de pruebas, video y ensayo de defensa. |

**Defensa:** SSE, notificaciones, dashboard UI, pruebas E2E, CI/CD, despliegue y operación.

## 7. Matriz RACI

**R** = responsable de ejecutar · **A** = accountable (dueño final) · **C** = consultado · **I** = informado.

| Artefacto | Cristhian | Jeremy | Jared | Neil |
| :--- | :-: | :-: | :-: | :-: |
| Modelo ER y `schema.prisma` | A/R | C | I | I |
| Migraciones y seed base | A/R | C | I | I |
| Contratos `packages/shared` | A | C | R | C |
| OpenAPI | A/R | C | C | C |
| Auth y seguridad | A/R | C | I | I |
| Clientes/técnicos/catálogos (API) | A/R | C | I | I |
| Solicitudes/estados/SLA (API) | C | A/R | I | I |
| Asignaciones/auditoría (API) | C | A/R | I | I |
| Notificaciones/SSE (API) | I | C | I | A/R |
| Dashboard SQL/API | C | A/R | I | C |
| Frontend shell/solicitudes | I | C | A/R | C |
| Frontend técnico/dashboard | I | C | C | A/R |
| Pruebas unitarias de reglas | C | A/R | I | R |
| Pruebas de integración | A/R | R | I | C |
| E2E | I | C | R | A/R |
| CI/CD y despliegue | C | I | I | A/R |
| Manual técnico | A/R | C | I | R |
| Manual de usuario | C | I | A/R | I |
| Informe de pruebas | C | C | C | A/R |
| Video y defensa | R | R | R | A/R |

## 8. Puntos de integración y handoffs

### 8.1. Base de datos → backend

- Cristhian mantiene `schema.prisma` y genera migraciones.
- Jeremy propone cambios de entidades transaccionales en su rama; **no** ejecuta migraciones contra `develop`.
- Antes de mergear: `prisma validate`, `prisma format`, migración reproducible y actualización de [`02-modelo-dominio.md`](02-modelo-dominio.md).
- Prohibido `db push` en `develop` o `main`.

### 8.2. Backend → frontend

- El contrato es `packages/shared` + OpenAPI, no “lo que devuelve el endpoint en mi máquina”.
- Jared y Neil importan tipos y esquemas; no crean interfaces paralelas.
- Si un endpoint cambia, el PR debe actualizar shared, OpenAPI, frontend y pruebas.
- El frontend no accede a la BD ni usa datos mock en la demo final.

### 8.3. Notificaciones / SSE

- El esquema `NotificationEvent` vive en `packages/shared/src/notifications.ts`.
- Jeremy emite eventos desde las transiciones; Neil los entrega por SSE; Jared los consume en la UI.
- El evento debe incluir `id`, `type`, `title`, `body`, `requestId`, `createdAt`.
- Si se agrega un tipo de notificación, se actualiza el enum compartido y las pruebas de ambos lados.

### 8.4. Dashboard

- Jeremy define el esquema `DashboardIndicators` y la semántica de cada métrica.
- Neil construye la UI con ese esquema; no calcula métricas en el cliente.
- Ambos prueban con el mismo seed; los rangos sin datos devuelven arreglos vacíos y ceros.

### 8.5. Adjuntos

- Cristhian define el contrato de subida/descarga y el almacenamiento.
- Jeremy vincula el adjunto a la solicitud y su historial.
- Jared construye la UI; nunca usa una URL física directa.

## 9. Calendario, congelamientos y reuniones

| Momento | Qué se congela | Responsable |
| :--- | :--- | :--- |
| Día 3 de la semana 1 | Modelo de datos v1 y nombres canónicos | Cristhian |
| Día 5 de la semana 1 | Contratos `shared` v1 y OpenAPI base | Cristhian + Jared |
| Día 5 de la semana 2 | API de auth y catálogos estable | Cristhian |
| Día 5 de la semana 3 | Flujo de solicitudes integrado | Jeremy + Jared |
| Día 5 de la semana 4 | Reglas, SSE y dashboard completos; **feature freeze** | Todos |
| Día 2 de la semana 5 | Solo correcciones; no nuevas funcionalidades | Todos |
| Día 4 de la semana 5 | QA, despliegue y evidencias cerradas | Neil |
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
dev/<nombre>  ← trabajo personal (cristhian, jeremy, jared, neil)
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
feat(solicitudes): implementar transición a resuelta [T-037]
feat(db): agregar índice de vencimiento [T-003]
test(rn-04): cubrir reapertura sin motivo [T-051]
docs(api): documentar endpoint de asignaciones [T-039]
```

### 10.3. Pull requests

- Título con `T-###` y requisito (`RF-*`/`RN-*`).
- Descripción: qué cambia, cómo se probó y qué contrato se actualizó.
- Revisor: uno distinto del autor.
- Cambios de esquema/contrato: dos revisores (Cristhian + consumidor).
- CI en verde obligatorio.
- Sin `console.log`, sin secretos, sin TODOs sin tarea.

## 11. Pruebas y evidencias por dueño

| Dueño | Pruebas que debe entregar | Evidencia |
| :--- | :--- | :--- |
| Cristhian | Integración de auth, usuarios, clientes, técnicos, catálogos; IDOR; rate limit. | Reporte de integración + matriz de autorización. |
| Jeremy | Unitarias RN-01…08, SLA, concurrencia; integración de solicitudes, asignaciones, historial y dashboard. | Reporte unitario/integración + cobertura. |
| Jared | Pruebas de componentes críticos y checklist responsive/accesibilidad; soporte E2E. | Capturas + Lighthouse + E2E. |
| Neil | E2E-01/E2E-02, CI, despliegue, SSE, informe de pruebas. | Pipeline + URL desplegada + informe. |

**Regla:** el dueño de una regla escribe su prueba; otro la revisa. No se acepta una regla sin prueba.

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
| Cristhian ↔ Jeremy | Modelo de datos, auth, solicitudes, estados, SLA, auditoría. |
| Jared ↔ Neil | Frontend, SSE, dashboard, pruebas E2E, despliegue. |

Cada uno ensaya al menos una vez el flujo completo del otro antes de la entrega.

## 13. Reglas para evitar incongruencias

1. **Un nombre canónico por concepto.** Si existe en el diccionario, se usa ese; no se crea otro.
2. **Un dueño por artefacto.** El dueño revisa todo cambio; el consumidor valida que el contrato le sirva.
3. **Contrato antes que código.** No se implementa un endpoint sin esquema compartido y documentación.
4. **Cambio de contrato = checklist completo.** Schema + migración + shared + OpenAPI + frontend + pruebas + docs en el mismo PR.
5. **Sin enums duplicados.** Se importan de `shared`; si falta uno, se agrega una sola vez.
6. **Sin SQL fuera del dashboard.** Y el del dashboard lo revisa Cristhian.
7. **Sin datos mock en la demo final.** Todo pasa por API y persistencia real.
8. **Sin migraciones paralelas.** Solo Cristhian genera/mergea migraciones.
9. **Sin push directo a `develop`/`main`.** Todo por PR con CI.
10. **Sin cambios silenciosos.** Todo cambio de contrato se anuncia en la reunión del miércoles y se registra en el PR.
11. **Sin “lo arreglo en el frontend”.** Las reglas de negocio viven en el backend.
12. **Sin fechas locales ambiguas.** ISO 8601 con offset; el backend calcula el SLA.

## 14. Checklist de arranque para cada integrante

- [ ] Clonar el repo y leer [`00-constitucion.md`](00-constitucion.md), [`01-especificacion.md`](01-especificacion.md) y [`03-arquitectura.md`](03-arquitectura.md).
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
