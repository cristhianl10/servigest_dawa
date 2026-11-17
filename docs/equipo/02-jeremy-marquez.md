# Jeremy Marquez — Backend de dominio

**Código:** JER · **Rama:** `dev/jeremy` · **Plan general:** [`../11-plan-equipo.md`](../11-plan-equipo.md)

## 1. Misión

Implementar el núcleo funcional de ServiGest: solicitudes, máquina de estados, SLA, asignaciones, historial, auditoría y consultas del dashboard. Es el dueño de las reglas de negocio y de la coherencia transaccional del flujo de atención.

## 2. Documentos que debo leer

- [`../00-constitucion.md`](../00-constitucion.md)
- [`../01-especificacion.md`](../01-especificacion.md), RF-SOL, RF-ASI, RF-AUD, RF-DASH y RN-01…RN-14.
- [`../02-modelo-dominio.md`](../02-modelo-dominio.md), estados, transiciones, SLA e invariantes.
- [`../03-arquitectura.md`](../03-arquitectura.md), capas `domain`, `services`, `repositories`.
- [`../04-contratos-api.md`](../04-contratos-api.md), `/solicitudes`, `/asignaciones`, `/historial`, `/dashboard`.
- [`../05-pruebas.md`](../05-pruebas.md), secciones 3, 4 y 11.1.
- [`../06-tareas.md`](../06-tareas.md), tareas T-005, T-021…T-024, T-036…T-041, T-045…T-047, T-051, T-052.
- [`../07-implementacion.md`](../07-implementacion.md), algoritmos de estados, SLA y dashboard.
- [`../10-trazabilidad.md`](../10-trazabilidad.md)

## 3. Alcance exacto

### 3.1. Módulos

| Módulo | RF/RN | Entidades | Endpoints |
| :--- | :--- | :--- | :--- |
| 5.3 Gestión de solicitudes | RF-SOL-01…08, RN-08, RN-09 | `service_requests`, `request_statuses`, `request_attachments` (metadatos) | `/solicitudes`, `/solicitudes/:id`, `/solicitudes/:id/adjuntos` |
| 5.4 Asignación y seguimiento | RF-ASI-01…03, RN-01…08, RN-11/12 | `request_assignments`, `request_history` | `/solicitudes/:id/asignaciones`, `/solicitudes/:id/historial` |
| 5.6 Dashboard SQL/API | RF-DASH-01…03, RN-06 | `service_requests`, `request_assignments`, `request_history` | `/dashboard/*` |
| Notificaciones (datos) | RF-NOT-01/03 | `notifications` | Publica eventos; no entrega SSE |

### 3.2. Entidades de las que soy dueño

`service_requests`, `request_statuses`, `request_code_sequences`, `request_assignments`, `request_history`, metadatos de `request_attachments` y `notifications` (datos).

No soy dueño de: `users`, `roles`, `clients`, `client_sites`, `assets`, `technicians`, `specialties`, `technician_specialties`, `service_categories`, `system_parameters`, `holidays`, `refresh_tokens`, `password_reset_tokens` (Jared); almacenamiento físico de adjuntos (Jared); entrega SSE (Cristhian); frontend (Neil).

### 3.3. Archivos y carpetas

- `apps/api/src/modules/requests/`.
- `apps/api/src/modules/dashboard/`.
- `apps/api/src/domain/requests/` (estados, transiciones, SLA).
- `apps/api/src/services/requests/`.
- `apps/api/src/repositories/requests/`.
- `apps/api/prisma/seed/requests.ts` (seed transaccional).
- `packages/shared/src/requests.ts` (esquemas de dominio; la estructura la aprueba Neil).
- `apps/api/tests/unit/domain/`.
- `apps/api/tests/integration/requests/`.
- `apps/api/tests/integration/assignments/`.
- `apps/api/tests/integration/dashboard/`.

## 4. Tareas asignadas

| Semana | Tareas | Entregable |
| :-: | :--- | :--- |
| 1 | T-005 | Seed de 60 solicitudes e historial coherente. |
| 2 | T-021, T-022, T-023, T-024 | Registro con código único y `dueAt`, listado por rol, detalle/edición y motor de SLA. |
| 3 | Apoyo a contratos y API | Cierre de contrato de solicitudes, diseño de máquina de estados y datos de prueba. |
| 4 | T-036, T-037, T-038, T-039, T-040, T-041, T-045, T-046, T-047 | Máquina de estados, transiciones, reapertura, asignación/reasignación, historial y dashboard SQL/API. |
| 5 | T-051, T-052 (parte dominio) | Suite de reglas y integración de dominio; defensa. |

### 4.1. Tareas compartidas

