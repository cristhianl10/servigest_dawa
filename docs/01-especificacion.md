# 01 — Especificación funcional

**Versión:** 1.0 · **Estado:** aprobada para planificación · **Base:** enunciado oficial del Proyecto Integrador DAWA P1.

## 1. Contexto y problema

ServiGest Ecuador recibe solicitudes de servicio técnico por teléfono, correo y mensajería. El registro disperso provoca duplicidad, demoras, pérdida de trazabilidad y asignaciones ineficientes. Clientes, coordinadores, técnicos y gerencia no comparten una fuente única de verdad.

La solución es una plataforma web full stack que centraliza el ciclo de vida completo de una solicitud, aplica reglas de negocio en el servidor, audita cada cambio y produce indicadores confiables.

## 2. Actores y permisos macro

| Rol | Código | Puede hacer | No puede hacer |
| :--- | :--- | :--- | :--- |
| Administrador | `ADMIN` | Gestionar usuarios, roles, catálogos, parámetros; reabrir; ver todo; auditar | Ejecutar trabajo técnico como si fuera técnico (salvo asignación explícita) |
| Coordinador | `COORDINADOR` | Aprobar, asignar, reasignar, cancelar solicitudes; ver todos los clientes; dashboard operativo | Administrar usuarios ni parámetros del sistema |
| Técnico | `TECNICO` | Ver y actualizar únicamente solicitudes asignadas a su cargo; resolver; pedir información | Ver solicitudes ajenas, asignar, aprobar, cerrar |
| Cliente | `CLIENTE` | Registrar solicitudes, ver y dar seguimiento solo a las de su empresa; confirmar cierre; solicitar reapertura | Ver solicitudes de otras empresas, asignar, cambiar estados internos |

**Autorización:** el backend aplica `deny-by-default`. Además del rol, se valida **propiedad** (cliente dueño del recurso) y **asignación vigente** (técnico). Ver `04-contratos-api.md § 3`.

## 3. Alcance

### 3.1. Dentro del alcance (MVP obligatorio)

- Autenticación, cierre de sesión, recuperación de contraseña y perfil.
- Gestión de usuarios, roles, clientes, sedes, técnicos, especialidades, categorías y parámetros.
- Registro y consulta de solicitudes con adjuntos.
- Máquina de estados completa y auditoría de transiciones.
- Asignación/reasignación validada por especialidad, disponibilidad y carga.
- Cálculo de SLA por prioridad y alertas de vencimiento.
- Notificaciones y una funcionalidad en tiempo real (SSE).
- Dashboard con indicadores calculados desde la base de datos.
- Documentación OpenAPI, pruebas, despliegue reproducible y manuales.

### 3.2. Fuera del alcance (no se implementará)

- Facturación, pagos, contabilidad o nómina.
- Aplicación móvil nativa.
- Firma electrónica certificada.
- Integración con ERP/CRM externos.
- Chat bidireccional entre usuarios.
- Georreferenciación o ruteo en mapa.

## 4. Historias de usuario y criterios de aceptación

Formato: **Como** rol, **quiero** acción, **para** beneficio.

### US-01 · Inicio de sesión (RF-AUTH-01)

**Como** usuario registrado, **quiero** iniciar sesión con correo y contraseña, **para** acceder según mi rol.

- **Dado** un usuario activo con credenciales válidas, **cuando** envía `POST /api/auth/login`, **entonces** recibe `200` con access token, datos de usuario y rol, y la sesión queda registrada.
- **Dado** credenciales inválidas, **cuando** intenta ingresar, **entonces** recibe `401` con mensaje genérico, sin revelar si el correo existe.
- **Dado** un usuario inactivo, **cuando** intenta ingresar, **entonces** recibe `403`.
- **Dado** 5 intentos fallidos en 15 minutos, **cuando** intenta de nuevo, **entonces** recibe `429`.

### US-02 · Recuperación de contraseña (RF-AUTH-04)

**Como** usuario, **quiero** restablecer mi contraseña de forma controlada, **para** recuperar el acceso sin intervención manual.

