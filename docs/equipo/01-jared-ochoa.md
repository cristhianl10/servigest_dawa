# Jared Ochoa — Base de datos, backend core y seguridad

**Código:** JAR · **Rama:** `dev/jared` · **Plan general:** [`../11-plan-equipo.md`](../11-plan-equipo.md)

## 1. Misión

Construir la base técnica del sistema: modelo de datos, migraciones, seed base, autenticación, autorización, CRUD de usuarios y catálogos, almacenamiento de adjuntos y consolidación de OpenAPI. Es el guardián de la integridad de la base de datos y de la seguridad de acceso.

## 2. Documentos que debo leer

- [`../00-constitucion.md`](../00-constitucion.md)
- [`../01-especificacion.md`](../01-especificacion.md), RF-AUTH, RF-USR, RF-CLI, RF-TEC, RF-CAT y NFR-SEG.
- [`../02-modelo-dominio.md`](../02-modelo-dominio.md), entidades base, relaciones y restricciones.
- [`../03-arquitectura.md`](../03-arquitectura.md), capas y estructura de `apps/api`.
- [`../04-contratos-api.md`](../04-contratos-api.md), endpoints `/auth`, `/usuarios`, `/clientes`, `/tecnicos`, `/catalogos`.
- [`../05-pruebas.md`](../05-pruebas.md), secciones 4, 5 y 11.1.
- [`../06-tareas.md`](../06-tareas.md), tareas T-001…T-020, T-049, T-050, T-052, T-053, T-058.
- [`../07-implementacion.md`](../07-implementacion.md), seguridad, validación y persistencia.
- [`../08-despliegue.md`](../08-despliegue.md), migraciones y operación de BD.
- [`../10-trazabilidad.md`](../10-trazabilidad.md)

## 3. Alcance exacto

### 3.1. Módulos

| Módulo | RF | Entidades | Endpoints |
| :--- | :--- | :--- | :--- |
| 5.1 Seguridad y usuarios | RF-AUTH-01…06, RF-USR-01/02 | `users`, `roles`, `refresh_tokens`, `password_reset_tokens` | `/auth/*`, `/usuarios/*`, `/roles` |
| 5.2 Clientes, técnicos y catálogos | RF-CLI-01…03, RF-TEC-01/02, RF-CAT-01…04 | `clients`, `client_sites`, `assets`, `technicians`, `specialties`, `technician_specialties`, `service_categories`, `system_parameters`, `holidays` | `/clientes`, `/sedes`, `/equipos`, `/tecnicos`, `/especialidades`, `/categorias-servicio`, `/parametros`, `/feriados` |
| Adjuntos (storage) | RF-SOL-07, RN-14 | `request_attachments` (solo almacenamiento y validación) | `/solicitudes/:id/adjuntos` (descarga autorizada) |
| OpenAPI | NFR-DOC-01 | — | Consolidación de `openapi.yaml` |

### 3.2. Entidades de las que soy dueño

`users`, `roles`, `refresh_tokens`, `password_reset_tokens`, `clients`, `client_sites`, `assets`, `technicians`, `specialties`, `technician_specialties`, `service_categories`, `system_parameters`, `holidays` y el almacenamiento físico/validación de `request_attachments`.

No soy dueño de: `service_requests`, `request_statuses`, `request_code_sequences`, `request_assignments`, `request_history`, metadatos de `request_attachments`, `notifications` (datos) ni de la entrega SSE.

### 3.3. Archivos y carpetas

- `apps/api/prisma/schema.prisma` (solo yo lo modifica y mergea).
- `apps/api/prisma/migrations/`.
- `apps/api/prisma/seed/base.ts`.
- `apps/api/src/modules/auth/`.
- `apps/api/src/modules/users/`.
- `apps/api/src/modules/clients/`.
- `apps/api/src/modules/technicians/`.
- `apps/api/src/modules/catalogs/`.
- `apps/api/src/modules/attachments/` (storage y validación).
- `apps/api/src/middlewares/auth.ts`, `authorize.ts`, `rateLimit.ts`, `errorHandler.ts`.
- `apps/api/tests/unit/db/`, `tests/integration/auth/`, `tests/integration/master-data/`, `tests/security/`.
- `docs/04-contratos-api.md` y `openapi/openapi.yaml` (consolidación).

## 4. Tareas asignadas

| Semana | Tareas | Entregable |
| :-: | :--- | :--- |
| 1 | T-001, T-002, T-003, T-004, T-007, T-008, T-010 | Monorepo, `schema.prisma`, migración inicial, seed base, esqueleto Express, errores, OpenAPI base. |
| 2 | T-011, T-012, T-013, T-014, T-015, T-016, T-017, T-018, T-019, T-020 | Auth completa, refresh rotativo, recuperación, usuarios/roles y CRUD de clientes, técnicos y catálogos. |
| 3 | Apoyo a contratos y API | Revisión de OpenAPI, ajustes de validación, soporte a Jeremy y Neil. |
| 4 | T-049, T-050 | Adjuntos con validación/descarga autorizada y auditoría de cambios de parámetros/usuarios. |
| 5 | T-052 (parte auth/master data), T-053, T-058 (sección BD) | Suite de integración, matriz IDOR, manual técnico de BD, defensa. |

