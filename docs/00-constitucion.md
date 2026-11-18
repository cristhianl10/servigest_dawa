# 00 — Constitución del proyecto

> Documento normativo. Toda decisión de diseño o código que contradiga esta constitución debe justificarse mediante un `ADR` y actualizar este archivo.

## 1. Principios no negociables

| ID | Principio | Implicación práctica |
| :-- | :--- | :--- |
| P-01 | **El servidor es la autoridad** | Validaciones, reglas de negocio, cálculo de plazos y permisos se ejecutan en el backend. El frontend solo refleja y anticipa errores. |
| P-02 | **API-first** | Ningún endpoint se implementa sin contrato documentado en `04-contratos-api.md` y en OpenAPI. |
| P-03 | **Auditoría inmutable** | Toda transición de estado y reasignación genera un registro de historial que no se actualiza ni se elimina. |
| P-04 | **Seguridad por defecto** | Rutas privadas por defecto; acceso denegado salvo autorización explícita. Sin secretos en el repositorio. |
| P-05 | **Reproducibilidad** | Cualquier integrante levanta el sistema con `docker compose up` + migraciones + seed. |
| P-06 | **Trazabilidad** | Cada cambio de código referencia un `RF-*`, `RN-*` o `T-*`. Cada regla crítica tiene prueba automatizada. |
| P-07 | **Documentación viva** | El documento se actualiza en el mismo commit que el código que lo invalida. |
| P-08 | **Responsabilidad individual verificable** | Commits atómicos, autoría real y defensa individual de todo el código del equipo. |

## 2. Stack tecnológico ratificado

### 2.1. Frontend

| Componente | Tecnología | Motivo |
| :--- | :--- | :--- |
| Framework | React 18+ con TypeScript | Requisito del curso y tipado de contratos. |
| Build | Vite | Arranque rápido y configuración mínima. |
| Ruteo | React Router v6 | Rutas protegidas y layouts por rol. |
| Estado remoto | TanStack Query | Caché, reintentos, estados de carga/error. |
| Formularios | React Hook Form + Zod | Validación declarativa y mensajes accesibles. |
| Estilos | Tailwind CSS o CSS Modules | Consistencia y rapidez; se elige una sola opción. |
| Pruebas | Vitest + Testing Library; Playwright para E2E | Unitarias de componentes y flujos completos. |

### 2.2. Backend

| Componente | Tecnología | Motivo |
| :--- | :--- | :--- |
| Runtime | Node.js 20 LTS | Requisito del curso. |
| Framework | Express 4 + TypeScript | Curva baja, control explícito de capas y middleware. |
| Validación | Zod | Esquemas compartibles con el frontend vía `packages/shared`. |
| ORM | Prisma | Migraciones reproducibles, tipado y transacciones. |
| Autenticación | JWT de acceso + refresh token rotativo | Estándar, sin estado en el servidor para el access token. |
| Hash | argon2id (o bcrypt coste ≥ 12) | Hash seguro de contraseñas. |
| Documentación | OpenAPI 3.1 + Swagger UI | Entregable obligatorio. |
| Tiempo real | Server-Sent Events (SSE) | Menor complejidad que WebSocket y suficiente para notificaciones unidireccionales. |
| Pruebas | Vitest + Supertest; Testcontainers opcional | Unitarias e integración contra PostgreSQL real. |

### 2.3. Datos e infraestructura

| Componente | Tecnología |
| :--- | :--- |
| Base de datos | PostgreSQL 16 |
| Migraciones | Prisma Migrate (`prisma migrate deploy` en despliegue) |
| Contenedores | Docker + Docker Compose |
| Despliegue | API en Render/Railway/Fly.io; web estática en Vercel/Netlify; PostgreSQL gestionado |

> **ADR-001:** se elige Express sobre NestJS para mantener el proyecto comprensible y defendible por los cuatro integrantes, aplicando una separación de capas explícita (routes → controllers → services → repositories). Ver `03-arquitectura.md`.

## 3. Estructura del repositorio

```
cf/
├── apps/
│   ├── api/                  # Backend Express + TypeScript
│   └── web/                  # Frontend React + Vite
├── packages/
│   └── shared/               # Tipos, enums, esquemas Zod y constantes
├── docs/                     # Esta documentación
├── docker-compose.yml
├── pnpm-workspace.yaml
└── .env.example
```

### 3.1. Capas del backend (obligatorias)

```
presentation  → routes, controllers, middlewares, DTO Zod
application   → services / casos de uso, transacciones
domain        → entidades, reglas, máquina de estados, cálculo SLA
infrastructure→ repositorios Prisma, SSE, correo, almacenamiento
```

Reglas:

- Un controller **no** contiene reglas de negocio ni consultas SQL.
- Un service **no** conoce `req`/`res` de Express.
- Un repositorio **no** decide permisos ni transiciones.
- El frontend **nunca** importa Prisma ni accede a la base de datos.

## 4. Convenciones de código

### 4.1. Nombres