- **Dado** un correo existente, **cuando** solicita recuperación, **entonces** el sistema responde `202` siempre (no revela existencia) y envía un enlace de un solo uso con vencimiento de 30 minutos.
- **Dado** un token válido y una contraseña que cumple la política, **cuando** confirma, **entonces** cambia la contraseña, invalida sesiones previas y el token no puede reutilizarse.
- **Dado** un token vencido o usado, **cuando** confirma, **entonces** recibe `400` con código `TOKEN_INVALIDO`.

### US-03 · Gestión de clientes y sedes (RF-CLI-01/02)

**Como** administrador, **quiero** registrar clientes con sus sedes, **para** asociar solicitudes a ubicaciones reales.

- **Dado** un cliente con RUC único, **cuando** se crea, **entonces** recibe `201`.
- **Dado** un RUC duplicado, **cuando** se crea, **entonces** recibe `409` con código `CLIENTE_DUPLICADO`.
- **Dado** un cliente con solicitudes activas, **cuando** se intenta eliminar, **entonces** recibe `409` con código `ENTIDAD_EN_USO`; solo se permite desactivar.
- **Dado** una sede sin cliente válido, **cuando** se crea, **entonces** recibe `422`.

### US-04 · Gestión de técnicos y especialidades (RF-TEC-01/02)

**Como** administrador, **quiero** registrar técnicos con especialidades y capacidad máxima, **para** que las asignaciones sean válidas.

- **Dado** un técnico con al menos una especialidad, **cuando** se crea, **entonces** recibe `201` y queda disponible.
- **Dado** un técnico sin especialidades, **cuando** se intenta crear o dejar sin especialidades, **entonces** recibe `422` con código `TECNICO_SIN_ESPECIALIDAD`.
- **Dado** un técnico inactivo o no disponible, **cuando** se intenta asignar, **entonces** recibe `409` con código `TECNICO_NO_DISPONIBLE`.

### US-05 · Registro de solicitud por el cliente (RF-SOL-01)

**Como** cliente, **quiero** registrar una solicitud con categoría, prioridad, sede, equipo y adjuntos, **para** reportar una necesidad formalmente.

- **Dado** datos válidos, **cuando** envía `POST /api/solicitudes`, **entonces** recibe `201` con código único `SOL-AAAAMM-#####`, estado `REGISTRADA`, `fechaCreacion` y `fechaLimite`.
- **Dado** una categoría inactiva o de otra empresa, **cuando** registra, **entonces** recibe `422`.
- **Dado** un archivo mayor a 10 MB o con tipo no permitido, **cuando** adjunta, **entonces** recibe `422` con código `ADJUNTO_INVALIDO`.
- **Dado** el registro exitoso, **entonces** se notifica al cliente y a los coordinadores.

### US-06 · Consulta y filtrado de solicitudes (RF-SOL-02/03)

**Como** coordinador, **quiero** listar y filtrar solicitudes por estado, prioridad, cliente, técnico, categoría y fechas, **para** priorizar el trabajo.

- **Dado** 250 solicitudes, **cuando** consulta sin filtros, **entonces** recibe la primera página (20 por defecto) con `meta.total` y `meta.totalPages`.
- **Dado** el rol `CLIENTE`, **cuando** consulta, **entonces** solo recibe solicitudes de su empresa, aunque intente manipular filtros.
- **Dado** el rol `TECNICO`, **cuando** consulta, **entonces** solo recibe solicitudes con asignación vigente a su cargo.
- **Dado** un filtro de fecha inválido (`desde > hasta`), **entonces** recibe `400`.

### US-07 · Aprobación y transiciones de estado (RF-SOL-05)

**Como** coordinador, **quiero** aprobar y mover solicitudes por el flujo definido, **para** operar el servicio con control.

