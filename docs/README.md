# ServiGest Ecuador — Documentación SDD

Documentación de especificación, diseño e implementación del **Proyecto Integrador DAWA P1**.

Este repositorio de documentación aplica **Spec-Driven Development (SDD)**: primero se define *qué* se construye y *por qué*, luego *cómo* se construye, después *qué tareas* lo materializan y, finalmente, *cómo se verifica*. El código debe poder trazarse hasta un requisito, una regla de negocio y una prueba.

## Orden de lectura

| # | Documento | Propósito | Audiencia |
| :-: | :--- | :--- | :--- |
| 00 | [Constitución](00-constitucion.md) | Principios, stack, convenciones y Definition of Done | Todo el equipo |
| 01 | [Especificación funcional](01-especificacion.md) | Alcance, actores, historias de usuario, RF, RN y NFR | Equipo + docente |
| 02 | [Modelo de dominio](02-modelo-dominio.md) | Entidades, relaciones, estados, SLA e invariantes | Backend + DB |
| 03 | [Arquitectura](03-arquitectura.md) | Capas, estructura del monorepo, flujos y ADR | Todo el equipo |
| 04 | [Contratos API](04-contratos-api.md) | Endpoints, payloads, errores, paginación y OpenAPI | Backend + Frontend |
| 05 | [Plan de pruebas](05-pruebas.md) | Estrategia, casos, matriz de autorización y evidencias | QA + Todo el equipo |
| 06 | [Backlog de tareas](06-tareas.md) | Épicas, tareas, responsables, cronograma y dependencias | Todo el equipo |
| 07 | [Guías de implementación](07-implementacion.md) | Algoritmos y lineamientos por módulo | Backend + Frontend |
| 08 | [Despliegue y operación](08-despliegue.md) | Ambientes, variables, Docker, CI/CD y runbook | DevOps |
| 09 | [Manual de usuario](09-manual-usuario.md) | Uso por rol y resolución de dudas | Usuarios finales |
| 10 | [Matriz de trazabilidad](10-trazabilidad.md) | Requisito ↔ API ↔ prueba ↔ tarea | Docente + equipo |
| 11 | [Plan de equipo y ownership](11-plan-equipo.md) | División por integrante, dueños de datos, contratos y handoffs | Todo el equipo |

## Flujo SDD del equipo

```
Especificar (01) → Planificar (02–04) → Descomponer (06) → Implementar (07)
        ↑                                                        ↓
        └──────────── Verificar (05) y trazar (10) ←──────────────┘
```

1. **Specify:** toda funcionalidad nace como requisito `RF-*` con criterios de aceptación verificables.
2. **Plan:** se documenta el impacto en modelo de datos, arquitectura y contratos API antes de escribir código.
3. **Tasks:** cada requisito se descompone en tareas `T-*` con responsable y Definition of Done.
4. **Implement:** se sigue la guía del módulo y se respetan las convenciones de la constitución.
5. **Verify:** cada regla de negocio tiene al menos una prueba automatizada; la matriz de trazabilidad no debe tener huecos.
6. **Cambios:** si cambia un requisito, se actualizan en el mismo commit la especificación, el contrato API, la tarea y la prueba.

## Convenciones de identificadores

| Prefijo | Significado | Ejemplo |
| :--- | :--- | :--- |
| `RF-*` | Requisito funcional | `RF-SOL-03` |
| `RN-*` | Regla de negocio | `RN-04` |
| `NFR-*` | Requisito no funcional | `NFR-SEG-02` |
| `US-*` | Historia de usuario | `US-05` |
| `T-*` | Tarea de implementación | `T-024` |
| `TC-*` | Caso de prueba | `TC-RN-04-01` |
| `ADR-*` | Decisión de arquitectura | `ADR-003` |

## Estado del proyecto

| Fase SDD | Estado |
| :--- | :--- |
| Especificación | Completada (v1.0) |
| Plan técnico | Completado (v1.0) |
| Tareas | Completadas (v1.0) |
| Implementación | Pendiente |
| Pruebas | Planificadas |
| Despliegue | Planificado |

## Decisiones abiertas

Las siguientes decisiones están **propuestas** y deben ratificarse en la primera reunión técnica (ver `01-especificacion.md § 9`):

- Stack concreto: React + Vite + TypeScript; Node.js + Express + TypeScript; PostgreSQL + Prisma.
- Canal en tiempo real: SSE en lugar de WebSocket.
- Monorepo con `pnpm workspaces` y paquete `shared` para contratos Zod.
- Calendario laboral: lunes a viernes, 08:00–17:00, zona `America/Guayaquil`.

## Glosario mínimo

- **Solicitud:** unidad de trabajo que representa una necesidad de servicio técnico de un cliente.
- **Sede:** ubicación física de un cliente donde se ejecuta el servicio.
- **Asignación:** vínculo vigente entre una solicitud y un técnico responsable.
- **SLA:** plazo comprometido de atención medido en horas laborables según prioridad.
- **Transición:** cambio de estado validado por la máquina de estados y registrado en auditoría.
- **Reapertura:** acción autorizada que devuelve una solicitud cerrada a un estado operable.
- **Carga de trabajo:** cantidad de solicitudes activas asignadas a un técnico.