| Elemento | Convención | Ejemplo |
| :--- | :--- | :--- |
| Archivos TS | `kebab-case` con sufijo de rol | `requests.service.ts`, `request-status.machine.ts` |
| Componentes React | `PascalCase.tsx` | `RequestTable.tsx` |
| Variables y funciones | `camelCase` | `calculateDueDate` |
| Tipos e interfaces | `PascalCase` | `RequestDetail` |
| Tablas y columnas SQL | `snake_case` | `request_assignments`, `created_at` |
| Rutas API | `kebab-case`, plural, en español | `/api/solicitudes/:id/historial` |
| Variables de entorno | `UPPER_SNAKE_CASE` | `DATABASE_URL` |

### 4.2. API

- JSON en `camelCase` en el transporte; la BD usa `snake_case` (mapeo en Prisma).
- Fechas en ISO 8601 con zona: `2026-11-15T14:30:00-05:00`.
- Identificadores públicos: UUID v4 (los internos pueden ser numéricos, pero la API expone UUID).
- Paginación por `page` y `pageSize` (máximo 100).
- Errores con estructura única `{ error: { code, message, details?, requestId } }`.

### 4.3. Git

| Rama | Uso |
| :--- | :--- |
| `master` | Rama default, siempre desplegable; protegida. |
| `dev/<integrante>` | Rama personal de cada integrante; PR a `master`. |
| `feat/<tarea>-<descripcion>` | Funcionalidades grandes (opcional). |
| `fix/<tarea>-<descripcion>` | Correcciones. |
| `docs/<descripcion>` | Documentación. |

Formato de commit: `tipo(alcance): descripción [T-###]`

```
feat(solicitudes): validar transición a cerrada [T-031]
test(rn-04): impedir retroceso de solicitud cerrada [T-048]
docs(api): documentar reapertura auditada [T-010]
```

Tipos permitidos: `feat`, `fix`, `test`, `docs`, `refactor`, `chore`, `perf`.

### 4.4. Calidad

- `pnpm lint` y `pnpm typecheck` obligatorios antes de cada push.
- Cobertura mínima: **80 %** en `services` y `domain`; no se exige cobertura de UI.
- Sin `console.log` en código de producción; se usa un logger estructurado (`pino`).
- Sin secretos ni credenciales en el repositorio; solo `.env.example`.

## 5. Definition of Done (DoD)

Una tarea se considera terminada cuando:

1. El código respeta las capas y convenciones.
2. Está vinculada a un `RF-*`/`RN-*` y su contrato API está actualizado.
3. Tiene pruebas automatizadas del camino positivo y al menos un negativo cuando aplica.
4. Pasa `lint`, `typecheck`, pruebas y build en local.
5. No introduce datos sensibles en logs ni respuestas.
6. La documentación afectada (spec, API, modelo, manual) está actualizada.
7. Fue revisada por al menos otro integrante (pull request aprobado).
8. El commit es atómico y trazable a la tarea.

## 6. Puertas de calidad (quality gates)

| Momento | Puerta |
| :--- | :--- |
| Pull request | Lint + typecheck + pruebas + revisión de un par |
| Cierre de semana 2 | API de autenticación, solicitudes y asignaciones operativa con Swagger |
| Cierre de semana 4 | Flujos completos integrados, dashboard real y notificaciones SSE |
| Entrega final | Despliegue reproducible, suite de pruebas en verde, manuales y video |

## 7. Gestión de riesgos

| Riesgo | Impacto | Mitigación |
| :--- | :--- | :--- |
| Alcance excesivo del dashboard | Alto | Indicadores congelados en `01-especificacion.md`; se implementan primero los 6 obligatorios. |
| Reglas de estado ambiguas | Alto | Máquina de estados formal en `02-modelo-dominio.md` y pruebas por transición. |
| Diferencias entre ambientes | Medio | Docker, `.env.example` y migraciones versionadas. |
| Pérdida de trazabilidad individual | Alto | Ramas por tarea, commits con ID y bitácora de aportes en `06-tareas.md`. |
| Dependencia de un solo integrante | Alto | Rotación de revisores y sesiones de defensa interna semanales. |
| Fuga de secretos | Alto | `.gitignore`, revisión manual antes de publicar y rotación de credenciales. |

## 8. Política de cambios

1. Todo cambio de alcance requiere actualizar `01-especificacion.md` y la matriz de trazabilidad.
2. Todo cambio de contrato requiere versionarlo en `04-contratos-api.md` y avisar al frontend.
3. Todo cambio de esquema requiere migración reproducible y actualización de `02-modelo-dominio.md`.
4. Todo cambio arquitectónico requiere un `ADR` con contexto, decisión y consecuencias.

## 9. Registro de decisiones (ADR)

| ID | Decisión | Estado |
| :--- | :--- | :--- |
| ADR-001 | Express + capas explícitas en lugar de NestJS | Propuesta |
| ADR-002 | PostgreSQL + Prisma | Propuesta |
| ADR-003 | JWT de acceso (15 min) + refresh rotativo (7 días) | Propuesta |
| ADR-004 | SSE para notificaciones en tiempo real | Propuesta |
| ADR-005 | Monorepo con paquete `shared` de contratos Zod | Propuesta |
| ADR-006 | Estados como catálogo en BD + máquina de estados en dominio | Propuesta |
| ADR-007 | Auditoría en tabla append-only sin `UPDATE`/`DELETE` | Propuesta |
| ADR-008 | Cálculo de SLA en horas laborables con pausa por `PENDIENTE_INFO` | Propuesta |