- **Dado** una solicitud `REGISTRADA`, **cuando** el coordinador la aprueba, **entonces** pasa a `APROBADA` y se registra historial.
- **Dado** una transición no permitida por la máquina de estados, **cuando** se intenta, **entonces** recibe `409` con código `TRANSICION_INVALIDA`.
- **Dado** el rol `TECNICO` sobre una solicitud no asignada, **cuando** intenta cambiar estado, **entonces** recibe `403`.
- **Dado** el estado `CERRADA`, **cuando** se intenta cualquier cambio distinto de reapertura autorizada, **entonces** recibe `409`.

### US-08 · Cierre con resolución documentada (RN-01)

**Como** técnico, **quiero** marcar una solicitud como resuelta y luego cerrarla, **para** dejar evidencia del trabajo.

- **Dado** una solicitud `EN_PROCESO`, **cuando** el técnico la pasa a `RESUELTA`, **entonces** debe enviar `resolucion` de al menos 30 caracteres; si falta, `422`.
- **Dado** una solicitud `RESUELTA` con resolución documentada, **cuando** el cliente o coordinador la cierra, **entonces** pasa a `CERRADA` y se registra fecha de cierre.
- **Dado** una solicitud sin resolución, **cuando** se intenta cerrar, **entonces** recibe `422` con código `RESOLUCION_REQUERIDA`.

### US-09 · Asignación y reasignación (RF-ASI-01/02, RN-05)

**Como** coordinador, **quiero** asignar o reasignar un técnico idóneo, **para** atender la solicitud a tiempo.

- **Dado** un técnico con la especialidad requerida, disponible y con carga menor a su máximo, **cuando** se asigna, **entonces** la solicitud pasa a `ASIGNADA` y se crea la asignación vigente.
- **Dado** un técnico sin la especialidad requerida, **entonces** recibe `409` con código `ESPECIALIDAD_INCOMPATIBLE`.
- **Dado** un técnico con carga igual a su máximo, **entonces** recibe `409` con código `CARGA_EXCEDIDA`.
- **Dado** una reasignación, **cuando** se ejecuta, **entonces** se exige `motivo` (≥ 10 caracteres), se cierra la asignación anterior y se notifica a ambos técnicos.

### US-10 · Seguimiento y notificaciones en tiempo real (RF-NOT-01/02)

**Como** usuario, **quiero** recibir notificaciones sin recargar la página, **para** enterarme de cambios relevantes.

- **Dado** una sesión activa, **cuando** se conecta a `GET /api/notificaciones/stream`, **entonces** recibe eventos SSE con `id`, `event` y `data` JSON.
- **Dado** un cambio de estado o asignación, **entonces** los usuarios afectados reciben la notificación en menos de 5 segundos.
- **Dado** una desconexión, **entonces** el cliente reintenta con backoff y puede recuperar notificaciones no leídas vía API.
- **Dado** el cierre de sesión, **entonces** el stream se cierra y el token deja de ser aceptado.

### US-11 · Dashboard gerencial (RF-DASH-01/03)

**Como** gerente/administrador, **quiero** ver indicadores consolidados filtrables por fecha, **para** tomar decisiones.

- **Dado** un rango de fechas, **cuando** consulta el dashboard, **entonces** recibe: solicitudes por estado, por prioridad, carga por técnico, tiempo promedio de resolución, cumplimiento de SLA, vencidas y evolución temporal.
- **Dado** el rol `TECNICO` o `CLIENTE`, **cuando** consulta, **entonces** solo accede a la vista permitida (técnico: su carga; cliente: sus solicitudes).
- **Dado** un rango sin datos, **entonces** recibe series vacías y totales en cero, nunca `null` ni error.
- **Dado** datos persistidos, **entonces** los indicadores se calculan en SQL, no en el frontend con datos simulados.

### US-12 · Auditoría e historial (RF-AUD-01, RN-07)

**Como** administrador, **quiero** consultar el historial completo de una solicitud, **para** auditar responsabilidades y tiempos.

- **Dado** una solicitud con transiciones, **cuando** consulto `/historial`, **entonces** recibo eventos ordenados cronológicamente con usuario, rol, fecha, estado anterior, estado nuevo, comentario y metadatos.
- **Dado** un intento de modificar o eliminar un evento, **entonces** la API no expone esos métodos (solo lectura).
- **Dado** un usuario sin permiso, **entonces** recibe `403`.

