# 10 — Matriz de trazabilidad

**Propósito:** demostrar que cada requisito tiene diseño, contrato, tarea y prueba. Un requisito sin prueba o sin tarea es un hueco de entrega.

## 1. Resumen de cobertura

| Artefacto | Cantidad | Cobertura |
| :--- | :-: | :--- |
| Requisitos funcionales | 35 | 100 % con endpoint y tarea |
| Reglas de negocio | 15 | 100 % con prueba automatizada planificada |
| Requisitos no funcionales | 18 | 100 % con verificación definida |
| Historias de usuario | 12 | 100 % con criterios de aceptación |
| Tareas de implementación | 60 | 100 % vinculadas a épica/requisito |
| Endpoints documentados | 60+ | 100 % con roles y errores |

## 2. Requisitos funcionales → API → pruebas → tareas

### 2.1. Autenticación y usuarios

| RF | Endpoint(s) | Prueba | Tarea |
| :--- | :--- | :--- | :--- |
| RF-AUTH-01 | `POST /auth/login` | Integración login 200/401/403/429 | T-011, T-012 |
| RF-AUTH-02 | `POST /auth/logout` | Integración revocación de refresh | T-012 |
| RF-AUTH-03 | `POST /auth/refresh` | Integración rotación y reutilización | T-013 |
| RF-AUTH-04 | `POST /auth/forgot-password`, `POST /auth/reset-password` | Integración token de un uso, expirado y usado | T-014 |
| RF-AUTH-05 | `GET /auth/me`, `PATCH /auth/me` | Integración perfil propio | T-012 |
| RF-AUTH-06 | `PATCH /auth/me/password` | Integración contraseña actual incorrecta | T-012 |
| RF-USR-01 | `GET/POST /usuarios`, `GET/PATCH/DELETE /usuarios/:id` | Integración CRUD + 403 por rol | T-017 |
| RF-USR-02 | `DELETE /usuarios/:id` | Integración desactivación lógica | T-017 |

### 2.2. Catálogos y recursos

| RF | Endpoint(s) | Prueba | Tarea |
| :--- | :--- | :--- | :--- |
| RF-CLI-01 | `GET/POST /clientes`, `PATCH/DELETE /clientes/:id` | Integración RUC duplicado y entidad en uso | T-018 |
| RF-CLI-02 | `GET/POST /clientes/:id/sedes`, `PATCH/DELETE /sedes/:id` | Integración sede ajena y duplicada | T-018 |
| RF-CLI-03 | `GET/POST /sedes/:id/equipos`, `PATCH /equipos/:id` | Integración equipo por sede | T-018 |
| RF-TEC-01 | `GET/POST /tecnicos`, `GET/PATCH/DELETE /tecnicos/:id` | Integración usuario ya técnico | T-019 |
| RF-TEC-02 | `PUT /tecnicos/:id/especialidades` | Unitarias TC-RN-05; integración sin especialidades | T-019, T-039 |
| RF-CAT-01 | `GET/POST /especialidades`, `PATCH/DELETE /especialidades/:id` | Integración CRUD | T-020 |
| RF-CAT-02 | `GET/POST /categorias-servicio`, `PATCH/DELETE /categorias-servicio/:id` | Integración categoría inactiva | T-020, T-021 |
| RF-CAT-03 | `GET /parametros`, `PUT /parametros/:key` | Integración parámetro auditado | T-020, T-050 |
| RF-CAT-04 | `GET /estados` | Integración catálogo | T-020 |

### 2.3. Solicitudes