### 4.1. Tareas compartidas

- **T-052 Suite de integración:** yo cubro auth, usuarios y master data; Jeremy cubre dominio. Cristhian revisa que el pipeline la ejecute.
- **T-058 Manual técnico:** yo escribo la sección de modelo de datos, migraciones, seed y operación de BD; Cristhian escribe despliegue; Neil escribe manual de usuario.

## 5. Pruebas que debo escribir y ejecutar

| Familia | Casos mínimos | Archivo |
| :--- | :--- | :--- |
| `TC-DB` | Migración desde cero, `prisma migrate diff` vacío, constraints, unique, foreign keys, borrado restringido. | `apps/api/tests/unit/db/` |
| `TC-AUTH` | Login válido/inválido, bloqueo, refresh rotativo, reutilización de token, logout. | `apps/api/tests/integration/auth/` |
| `TC-USR` | CRUD usuarios/roles, no eliminar al último administrador, permisos. | `apps/api/tests/integration/auth/` |
| `TC-CLI` | Aislamiento por `client_id`, sedes y equipos. | `apps/api/tests/integration/master-data/` |
| `TC-TEC` | Especialidades, disponibilidad, carga y unicidad. | `apps/api/tests/integration/master-data/` |
| `TC-CAT` | Catálogos, parámetros y feriados. | `apps/api/tests/integration/master-data/` |
| `TC-SEC` | IDOR, rate limit, CORS, cabeceras y autorización por rol. | `apps/api/tests/security/` |
| `TC-ATT` | Subida, tipo/tamaño, descarga autorizada y path traversal. | `apps/api/tests/integration/master-data/` |

**Regla:** cada caso debe existir antes de la implementación o en el mismo PR. No se acepta un endpoint sin prueba de autorización e integración.

## 6. Handoffs

| Recibo | De | Entrego | A |
| :--- | :--- | :--- | :--- |
| Requisitos de entidades y reglas de dominio | Jeremy | `schema.prisma`, migraciones, seed base, tipos Prisma | Jeremy, Cristhian |
| Contrato de notificaciones y dashboard | Jeremy / Cristhian | Nombres de tablas, índices y constraints | Jeremy |
| Necesidades de UI y contratos | Neil | OpenAPI y esquemas compartidos estables | Neil |
| Eventos de auditoría de usuarios/parámetros | Jeremy | Persistencia y consulta de auditoría | Jeremy |
| Requerimientos de despliegue | Cristhian | Migración reproducible y seed idempotente | Cristhian |

## 7. Flujo SDD obligatorio

1. Leer RF/RN y confirmar entidades y endpoints en `01`, `02` y `04`.
2. Actualizar `schema.prisma` y el contrato OpenAPI en el mismo PR.
3. Escribir primero la prueba de integración o de constraint que falla.
4. Implementar migración, repositorio, servicio y controlador.
5. Ejecutar `pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm test:integration`.
6. Actualizar `10-trazabilidad.md` con `RF ↔ endpoint ↔ TC ↔ T`.
7. Abrir PR con evidencia y pedir revisión a Jeremy o Cristhian; cambios de contrato con dos revisores.

## 8. Entregables semanales

- **Semana 1:** repositorio reproducible, `schema.prisma` completo, migración inicial, seed base idempotente, Express con errores y OpenAPI base.
- **Semana 2:** auth y refresh funcionando, CRUD de usuarios y master data con pruebas de autorización.
- **Semana 3:** OpenAPI consistente, revisión de contratos, soporte a dominio y frontend.
- **Semana 4:** adjuntos seguros y auditoría de cambios.
- **Semana 5:** suite de integración auth/master data, matriz IDOR, manual de BD y defensa.

## 9. Definition of Done personal

- Migración limpia desde cero y seed idempotente.
- 100 % de endpoints con prueba de autorización y integración.
- Sin `any` en contratos; sin SQL fuera de Prisma salvo dashboard.
- OpenAPI sin errores y con ejemplos.
- Manual de BD actualizado.
- Puedo explicar y modificar en vivo auth, usuarios, clientes y catálogos.

## 10. Defensa

Debo demostrar:

1. Crear la BD desde cero, correr migraciones y seed.
2. Login, refresh rotativo, revocación y recuperación.
3. Un intento de IDOR bloqueado.
4. Un CRUD de cliente/técnico con validación.
5. Cómo se relaciona mi modelo con solicitudes, asignaciones y dashboard.