## 5. Requisitos funcionales

### 5.1. Autenticación y usuarios

| ID | Requisito | Prioridad |
| :--- | :--- | :-: |
| RF-AUTH-01 | Login con correo y contraseña, access token y refresh token | Must |
| RF-AUTH-02 | Logout con revocación del refresh token | Must |
| RF-AUTH-03 | Renovación de access token mediante refresh rotativo | Must |
| RF-AUTH-04 | Recuperación y restablecimiento de contraseña con token de un solo uso | Must |
| RF-AUTH-05 | Consulta y actualización del perfil propio | Must |
| RF-AUTH-06 | Cambio de contraseña autenticado | Must |
| RF-USR-01 | CRUD de usuarios con asignación de rol y estado | Must |
| RF-USR-02 | Activación/desactivación de usuarios sin borrado físico | Must |

### 5.2. Catálogos y recursos

| ID | Requisito | Prioridad |
| :--- | :--- | :-: |
| RF-CLI-01 | CRUD de clientes con validación de RUC único | Must |
| RF-CLI-02 | CRUD de sedes por cliente | Must |
| RF-CLI-03 | CRUD de equipos/recursos por sede | Should |
| RF-TEC-01 | CRUD de técnicos vinculados a un usuario | Must |
| RF-TEC-02 | Asociación de especialidades y nivel por técnico | Must |
| RF-CAT-01 | CRUD de especialidades | Must |
| RF-CAT-02 | CRUD de categorías de servicio con especialidad y prioridad sugerida | Must |
| RF-CAT-03 | CRUD de parámetros operativos (SLA por prioridad, carga máxima por defecto) | Must |
| RF-CAT-04 | Consulta de estados del flujo | Must |

### 5.3. Solicitudes y operación

| ID | Requisito | Prioridad |
| :--- | :--- | :-: |
| RF-SOL-01 | Registrar solicitud con código único, categoría, prioridad, sede, equipo y descripción | Must |
| RF-SOL-02 | Listar solicitudes con paginación y filtros por rol | Must |
| RF-SOL-03 | Consultar detalle con asignación vigente e historial resumido | Must |
| RF-SOL-04 | Editar datos permitidos según estado y rol | Must |
| RF-SOL-05 | Ejecutar transiciones válidas de estado con validaciones | Must |
| RF-SOL-06 | Reabrir solicitud cerrada con autorización y justificación | Must |
| RF-SOL-07 | Adjuntar archivos con validación de tipo y tamaño | Must |
| RF-SOL-08 | Solicitar información adicional (estado `PENDIENTE_INFO`) | Should |
| RF-ASI-01 | Asignar técnico validando especialidad, disponibilidad y carga | Must |
| RF-ASI-02 | Reasignar con motivo obligatorio y auditoría | Must |
| RF-ASI-03 | Consultar carga actual por técnico | Must |
| RF-AUD-01 | Consultar historial inmutable por solicitud | Must |

### 5.4. Notificaciones y analítica

| ID | Requisito | Prioridad |
| :--- | :--- | :-: |
| RF-NOT-01 | Generar notificaciones por registro, asignación, cambio de estado, solicitud de información y cierre | Must |
| RF-NOT-02 | Entregar notificaciones en tiempo real por SSE | Must |
| RF-NOT-03 | Listar y marcar notificaciones como leídas | Must |
| RF-DASH-01 | Indicadores de solicitudes por estado y prioridad | Must |
| RF-DASH-02 | Carga por técnico y tiempos promedio de resolución | Must |
| RF-DASH-03 | Cumplimiento de SLA, vencimientos y evolución temporal con filtros de fecha | Must |

## 6. Reglas de negocio