- **T-051 Suite unitaria de RN-01…RN-08:** yo escribo las pruebas de implementación de cada rama del dominio; Cristhian escribe la suite independiente de aceptación y el control de cobertura. Ninguno aprueba solo.
- **T-052 Suite de integración:** yo cubro solicitudes, asignaciones, historial y dashboard; Jared cubre auth/master data.
- **T-042 Notificaciones persistentes:** yo emito el evento de dominio; Cristhian persiste/entrega SSE y Neil consume.

## 5. Pruebas que debo escribir y ejecutar

| Familia | Casos mínimos | Archivo |
| :--- | :--- | :--- |
| `TC-RN` | RN-01 cierre sin resolución, RN-02 alcance del técnico, RN-03 aislamiento de clientes, RN-04 reapertura/terminales, RN-05 asignación, RN-06 SLA, RN-07 auditoría, RN-08 concurrencia. | `apps/api/tests/unit/domain/` |
| `TC-SOL` | Registro, código único, `dueAt`, listado por rol, detalle, edición con bloqueo optimista, adjuntos. | `apps/api/tests/integration/requests/` |
| `TC-ASI` | Asignación válida, reasignación con motivo, rechazo por especialidad/carga/disponibilidad. | `apps/api/tests/integration/assignments/` |
| `TC-AUD` | Historial inmutable, ordenado, con actor y estado anterior/nuevo. | `apps/api/tests/integration/requests/` |
| `TC-DASH` | Indicadores, filtros, permisos, cumplimiento SLA y consultas sin N+1. | `apps/api/tests/integration/dashboard/` |
| `TC-RN-06` | Calendario laboral, feriados, zona horaria y límites exactos del SLA. | `apps/api/tests/unit/domain/` |

**Regla:** cada transición de estado tiene al menos un caso feliz y uno de rechazo. Cada consulta del dashboard tiene prueba de permisos y `EXPLAIN` documentado.

## 6. Handoffs

| Recibo | De | Entrego | A |
| :--- | :--- | :--- | :--- |
| `schema.prisma`, migraciones y tipos Prisma | Jared | Cambios propuestos de entidades transaccionales | Jared |
| Contrato de auth/roles y master data | Jared | Uso de `client_id`, `technician_id` y permisos | Jared |
| Contrato `DashboardIndicators` | Yo lo defino | Semántica de métricas y queries | Neil (UI), Cristhian (pruebas) |
| Eventos de transición | Yo los emito | Payload `NotificationEvent` | Cristhian (SSE), Neil (UI) |
| Selectores y estados de UI | Neil | Contrato de estados y errores | Neil |
| Validación de adjuntos | Jared | Metadatos y vínculo con solicitud/historial | Jared |

## 7. Flujo SDD obligatorio

1. Leer RF/RN y escribir el caso de uso con precondiciones, transiciones y errores.
2. Actualizar `packages/shared/src/requests.ts` y OpenAPI; pedir revisión a Neil/Jared.
3. Escribir la prueba unitaria de la regla y la de integración del endpoint.
4. Implementar dominio, servicio, repositorio y controlador.
5. Ejecutar `pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm test:integration`.
6. Documentar `EXPLAIN` de consultas del dashboard y actualizar trazabilidad.
7. PR con evidencia; revisión de Jared o Cristhian.

## 8. Entregables semanales

- **Semana 1:** seed transaccional coherente con 60 solicitudes e historial.
- **Semana 2:** registro, listado, detalle/edición y SLA con pruebas.
- **Semana 3:** contrato de solicitudes cerrado, matriz de transiciones y datos de prueba.
- **Semana 4:** estados, transiciones, reapertura, asignación, historial y dashboard SQL/API.
- **Semana 5:** suite de reglas, integración de dominio, evidencia de rendimiento y defensa.

## 9. Definition of Done personal

- Todas las transiciones inválidas devuelven error de dominio y quedan auditadas.
- SLA calculado con calendario, feriados y zona horaria.
- Asignación valida especialidad, carga y disponibilidad.
- Historial inmutable y ordenado.
- Dashboard con permisos y consultas eficientes.
- Sin lógica de negocio en controladores; sin SQL fuera de dashboard.
- Puedo explicar y modificar en vivo solicitudes, estados, SLA, asignaciones y dashboard.

## 10. Defensa

Debo demostrar:

1. Crear una solicitud y calcular su `dueAt`.
2. Ejecutar una transición válida y una inválida.
3. Asignar y reasignar con validaciones.
4. Mostrar el historial y la auditoría.
5. Ejecutar una consulta del dashboard y explicar su `EXPLAIN`.
6. Ejecutar una prueba de RN en vivo.
