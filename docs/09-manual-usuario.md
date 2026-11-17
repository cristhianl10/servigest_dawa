# 09 — Manual de usuario

**Aplicación:** ServiGest Ecuador · **Acceso:** navegador web moderno (Chrome, Edge, Firefox) · **Soporte:** coordinador de TI de la empresa.

## 1. Ingreso al sistema

1. Abrir la URL de la aplicación.
2. Escribir correo y contraseña.
3. Pulsar **Iniciar sesión**.
4. El sistema muestra el panel correspondiente al rol.

**Recomendaciones:**

- Usar la opción **¿Olvidaste tu contraseña?** si no recuerda sus credenciales.
- No compartir la contraseña; cada usuario tiene su propia cuenta.
- Cerrar sesión al terminar, especialmente en equipos compartidos.
- Tras 5 intentos fallidos, la cuenta se bloquea temporalmente 15 minutos.

## 2. Roles y qué puede hacer cada uno

| Rol | Enfoque principal |
| :--- | :--- |
| **Cliente** | Registrar solicitudes y seguir su estado. |
| **Técnico** | Atender las solicitudes que tiene asignadas. |
| **Coordinador** | Aprobar, asignar y supervisar el trabajo. |
| **Administrador** | Configurar usuarios, catálogos y parámetros. |

## 3. Cliente

### 3.1. Registrar una solicitud

1. Ir a **Solicitudes → Nueva solicitud**.
2. Seleccionar la **sede** donde ocurre el problema.
3. Seleccionar el **equipo** afectado (opcional si no está registrado).
4. Elegir la **categoría** del servicio.
5. Definir la **prioridad**:
   - **Crítica:** riesgo alto o servicio detenido.
   - **Alta:** afecta la operación.
   - **Media:** molestia controlada.
   - **Baja:** mejora o consulta.
6. Describir el problema con al menos 20 caracteres; incluir síntomas, momento y ubicación.
7. Adjuntar fotos o PDF si ayudan al diagnóstico (máximo 10 MB por archivo).
8. Pulsar **Registrar**.
9. Anotar el código generado, por ejemplo `SOL-202611-00042`.

> La prioridad puede ser ajustada por el coordinador según la evaluación técnica.

### 3.2. Consultar el estado

1. Ir a **Mis solicitudes**.
2. Usar los filtros por estado, prioridad o fecha.
3. Pulsar una solicitud para ver el detalle y la **línea de tiempo**.
4. Revisar la **fecha límite** y la etiqueta **Vencida** si aparece.

### 3.3. Responder a una solicitud de información

Si el estado es **Pendiente de información**:

1. Abrir la solicitud.
2. Leer el comentario del técnico o coordinador.
3. Agregar la información solicitada como comentario o adjunto.
4. El técnico podrá reanudar el trabajo.

### 3.4. Cerrar una solicitud resuelta

1. Abrir la solicitud en estado **Resuelta**.
2. Leer la **resolución documentada**.
3. Si está conforme, pulsar **Cerrar solicitud** y confirmar.
4. Si la falla persiste, pulsar **Solicitar reapertura** y explicar el motivo.

> Una solicitud cerrada no puede modificarse; solo el administrador o coordinador puede reabrirla con justificación.

## 4. Técnico

### 4.1. Ver mi trabajo

1. Ir a **Mi bandeja**.
2. Revisar las solicitudes **Asignadas** y **En proceso**.
3. Usar los filtros de prioridad y vencimiento para ordenar el trabajo.

### 4.2. Iniciar una solicitud

1. Abrir la solicitud asignada.
2. Verificar sede, equipo y descripción.
3. Pulsar **Iniciar trabajo**. El estado cambia a **En proceso**.

### 4.3. Solicitar información

1. Abrir la solicitud.
2. Pulsar **Solicitar información**.
3. Escribir un comentario claro indicando qué falta.
4. El estado cambia a **Pendiente de información** y el plazo se pausa.

### 4.4. Resolver

1. Abrir la solicitud en **En proceso**.
2. Pulsar **Resolver**.
3. Escribir la **resolución** con al menos 30 caracteres: qué se hizo, repuestos, pruebas y recomendaciones.
4. Confirmar. El estado cambia a **Resuelta** y queda disponible para cierre.

> No es posible resolver sin resolución documentada.

### 4.5. Restricciones

- Solo puede ver y modificar solicitudes asignadas a usted.
- No puede aprobar, asignar ni cerrar solicitudes.
- Si una solicitud no aparece, confirme con el coordinador que sigue asignada a su cargo.

## 5. Coordinador

### 5.1. Revisar solicitudes nuevas

1. Ir a **Solicitudes** y filtrar por estado **Registrada**.
2. Abrir la solicitud y validar categoría, prioridad y descripción.
3. Pulsar **Aprobar** o **Cancelar** con motivo.

### 5.2. Asignar un técnico

1. Abrir una solicitud **Aprobada**.
2. Pulsar **Asignar técnico**.
3. El sistema muestra solo técnicos compatibles con la especialidad.
4. Verificar disponibilidad y carga antes de confirmar.
5. Confirmar la asignación.

**Mensajes posibles:**

| Mensaje | Significado |
| :--- | :--- |
| Técnico sin la especialidad requerida | Elegir otro técnico o revisar la categoría. |
| Técnico no disponible | El técnico está inactivo o marcado como no disponible. |
| Carga máxima alcanzada | Elegir otro técnico o ampliar la capacidad. |

### 5.3. Reasignar

1. Abrir la solicitud **Asignada**.
2. Pulsar **Reasignar**.
3. Elegir el nuevo técnico.
4. Escribir el **motivo** de la reasignación (mínimo 10 caracteres).
5. Confirmar. El técnico anterior deja de tener acceso.

