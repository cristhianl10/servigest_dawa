# Neil Goyes — Frontend

**Código:** NEI · **Rama:** `dev/neil` · **Plan general:** [`../11-plan-equipo.md`](../11-plan-equipo.md)

## 1. Misión

Construir la interfaz completa de ServiGest: shell, rutas por rol, autenticación, formularios, solicitudes, operación del técnico, dashboard, notificaciones en UI y accesibilidad. Soy dueño de la estructura de `packages/shared` y del manual de usuario.

## 2. Documentos que debo leer

- [`../00-constitucion.md`](../00-constitucion.md)
- [`../01-especificacion.md`](../01-especificacion.md), RF y NFR-USA.
- [`../02-modelo-dominio.md`](../02-modelo-dominio.md), estados y permisos por rol.
- [`../03-arquitectura.md`](../03-arquitectura.md), estructura de `apps/web`.
- [`../04-contratos-api.md`](../04-contratos-api.md), todos los endpoints que consume la UI.
- [`../05-pruebas.md`](../05-pruebas.md), secciones 6, 7 y 11.1.
- [`../06-tareas.md`](../06-tareas.md), tareas T-006, T-026…T-035, T-044, T-048, T-054, T-055, T-058.
- [`../07-implementacion.md`](../07-implementacion.md), componentes, formularios y estados.
- [`../09-manual-usuario.md`](../09-manual-usuario.md)
- [`../10-trazabilidad.md`](../10-trazabilidad.md)

## 3. Alcance exacto

### 3.1. Módulos

| Módulo | RF/NFR | Artefactos | Rutas UI |
| :--- | :--- | :--- | :--- |
| Shell y autenticación | RF-AUTH, NFR-SEG | Layout, rutas protegidas, login, recuperación | `/login`, `/recuperar`, `/` |
| Clientes, técnicos y catálogos | RF-CLI, RF-TEC, RF-CAT | Formularios y tablas | `/clientes`, `/tecnicos`, `/catalogos` |
| Solicitudes | RF-SOL-01…08 | Registro, listado, detalle, timeline, adjuntos | `/solicitudes`, `/solicitudes/nueva`, `/solicitudes/:id` |
| Operación del técnico | RF-SOL-05/08 | Iniciar, resolver, solicitar info | `/solicitudes/:id` (rol técnico) |
| Dashboard | RF-DASH-01…03 | Gráficos, filtros y “Mi resumen” | `/dashboard` |
| Notificaciones UI | RF-NOT-02 | Badge, toasts y campana | Global |
| Accesibilidad y responsive | NFR-USA-01/02 | Componentes y layout | Global |

### 3.2. Entidades y artefactos de los que soy dueño

- Frontend completo en `apps/web/`.
- Estructura de `packages/shared` (solo yo la modifico); contenido de `auth.ts`, `clients.ts`, `requests.ts`, `notifications.ts`, `dashboard.ts` lo aportan los dueños de cada dominio.
- Manual de usuario.
- No soy dueño de: BD, migraciones, lógica de dominio, SSE backend, OpenAPI ni pipeline.

### 3.3. Archivos y carpetas

- `apps/web/src/app/`.
- `apps/web/src/features/auth/`.
- `apps/web/src/features/clients/`.
- `apps/web/src/features/technicians/`.
- `apps/web/src/features/requests/`.
- `apps/web/src/features/dashboard/`.
- `apps/web/src/features/notifications/`.
- `apps/web/src/components/`.
- `packages/shared/src/` (estructura).
- `apps/web/tests/components/`, `apps/web/tests/ui/`, `apps/web/tests/contract/`.
- `apps/web/e2e/` (selectores y soporte).
- `docs/09-manual-usuario.md`.

## 4. Tareas asignadas

| Semana | Tareas | Entregable |
| :-: | :--- | :--- |
| 1 | T-006 | Paquete `shared`: enums, estados y esquemas Zod. |
| 2 | Apoyo UI y contratos | Revisión de OpenAPI, estructura de features y componentes base. |
| 3 | T-026, T-027, T-028, T-029, T-030, T-031, T-032, T-033, T-034, T-035 | Cliente HTTP, auth UI, rutas protegidas, CRUDs, solicitudes, detalle/timeline, asignación, operación del técnico y componentes de estado. |
| 4 | T-044, T-048 | Cliente SSE, badge/toasts y dashboard UI. |
| 5 | T-054 (parte UI), T-055, T-058 (manual de usuario) | Soporte E2E, responsive/accesibilidad, manual de usuario y defensa. |