| RF | Endpoint(s) | Prueba | Tarea |
| :--- | :--- | :--- | :--- |
| RF-SOL-01 | `POST /solicitudes` | Integración 201, código único, `dueAt` | T-021 |
| RF-SOL-02 | `GET /solicitudes` | Integración paginación, filtros y aislamiento | T-022 |
| RF-SOL-03 | `GET /solicitudes/:id` | Integración detalle y 404 ajeno | T-023 |
| RF-SOL-04 | `PATCH /solicitudes/:id` | Integración versión y campos permitidos | T-023 |
| RF-SOL-05 | `PATCH /solicitudes/:id/estado` | Unitarias TC-RN-01/02/04; integración matriz completa | T-036, T-037 |
| RF-SOL-06 | `POST /solicitudes/:id/reabrir` | Unitarias TC-RN-04; integración reapertura | T-038 |
| RF-SOL-07 | `POST/GET/DELETE /solicitudes/:id/adjuntos` | Integración MIME, tamaño y descarga autorizada | T-049 |
| RF-SOL-08 | `PATCH /solicitudes/:id/estado` (`solicitar_info`, `reanudar`) | Unitarias TC-RN-06 (pausa) | T-037 |
| RF-ASI-01 | `POST /solicitudes/:id/asignaciones` | Unitarias TC-RN-05; integración 201/409 | T-039 |
| RF-ASI-02 | `POST /solicitudes/:id/asignaciones` (reasignación) | Unitarias TC-RN-05-05/06 | T-040 |
| RF-ASI-03 | `GET /tecnicos/:id/carga` | Integración carga vigente | T-039, T-047 |
| RF-AUD-01 | `GET /solicitudes/:id/historial` | Unitarias TC-RN-07; integración orden y 403 | T-041 |

### 2.4. Notificaciones y dashboard

| RF | Endpoint(s) | Prueba | Tarea |
| :--- | :--- | :--- | :--- |
| RF-NOT-01 | Persistencia en transiciones | Integración notificación creada por evento | T-042 |
| RF-NOT-02 | `GET /notificaciones/stream` (SSE) | Integración stream y E2E sin recarga | T-043, T-044 |
| RF-NOT-03 | `GET /notificaciones`, `PATCH /notificaciones/:id/leida`, `POST /leer-todas` | Integración solo propias y marcado | T-042 |
| RF-DASH-01 | `GET /dashboard/indicadores` | Integración agregados reales | T-045, T-047 |
| RF-DASH-02 | `GET /dashboard/carga-tecnicos` | Integración carga y capacidad | T-045, T-047 |
| RF-DASH-03 | `GET /dashboard/indicadores`, `GET /dashboard/evolucion` | Integración SLA, vencidas y rango | T-046, T-047, T-048 |

## 3. Reglas de negocio → prueba → tarea

| RN | Descripción | Caso(s) de prueba | Tarea |
| :--- | :--- | :--- | :--- |
| RN-01 | Cierre con resolución documentada | TC-RN-01-01…04 | T-037 |
| RN-02 | Técnico solo modifica asignadas | TC-RN-02-01…04 | T-037 |
| RN-03 | Cliente solo ve sus registros | TC-RN-03-01…04 | T-022 |
| RN-04 | CERRADA no retrocede sin reapertura | TC-RN-04-01…05 | T-038 |
| RN-05 | Asignación valida especialidad, disponibilidad y carga | TC-RN-05-01…06 | T-039, T-040 |
| RN-06 | SLA calculado en backend | TC-RN-06-01…07 | T-024, T-046 |
| RN-07 | Auditoría de toda transición | TC-RN-07-01…03 | T-037, T-041 |
| RN-08 | Existencia, estado y transacción | TC-RN-08-01…02 | T-023, T-037 |
| RN-09 | Código único e inmutable | Integración `SOL-YYYYMM-#####` | T-021 |
| RN-10 | No eliminar con relaciones activas | Integración `ENTIDAD_EN_USO` | T-018, T-019, T-020 |
| RN-11 | Una asignación vigente por solicitud | Unitarias TC-RN-05-06 | T-040 |
| RN-12 | Una sola asignación vigente a la vez | Integración cierre de anterior | T-040 |
| RN-13 | No asignar técnico inactivo | Unitarias TC-RN-05-03 | T-039 |
| RN-14 | Adjuntos ≤ 10 MB y MIME permitido | Integración `ADJUNTO_INVALIDO` | T-049 |
| RN-15 | Contraseñas seguras y no expuestas | Integración política y salida sin hash | T-011, T-014 |

## 4. Requisitos no funcionales → verificación

