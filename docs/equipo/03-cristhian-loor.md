# Cristhian Loor — Full stack, QA y despliegue

**Código:** CRI · **Rama:** `dev/cristhian` · **Plan general:** [`../11-plan-equipo.md`](../11-plan-equipo.md)

## 1. Misión

Asegurar que el sistema se integre, se pruebe y se despliegue de forma reproducible. Soy dueño de la entrega SSE de notificaciones, de la suite E2E, de la verificación local, del despliegue, del informe de pruebas y del video de defensa. También escribo la suite independiente de aceptación de reglas y SLA.

## 2. Documentos que debo leer

- [`../00-constitucion.md`](../00-constitucion.md)
- [`../01-especificacion.md`](../01-especificacion.md), RF-NOT, NFR-PORT, NFR-MAN, NFR-PERF y RN-01…RN-14.
- [`../02-modelo-dominio.md`](../02-modelo-dominio.md), eventos, estados y SLA.
- [`../03-arquitectura.md`](../03-arquitectura.md), SSE, integración y despliegue.
- [`../04-contratos-api.md`](../04-contratos-api.md), `/notificaciones/*` y `/notificaciones/stream`.
- [`../05-pruebas.md`](../05-pruebas.md), secciones 6, 7 y 11.1.
- [`../06-tareas.md`](../06-tareas.md), tareas T-009, T-025, T-042, T-043, T-051, T-054, T-056, T-057, T-058, T-059, T-060.
- [`../07-implementacion.md`](../07-implementacion.md), SSE y transacciones.
- [`../08-despliegue.md`](../08-despliegue.md), Docker, verificación local, despliegue y operación.
- [`../10-trazabilidad.md`](../10-trazabilidad.md)

## 3. Alcance exacto

### 3.1. Módulos

| Módulo | RF/NFR | Entidades/artefactos | Endpoints/artefactos |
| :--- | :--- | :--- | :--- |
| 5.5 Notificaciones e interacción dinámica | RF-NOT-01…03 | `notifications` (entrega), `NotificationEvent` | `/notificaciones/*`, `/notificaciones/stream` |
| QA de reglas y SLA | RN-01…RN-08, RN-06 | Suite independiente | `TC-RN`, `TC-SLA` |
| E2E | NFR-USA, flujos completos | Playwright | `apps/web/e2e/` |
| Verificación local | NFR-MAN-01 | Lint, typecheck, pruebas, build | `docs/05-pruebas.md`, `docs/08-despliegue.md` |
| Despliegue | NFR-PORT-01 | Docker Compose, BD, API, web | `docker-compose.yml`, `Dockerfile` |
| Informe y video | Entregables 7 y defensa | Evidencias | `docs/`, video |

### 3.2. Entidades y artefactos de los que soy dueño

- Entrega SSE de `notifications`; no soy dueño del schema (Jeremy) ni del almacenamiento (Jared).
- `packages/shared/src/notifications.ts` (contenido; la estructura la aprueba Neil).
- Imágenes Docker, Compose, healthchecks, verificación local y backup/restore.
- Suite E2E, suite independiente de aceptación de RN/SLA, informe de pruebas y video.
- No soy dueño de: entidades de BD, frontend, lógica de dominio ni contrato OpenAPI.

### 3.3. Archivos y carpetas

- `apps/api/src/modules/notifications/`.
- `apps/api/src/sse/`.
- `packages/shared/src/notifications.ts`.
- `apps/api/tests/integration/notifications/`.
- `apps/api/tests/unit/domain/sla.acceptance.test.ts` (T-025).
- `apps/api/tests/unit/domain/rules.acceptance.test.ts` (T-051, parte independiente).
- `apps/web/e2e/`.
- `docker-compose.yml`, `apps/api/Dockerfile`, `apps/web/Dockerfile`.
- `tests/performance/`.
- `docs/08-despliegue.md` (sección de operación) y `docs/05-pruebas.md` (evidencias).

## 4. Tareas asignadas

| Semana | Tareas | Entregable |
| :-: | :--- | :--- |
| 1 | T-009 | Docker Compose con PostgreSQL, API y web. |
| 2 | T-025 + verificación local inicial | Suite de SLA (7 casos) y verificación local base. |
| 3 | Apoyo QA y SSE | Diseño de eventos, datos de prueba y soporte a integración. |
| 4 | T-042, T-043 | Notificaciones persistentes y hub SSE. |
| 5 | T-051, T-054, T-056, T-057, T-058, T-059, T-060 | Suite de reglas, E2E, verificación local, despliegue, manual de despliegue, informe y video. |