### 5.4. Supervisar vencimientos

1. Ir a **Solicitudes** y activar el filtro **Vencidas**.
2. Revisar la fecha límite y la prioridad.
3. Reasignar o escalar según corresponda.
4. Consultar el **Dashboard** para ver el cumplimiento del periodo.

### 5.5. Cerrar una solicitud

1. Abrir una solicitud **Resuelta**.
2. Verificar la resolución documentada.
3. Pulsar **Cerrar** si el cliente confirma conformidad.

### 5.6. Reabrir una solicitud cerrada

1. Abrir la solicitud **Cerrada**.
2. Pulsar **Reabrir**.
3. Escribir el motivo (mínimo 20 caracteres).
4. Confirmar. La solicitud vuelve a **Aprobada** y queda auditada.

## 6. Administrador

### 6.1. Usuarios

1. Ir a **Administración → Usuarios**.
2. Crear usuario con correo, nombre, rol y contraseña temporal.
3. Asignar empresa si el rol es **Cliente**.
4. Desactivar en lugar de eliminar cuando el usuario deje la empresa.
5. No es posible desactivar al último administrador activo.

### 6.2. Clientes y sedes

1. Ir a **Administración → Clientes**.
2. Registrar razón social, RUC, correo y teléfono.
3. Agregar sedes con dirección y contacto.
4. Registrar equipos por sede cuando corresponda.
5. Un cliente con solicitudes activas no puede eliminarse; se desactiva.

### 6.3. Técnicos y especialidades

1. Ir a **Administración → Técnicos**.
2. Vincular un usuario con rol **Técnico**.
3. Asignar al menos una especialidad y su nivel.
4. Definir la carga máxima simultánea.
5. Marcar disponibilidad según la operación.

### 6.4. Catálogos y parámetros

- **Especialidades:** competencias técnicas.
- **Categorías de servicio:** tipo de solicitud y especialidad requerida.
- **Parámetros:** horas de SLA por prioridad, horario laboral y carga máxima por defecto.
- **Feriados:** fechas excluidas del cálculo de plazos.
- Todo cambio de parámetro queda auditado con usuario y fecha.

### 6.5. Auditoría

1. Abrir cualquier solicitud.
2. Ir a la pestaña **Historial**.
3. Revisar usuario, rol, fecha, estado anterior, estado nuevo y comentario.
4. El historial es de solo lectura y no puede editarse ni eliminarse.

## 7. Dashboard

Disponible para **Administrador** y **Coordinador**.

| Indicador | Uso |
| :--- | :--- |
| Solicitudes por estado | Detectar acumulación en aprobación o asignación. |
| Solicitudes por prioridad | Priorizar la carga crítica. |
| Carga por técnico | Balancear asignaciones. |
| Tiempo promedio de resolución | Medir eficiencia operativa. |
| Cumplimiento de SLA | Verificar compromisos. |
| Vencidas | Identificar casos en riesgo. |
| Evolución temporal | Analizar tendencias por día o semana. |

1. Seleccionar el rango de fechas (máximo 366 días).
2. Aplicar filtros de cliente o categoría si se requiere.
3. Leer los indicadores y gráficos.
4. Exportar o capturar la información para reuniones (según disponibilidad).

> El técnico y el cliente tienen una vista **Mi resumen** con solo sus datos.

## 8. Notificaciones

- El ícono de campana muestra el número de notificaciones no leídas.
- Los avisos llegan sin recargar la página.
- Pulsar una notificación para abrir la solicitud relacionada.
- Usar **Marcar todas como leídas** para limpiar el contador.
- Si se pierde la conexión, la aplicación reintenta y recupera las no leídas.

## 9. Estados de una solicitud

| Estado | Significado | Quién lo cambia |
| :--- | :--- | :--- |
| Registrada | Creada por el cliente. | Cliente |
| Aprobada | Aceptada para atención. | Coordinador |
| Asignada | Técnico responsable definido. | Coordinador |
| En proceso | Trabajo en ejecución. | Técnico |
| Pendiente de información | En espera de datos del cliente. | Técnico/Coordinador |
| Resuelta | Trabajo terminado y documentado. | Técnico |
| Cerrada | Conformidad y cierre. | Cliente/Coordinador |
| Cancelada | Anulada con motivo. | Cliente/Coordinador |

## 10. Preguntas frecuentes

**¿Por qué no veo una solicitud?**
Su rol solo permite ver las propias (cliente) o las asignadas (técnico). Confirme con el coordinador.

**¿Puedo cambiar la prioridad?**
El cliente la propone al registrar; el coordinador puede ajustarla.

**¿Qué significa “Vencida”?**
La fecha límite de atención ya pasó y la solicitud sigue abierta.

**¿Puedo editar una solicitud cerrada?**
No. Solicite la reapertura al coordinador.

**¿Por qué no puedo cerrar?**
Debe estar en estado **Resuelta** y tener resolución documentada.

**¿Por qué no me deja asignar un técnico?**
Puede que no tenga la especialidad, esté no disponible o haya alcanzado su carga máxima.

**¿Qué hago si olvidé mi contraseña?**
Use **¿Olvidaste tu contraseña?** en la pantalla de ingreso. El enlace vence en 30 minutos.

**¿La aplicación funciona en el celular?**
Sí, la interfaz es responsiva desde 360 px.

## 11. Buenas prácticas

- Describir el problema con precisión y adjuntar evidencia.
- No duplicar solicitudes; consultar primero el estado.
- Mantener actualizados los datos de contacto y las sedes.
- Revisar las notificaciones al inicio y al final de la jornada.
- Documentar la resolución de forma clara y verificable.
- Cerrar sesión en equipos compartidos.