| ID | Regla | Implementación esperada |
| :-- | :--- | :--- |
| RN-01 | No se cierra una solicitud sin resolución documentada. | Validación en service + restricción de transición; `resolucion` ≥ 30 caracteres. |
| RN-02 | Un técnico solo modifica solicitudes autorizadas y asignadas a su cargo. | Verificación de asignación vigente en cada operación protegida. |
| RN-03 | Un cliente solo consulta sus propios registros. | Filtro obligatorio por `client_id` derivado del token, nunca del request. |
| RN-04 | Una solicitud cerrada no retrocede sin reapertura autorizada y auditada. | `CERRADA` solo permite `REABRIR` (ADMIN/COORDINADOR, motivo obligatorio). |
| RN-05 | La asignación valida especialidad, disponibilidad y carga. | Ver `07-implementacion.md § 4`; errores `409` específicos. |
| RN-06 | Plazos y cumplimiento se calculan en el backend con reglas explícitas. | Servicio SLA con calendario laboral y pausas; nunca en el cliente. |
| RN-07 | Toda transición genera auditoría con usuario, fecha y cambio. | Inserción en `request_history` dentro de la misma transacción. |
| RN-08 | Las actualizaciones validan existencia, estado y coherencia transaccional. | Transacciones + bloqueo optimista con `version`; `409` en conflicto. |
| RN-09 | El código de solicitud es único e inmutable. | Secuencia anual + restricción `UNIQUE`. |
| RN-10 | No se eliminan entidades con relaciones activas. | `ON DELETE RESTRICT` o desactivación lógica; `409 ENTIDAD_EN_USO`. |
| RN-11 | Un técnico no puede tener dos asignaciones vigentes para la misma solicitud. | Índice parcial único. |
| RN-12 | Una solicitud solo puede tener una asignación vigente a la vez. | Cierre de la anterior en la misma transacción. |
| RN-13 | No se puede asignar un técnico inactivo o no disponible. | Validación previa + restricción de estado. |
| RN-14 | El adjunto no puede superar 10 MB ni usar tipos no permitidos. | Validación de MIME y tamaño en servidor; almacenamiento fuera del webroot. |
| RN-15 | Las contraseñas cumplen política y nunca se devuelven en respuestas. | Zod + argon2id; `select` explícito sin `password_hash`. |

### 6.1. Definición operativa del SLA

| Prioridad | Plazo (horas laborables) |
| :--- | :-: |
| `CRITICA` | 4 |
| `ALTA` | 8 |
| `MEDIA` | 24 |
| `BAJA` | 72 |

- Calendario: lunes a viernes, 08:00–17:00 con 1 hora de almuerzo no laborable (13:00–14:00, totalizando 8 horas laborables efectivas por día), zona `America/Guayaquil`; excluye feriados configurados.
- El reloj inicia en `created_at`.
- El tiempo en `PENDIENTE_INFO` se acumula como pausa y extiende la fecha límite.
- `fechaLimite` se recalcula al cambiar prioridad y al reanudar desde pausa.
- Una solicitud está **vencida** cuando `now > fechaLimite` y su estado no es `RESUELTA`, `CERRADA` ni `CANCELADA`.
- **Cumplimiento:** porcentaje de solicitudes resueltas/cerradas con `resolved_at <= fechaLimite` dentro del rango consultado.
- Los parámetros de SLA son configurables por `ADMIN` (RF-CAT-03).

## 7. Requisitos no funcionales