### 4.1. Tareas compartidas

- **T-054 E2E:** Cristhian escribe los flujos Playwright; yo mantengo selectores `data-testid`, estados de UI y corrijo defectos visuales.
- **T-058 Manual:** Jared escribe BD; Cristhian escribe despliegue; yo escribo el manual de usuario con capturas.
- **`packages/shared`:** yo apruebo la estructura; Jared revisa nombres de BD; Jeremy revisa enums de dominio; Cristhian aporta notificaciones.

## 5. Pruebas que debo escribir y ejecutar

| Familia | Casos mínimos | Archivo |
| :--- | :--- | :--- |
| `TC-FE` | Componentes base, estados de carga/error/vacío y navegación por rol. | `apps/web/tests/components/` |
| `TC-UI` | Validación de formularios, teclado, foco, responsive 360/768/1280. | `apps/web/tests/ui/` |
| `TC-CON` | Esquemas Zod alineados con OpenAPI; sin `any` en contratos. | `apps/web/tests/contract/` |
| `TC-UI-03` | SSE actualiza badge/toasts sin recargar. | `apps/web/tests/ui/` |
| `TC-ACC` | axe/Lighthouse sin errores críticos. | `apps/web/tests/ui/` |
| `TC-E2E-UI` | Soporte a E2E con `data-testid` estables y corrección de defectos visuales. | `apps/web/e2e/` |

**Regla:** cada formulario tiene prueba de validación y de error de API. Cada ruta protegida tiene prueba de redirección por rol. Cada componente con carga asíncrona tiene estado de carga, error y vacío.

## 6. Handoffs

| Recibo | De | Entrego | A |
| :--- | :--- | :--- | :--- |
| OpenAPI y esquemas compartidos | Jared | Consumo tipado, validación Zod y contratos estables | Jared |
| Contrato de estados/errores de dominio | Jeremy | UI de estados, timeline y acciones por rol | Jeremy |
| Contrato `NotificationEvent` y SSE | Cristhian | Badge, toasts y reconexión en UI | Cristhian |
| Contrato `DashboardIndicators` | Jeremy | Dashboard UI y filtros | Jeremy |
| Selectores y defectos E2E | Cristhian | Correcciones visuales y `data-testid` | Cristhian |
| Manual de usuario | — | Documento con capturas y flujos | Todos |

## 7. Flujo SDD obligatorio

1. Leer RF/NFR y el contrato del endpoint.
2. Actualizar la estructura de `packages/shared` y los esquemas Zod; pedir revisión a Jared/Jeremy.
3. Escribir la prueba de componente o UI que falla.
4. Implementar componente, formulario, ruta o estado.
5. Ejecutar `pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm test:e2e`.
6. Actualizar `09-manual-usuario.md` y trazabilidad.
7. PR con capturas y evidencia; revisión de Cristhian o Jeremy.

## 8. Entregables semanales

- **Semana 1:** `shared` con enums, estados y Zod; estructura de features.
- **Semana 2:** componentes base y contratos revisados.
- **Semana 3:** auth UI, rutas protegidas, CRUDs, solicitudes, detalle/timeline, asignación y operación del técnico.
- **Semana 4:** SSE en UI y dashboard.
- **Semana 5:** soporte E2E, responsive/accesibilidad, manual de usuario y defensa.

## 9. Definition of Done personal

- Ninguna pantalla usa `any` ni datos mock fuera de pruebas.
- Todas las rutas protegidas redirigen según rol.
- Formularios con validación, error de API y estados de carga.
- UI responsive y accesible (teclado, foco, contraste, axe).
- SSE actualiza badge/toasts sin recargar.
- Manual de usuario con capturas reales.
- Puedo explicar y modificar en vivo cualquier pantalla y el paquete `shared`.

## 10. Defensa

Debo demostrar:

1. Login y redirección por rol.
2. Registro de solicitud con validación y adjunto.
3. Listado, filtros, detalle y timeline.
4. Operación del técnico y dashboard.
5. Notificación en vivo por SSE.
6. Revisión responsive y accesibilidad.