| NFR | Verificación | Evidencia |
| :--- | :--- | :--- |
| NFR-SEG-01 | Revisión de hash y respuestas | Prueba + inspección |
| NFR-SEG-02 | Pruebas de expiración, rotación y revocación | Integración auth |
| NFR-SEG-03 | Matriz de autorización + IDOR | T-053 |
| NFR-SEG-04 | Prueba de 6 intentos de login | Integración 429 |
| NFR-SEG-05 | `.env` ignorado y revisión manual antes de publicar | Revisión de repo |
| NFR-SEG-06 | Pruebas de inyección, XSS y CORS | Checklist de seguridad |
| NFR-PERF-01 | Seed 10 000 + medición p95 | Reporte de tiempos |
| NFR-PERF-02 | Dashboard 12 meses | Reporte de tiempos |
| NFR-PERF-03 | E2E SSE en < 5 s | Evidencia E2E |
| NFR-USA-01 | Capturas 360/768/1024/1440 px | T-055 |
| NFR-USA-02 | Lighthouse + checklist teclado/contraste | T-055 |
| NFR-USA-03 | Revisión de mensajes de error | Pruebas de integración |
| NFR-REL-01 | Pruebas de transacción y rollback | TC-RN-07/08 |
| NFR-REL-02 | `/health` con BD arriba/abajo | Integración |
| NFR-MAN-01 | Lint, typecheck y cobertura local | Reporte |
| NFR-DOC-01 | OpenAPI generado y Swagger | Revisión |
| NFR-PORT-01 | Instalación desde cero | Runbook |
| NFR-OBS-01 | Logs con requestId y sin secretos | Revisión de logs |

## 5. Historias de usuario → flujo → evidencia

| US | Flujo principal | Evidencia |
| :--- | :--- | :--- |
| US-01 | Login | Integración + captura |
| US-02 | Recuperación | Integración + correo de prueba |
| US-03 | Clientes y sedes | Integración CRUD |
| US-04 | Técnicos y especialidades | Integración + unitarias asignación |
| US-05 | Registro de solicitud | E2E-01 |
| US-06 | Consulta y filtros | Integración + captura |
| US-07 | Transiciones | Unitarias + integración |
| US-08 | Cierre | TC-RN-01 + E2E-02 |
| US-09 | Asignación | TC-RN-05 + E2E-01 |
| US-10 | Notificaciones SSE | E2E-01 |
| US-11 | Dashboard | Integración + captura |
| US-12 | Auditoría | TC-RN-07 + E2E-02 |

## 6. Cobertura por épica

| Épica | RF cubiertos | Tareas | Pruebas |
| :--- | :--- | :--- | :--- |
| EP-01 Fundaciones | RF-USR, CLI, TEC, CAT | T-002…T-008, T-017…T-020 | Integración CRUD |
| EP-02 Seguridad | RF-AUTH | T-011…T-016 | Integración auth + IDOR |
| EP-03 Solicitudes | RF-SOL-01…04, 07 | T-021…T-023, T-049 | Integración + E2E |
| EP-04 Reglas y SLA | RF-SOL-05/06/08, ASI, AUD | T-024, T-036…T-041, T-050 | TC-RN-01…08 |
| EP-05 Realtime | RF-NOT | T-042…T-044 | Integración SSE + E2E |
| EP-06 Dashboard | RF-DASH | T-045…T-048 | Integración agregados |
| EP-07 Frontend | NFR-USA | T-026…T-035 | E2E + checklist |
| EP-08 Calidad | NFR-* | T-051…T-060 | Pipeline + informe |

## 7. Huecos y supuestos

| Elemento | Estado | Acción |
| :--- | :--- | :--- |
| Endpoint de equipos por sede | Documentado como RF-CLI-03 (`Should`) | Implementar si el tiempo lo permite; no bloquea el MVP. |
| Correo real de recuperación | Opcional | En demo, registrar el enlace en logs de desarrollo. |
| Escalado horizontal de SSE | Fuera del alcance | Documentado en ADR-004; se sustituiría por Redis Pub/Sub. |
| Exportación de reportes | Fuera del alcance | No incluido en el MVP. |
| Firma electrónica | Fuera del alcance | No incluido. |

## 8. Control de cambios

1. Todo nuevo `RF-*` debe agregarse a `01-especificacion.md`, a esta matriz y al contrato API.
2. Todo cambio de regla `RN-*` exige actualizar la prueba correspondiente.
3. Toda tarea nueva recibe ID secuencial y se vincula a una épica.
4. La matriz se revisa al cierre de cada semana; no se acepta una entrega con celdas vacías en requisitos `Must`.
5. El commit que cambia un requisito debe incluir la actualización de los documentos afectados (P-07).