| ID | Categoría | Requisito verificable |
| :--- | :--- | :--- |
| NFR-SEG-01 | Seguridad | Contraseñas con argon2id/bcrypt ≥ 12; nunca en logs ni respuestas. |
| NFR-SEG-02 | Seguridad | JWT firmado, access 15 min, refresh 7 días con rotación y revocación. |
| NFR-SEG-03 | Seguridad | Autorización por rol + propiedad en el 100 % de rutas privadas. |
| NFR-SEG-04 | Seguridad | Rate limit en login (5/15 min) y endpoints sensibles. |
| NFR-SEG-05 | Seguridad | Secretos solo por variables de entorno; `.env` fuera del repo. |
| NFR-SEG-06 | Seguridad | Protección contra inyección SQL (ORM parametrizado), XSS (escape) y CSRF (SameSite + CORS restringido). |
| NFR-PERF-01 | Rendimiento | Listados paginados: p95 < 500 ms con 10 000 solicitudes y filtros indexados. |
| NFR-PERF-02 | Rendimiento | Dashboard: p95 < 1 500 ms para rangos de hasta 12 meses. |
| NFR-PERF-03 | Rendimiento | Notificación SSE entregada en < 5 s desde el evento. |
| NFR-USA-01 | Usabilidad | Interfaz responsiva desde 360 px; estados de carga, error y vacío en toda vista de datos. |
| NFR-USA-02 | Accesibilidad | WCAG 2.1 AA: contraste, foco visible, etiquetas, navegación por teclado. |
| NFR-USA-03 | Usabilidad | Mensajes de error accionables en español, sin filtrar detalles internos. |
| NFR-REL-01 | Fiabilidad | Integridad transaccional en transiciones, asignaciones y auditoría. |
| NFR-REL-02 | Fiabilidad | Healthcheck `GET /api/health` con estado de API y BD. |
| NFR-MAN-01 | Mantenibilidad | Capas separadas, TypeScript estricto, lint sin errores, cobertura ≥ 80 % en dominio/services. |
| NFR-DOC-01 | Documentación | OpenAPI actualizada y accesible en `/api/docs`. |
| NFR-PORT-01 | Portabilidad | Ejecución local reproducible en Linux/macOS/Windows con Docker. |
| NFR-OBS-01 | Observabilidad | Logs estructurados con `requestId`; errores 5xx registrados con contexto. |

## 8. Criterios de aceptación del MVP

El proyecto se considera funcionalmente completo cuando:

1. Los cuatro roles inician sesión y solo ven lo autorizado.
2. Un cliente registra una solicitud y la ve en su listado.
3. Un coordinador la aprueba, asigna un técnico válido y el técnico la atiende.
4. El técnico la resuelve con resolución documentada y el cliente la cierra.
5. Cada transición aparece en el historial con usuario y fecha.
6. Una asignación inválida es rechazada con un código de error específico.
7. El dashboard refleja los datos reales y responde a filtros de fecha.
8. Una notificación llega por SSE sin recargar la página.
9. La suite de pruebas (unitarias, integración y E2E) está en verde.
10. La aplicación se despliega desde cero siguiendo `08-despliegue.md`.

## 9. Supuestos y decisiones a ratificar

| ID | Supuesto | Impacto si cambia |
| :--- | :--- | :--- |
| S-01 | Un cliente es una empresa con uno o más usuarios asociados. | Modelo de `clients` + `users.client_id`. |
| S-02 | El SLA se mide en horas laborables, no calendario. | Servicio de cálculo y pruebas. |
| S-03 | La prioridad la define el cliente al registrar y el coordinador puede ajustarla. | Permiso y auditoría de cambio. |
| S-04 | El cierre lo puede confirmar el cliente o el coordinador. | Matriz de autorización. |
| S-05 | El técnico no cierra; solo resuelve. | Flujo `RESUELTA → CERRADA`. |
| S-06 | Los adjuntos se almacenan en disco local en desarrollo y en almacenamiento de objetos en producción. | Adaptador de almacenamiento. |
| S-07 | Se notifica por SSE; el correo es opcional y no bloqueante. | Alcance de notificaciones. |
| S-08 | Un usuario tiene un solo rol. | Modelo simple de RBAC. |

## 10. Glosario de estados

| Estado | Significado | Responsable de la transición |
| :--- | :--- | :--- |
| `REGISTRADA` | Solicitud creada por el cliente. | Cliente |
| `APROBADA` | Aceptada para atención. | Coordinador |
| `ASIGNADA` | Técnico asignado. | Coordinador |
| `EN_PROCESO` | Técnico trabajando. | Técnico |
| `PENDIENTE_INFO` | En espera de información del cliente. | Técnico/Coordinador |
| `RESUELTA` | Trabajo terminado con resolución documentada. | Técnico |
| `CERRADA` | Conformidad y cierre. | Cliente/Coordinador |
| `CANCELADA` | Anulada con motivo. | Cliente/Coordinador |