### 4.1. Tareas compartidas

- **T-051 Suite unitaria de RN-01…RN-08:** Jeremy escribe las pruebas de implementación; yo escribo la suite independiente de aceptación desde la especificación y controlo la cobertura. Ninguno aprueba solo.
- **T-054 E2E:** yo escribo los flujos Playwright y los ejecuto en el entorno de verificación local; Neil mantiene selectores `data-testid` y corrige defectos visuales.
- **T-058 Manual técnico:** Jared escribe BD; yo escribo despliegue/operación; Neil escribe manual de usuario.
- **T-060 Video y defensa:** todos participan; yo coordino guion, grabación y evidencias.

## 5. Pruebas que debo escribir y ejecutar

| Familia | Casos mínimos | Archivo |
| :--- | :--- | :--- |
| `TC-NOT` | Persistencia por evento, lectura, badge y no duplicados. | `apps/api/tests/integration/notifications/` |
| `TC-SSE` | Autenticación del stream, reconexión, `Last-Event-ID`, aislamiento por usuario/rol. | `apps/api/tests/integration/notifications/` |
| `TC-E2E` | E2E-01 registro → asignación → atención; E2E-02 consulta → seguimiento → cierre. | `apps/web/e2e/` |
| `TC-DEP` | `docker compose up`, healthcheck, migraciones, seed, backup/restore. | `tests/performance/` y entorno de verificación local |
| `TC-PERF` | Dashboard p95 < 2 s con 10 000 solicitudes; 50 conexiones SSE. | `tests/performance/` |
| `TC-SLA` | Límites exactos, feriados, zona horaria y calendario laboral (T-025). | `apps/api/tests/unit/domain/` |
| `TC-RN` | Suite independiente de aceptación de RN-01…RN-08 (T-051). | `apps/api/tests/unit/domain/` |

**Regla:** las pruebas de aceptación se escriben desde `01-especificacion.md`, no desde la implementación. Si una prueba y el código discrepan, se detiene el merge y se resuelve con el dueño del dominio.

## 6. Handoffs

| Recibo | De | Entrego | A |
| :--- | :--- | :--- | :--- |
| Eventos de transición | Jeremy | Entrega SSE autenticada y persistencia de lectura | Jeremy, Neil |
| Contrato `NotificationEvent` | Jeremy | Esquema `notifications.ts` y pruebas | Neil |
| Selectores y estados de UI | Neil | E2E estable y reporte de defectos | Neil |
| Migraciones y seed | Jared | Verificación local con BD limpia y migraciones | Jared |
| Artefactos de build | Todos | Imágenes, verificación local y despliegue | Todos |
| Evidencias de pruebas | Todos | Informe consolidado y video | Todos |

## 7. Flujo SDD obligatorio

1. Leer RF/NFR y el contrato de eventos/notificaciones.
2. Actualizar `notifications.ts` y OpenAPI; pedir revisión a Jeremy y Neil.
3. Escribir la prueba de aceptación o E2E que falla.
4. Implementar SSE, verificación local o despliegue.
5. Ejecutar `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e` en local.
6. Documentar evidencia, tiempos y resultados en `05-pruebas.md` y trazabilidad.
7. PR con evidencia; revisión de Jeremy o Jared.

## 8. Entregables semanales

- **Semana 1:** Compose funcional con PostgreSQL, API y web.
- **Semana 2:** suite SLA y verificación local inicial en verde.
- **Semana 3:** diseño SSE, datos de prueba y soporte de integración.
- **Semana 4:** notificaciones persistentes y SSE con reconexión.
- **Semana 5:** suite de reglas, E2E, verificación local, despliegue, manual de despliegue, informe, video y defensa.

## 9. Definition of Done personal

- SSE autenticado, con reconexión y sin duplicados ni fugas entre usuarios.
- E2E-01 y E2E-02 en verde en el entorno de verificación local.
- Verificación local obligatoria antes de cada PR.
- Despliegue reproducible con healthcheck, migraciones y seed.
- Backup/restore probado.
- Informe con evidencia de los cuatro integrantes.
- Puedo explicar y modificar en vivo SSE, verificación local, despliegue y pruebas.

## 10. Defensa

Debo demostrar:

1. Abrir dos sesiones y mostrar que cada usuario recibe solo sus notificaciones.
2. Desconectar/reconectar SSE y recuperar eventos con `Last-Event-ID`.
3. Ejecutar E2E-01/E2E-02 en vivo.
4. Mostrar la verificación local y un despliegue con healthcheck.
5. Ejecutar una prueba de SLA y explicar sus límites.
6. Presentar el informe y el video.
