# Equipo — documentos específicos por integrante

Este directorio deriva de [`../11-plan-equipo.md`](../11-plan-equipo.md) y de los documentos generales del proyecto. Cada archivo define el alcance exacto, los artefactos, las tareas, las pruebas y los entregables de un integrante. Si hay contradicción, prevalece el documento general y se corrige este archivo en el mismo PR.

## Integrantes y rol

| Documento | Integrante | Código | Rol | Rama |
| :--- | :--- | :-: | :--- | :--- |
| [`01-jared-ochoa.md`](01-jared-ochoa.md) | Jared Ochoa | JAR | Base de datos / backend core / seguridad | `dev/jared` |
| [`02-jeremy-marquez.md`](02-jeremy-marquez.md) | Jeremy Marquez | JER | Backend de dominio | `dev/jeremy` |
| [`03-cristhian-loor.md`](03-cristhian-loor.md) | Cristhian Loor | CRI | Full stack / QA / despliegue | `dev/cristhian` |
| [`04-neil-goyes.md`](04-neil-goyes.md) | Neil Goyes | NEI | Frontend | `dev/neil` |

## Documentos generales de lectura obligatoria

Todos leen, antes de su primera tarea:

1. [`../00-constitucion.md`](../00-constitucion.md) — stack, reglas y Definition of Done.
2. [`../01-especificacion.md`](../01-especificacion.md) — RF, RN, NFR e historias.
3. [`../02-modelo-dominio.md`](../02-modelo-dominio.md) — entidades, estados, SLA e invariantes.
4. [`../03-arquitectura.md`](../03-arquitectura.md) — capas, ADR y estructura.
5. [`../04-contratos-api.md`](../04-contratos-api.md) — endpoints, errores y OpenAPI.
6. [`../05-pruebas.md`](../05-pruebas.md) — estrategia y casos `TC-*`.
7. [`../06-tareas.md`](../06-tareas.md) — backlog `T-*` y cronograma.
8. [`../10-trazabilidad.md`](../10-trazabilidad.md) — RF/RN ↔ API ↔ prueba ↔ tarea.
9. [`../11-plan-equipo.md`](../11-plan-equipo.md) — RACI, handoffs y reglas de integración.

Lectura adicional según rol: [`../07-implementacion.md`](../07-implementacion.md), [`../08-despliegue.md`](../08-despliegue.md) y [`../09-manual-usuario.md`](../09-manual-usuario.md).

## Reglas comunes

- **SDD obligatorio:** especificación → contrato → prueba que falla → implementación → evidencia → trazabilidad. No se implementa nada que no esté en `01`, `02` o `04`.
- **Una rama por integrante:** `dev/jared`, `dev/jeremy`, `dev/cristhian`, `dev/neil`. PR a `master`; prohibido commit directo a `master`.
- **Dueño único por artefacto:** solo Jared genera/mergea migraciones Prisma; solo Neil modifica la estructura de `packages/shared`; solo Jared consolida OpenAPI; los cambios de contrato requieren dos revisores.
- **Pruebas propias:** cada integrante escribe y ejecuta las pruebas de su módulo. Ningún PR se aprueba sin pruebas y sin revisión cruzada.
- **Evidencia:** cada PR incluye comandos ejecutados, salida resumida de pruebas y enlace al caso `TC-*` o tarea `T-*`.
- **Defensa individual:** cada integrante debe explicar su módulo, ejecutar una prueba en vivo y modificar cualquier módulo ajeno con ayuda del dueño.
- **Prohibido:** `any` en contratos, lógica de negocio en controladores, SQL fuera de `dashboard`, secretos en el repositorio y merges sin revisión.

## Handoffs compartidos

| Artefacto | Dueño | Colaboradores | Regla |
| :--- | :--- | :--- | :--- |
| `packages/shared` | Neil | Jared (nombres DB), Jeremy (enums de dominio), Cristhian (notificaciones) | Solo Neil cambia la estructura; cada dueño agrega su archivo. |
| OpenAPI | Jared | Dueño de cada endpoint, Neil | Jared consolida; cambios de contrato con dos revisores. |
| `schema.prisma` y migraciones | Jared | Jeremy propone cambios | Jared genera y mergea migraciones. |
| SSE | Cristhian | Jeremy (eventos), Neil (UI) | Jeremy emite eventos; Cristhian entrega; Neil consume. |
| Dashboard | Jeremy (SQL/API) + Neil (UI) | Jared (índices), Cristhian (pruebas) | Contrato `DashboardIndicators` lo define Jeremy. |
| E2E | Cristhian | Neil (selectores/UI) | Playwright en el entorno de verificación local; Neil corrige defectos visuales. |
| Manuales | Jared / Cristhian / Neil | Jeremy (revisión) | Jared: BD; Cristhian: despliegue; Neil: usuario. |

## Criterio de cierre por integrante

Un integrante termina cuando:

1. Sus tareas `T-*` están en `Hecho` con PR aprobado.
2. Sus pruebas `TC-*` pasan en el entorno de verificación y tienen evidencia.
3. Sus artefactos están enlazados desde `10-trazabilidad.md`.
4. Su documento específico está actualizado.
5. Puede ejecutar y explicar su módulo en la defensa.
