# UNIVERSIDAD DE GUAYAQUIL
## FACULTAD DE CIENCIAS MATEMÁTICAS Y FÍSICAS
### CARRERA DE SOFTWARE
**DESARROLLO DE APLICACIONES WEB AVANZADO**

**PROYECTO PRIMER PARCIAL**  
**Desarrollo de una plataforma web para la gestión de solicitudes de servicios, asignación de recursos y seguimiento operativo empresarial**

| Característica | Definición |
| :--- | :--- |
| Nivel de dificultad | Alto |
| Modalidad | Grupal: 4 estudiantes |
| Tipo de solución | Full stack con frontend, backend, API REST y base de datos |
| Tecnologías base | React, Node.js, base de datos relacional y servicios REST |
| Producto final | Aplicación integrada, operativa, probada, desplegada y documentada |

---

## 1. Problemática
ServiGest Ecuador es una empresa ficticia que ofrece servicios técnicos y mantenimiento a organizaciones de Guayaquil. Recibe solicitudes por llamadas, correos y mensajería, lo que ocasiona duplicidad de registros, retrasos, seguimiento deficiente y dificultad para asignar técnicos según especialidad y disponibilidad.

Los clientes desconocen el estado de sus solicitudes, los coordinadores no visualizan la carga de trabajo en tiempo real y la gerencia carece de indicadores confiables sobre tiempos de atención, productividad y cumplimiento de compromisos. La empresa requiere una solución integrada que organice sus operaciones y permita tomar decisiones basadas en datos.

---

## 2. Solución propuesta
Desarrollar una plataforma web empresarial con interfaz React, backend Node.js, API REST y persistencia relacional. Permitirá a clientes registrar y consultar solicitudes, coordinadores asignar técnicos, personal técnico ejecutar servicios y administradores gestionar catálogos, usuarios y reglas de operación. La gerencia consultará métricas consolidadas mediante un dashboard.

El equipo tendrá libertad para diseñar la experiencia visual y proponer funcionalidades complementarias, pero todos los requisitos mínimos definidos en este documento son obligatorios.

---

## 3. Objetivo general
Diseñar, implementar y validar una aplicación web full stack con arquitectura en capas, API REST segura y persistencia consistente, que automatice la gestión del ciclo de vida de solicitudes de servicios técnicos y genere información operativa para sus diferentes actores.

### 3.1. Objetivos específicos
* Modelar las entidades, relaciones y reglas de negocio del dominio.
* Diseñar una arquitectura desacoplada y contratos API documentados.
* Implementar interfaces React responsivas y orientadas a roles.
* Desarrollar servicios Node.js con controles de autenticación, autorización, validación y auditoría.
* Validar los procesos mediante pruebas unitarias, de integración y funcionales.
* Desplegar la solución y justificar sus decisiones técnicas en una defensa individual.

---

## 4. Requerimientos tecnológicos obligatorios
* **Arquitectura:** En capas con separación de presentación, API, negocio, acceso a datos y persistencia. El frontend no podrá conectarse directamente a la base de datos.
* **Frontend:** React, componentes funcionales, Hooks, rutas protegidas, formularios validados, gestión de peticiones asíncronas y diseño responsivo.
* **Backend:** Node.js con Express o NestJS; lógica de negocio y controles críticos ejecutados en el servidor.
* **Integración:** API REST con JSON, códigos HTTP adecuados, validaciones, manejo centralizado de errores, paginación y filtros.
* **Datos:** PostgreSQL, MySQL o SQL Server, con claves, restricciones, índices y migraciones o scripts reproducibles.
* **Seguridad:** Contraseñas con hash seguro, autenticación, autorización por roles, manejo adecuado de secretos y protección de recursos.
* **Colaboración:** Git con registro verificable de aportaciones y separación de configuraciones por ambiente.
* **Documentación:** Especificación OpenAPI/Swagger actualizada y guía para ejecución local y despliegue.

---

## 5. Módulos funcionales mínimos

### 5.1. Seguridad y usuarios
Gestionar autenticación, cierre de sesión, recuperación o restablecimiento controlado de credenciales, perfiles y autorización por roles: administrador, coordinador, técnico y cliente. El backend deberá verificar las autorizaciones en cada operación protegida.

### 5.2. Clientes, técnicos y catálogos
Implementar CRUD y consultas de clientes, técnicos, especialidades, categorías de servicio y parámetros operativos. Validar duplicidad, integridad referencial, vigencia de registros y restricciones al eliminar entidades relacionadas.

### 5.3. Gestión de solicitudes
Registrar solicitudes con identificador único, categoría, prioridad solicitada, descripción, sede, equipo/recurso afectado y adjuntos cuando corresponda. Implementar estados: registrada, aprobada, asignada, en proceso, pendiente de información, resuelta, cerrada y cancelada, además de historial inalterable de cambios.

### 5.4. Asignación y seguimiento
Permitir asignación y reasignación justificada según especialidad, disponibilidad y carga de trabajo. Calcular plazos de atención por prioridad, señalar solicitudes próximas a vencer y registrar cada transición de estado, responsable y fecha.

### 5.5. Notificaciones e interacción dinámica
Notificar eventos como registro, asignación, cambios de estado, solicitudes de información y cierre. Al menos una funcionalidad deberá actualizarse sin recarga manual, utilizando WebSocket, Server-Sent Events u otra solución justificada.

### 5.6. Dashboard y reportes
Presentar indicadores calculados desde datos persistidos: solicitudes por estado y prioridad, carga por técnico, tiempos promedio de resolución, cumplimiento de plazos, vencimientos y evolución temporal. Incluir filtros por fechas y dimensiones relevantes según rol.

---

## 6. Reglas de negocio obligatorias
1. No cerrar solicitudes sin resolución documentada.
2. Un técnico solo podrá modificar las solicitudes autorizadas y asignadas a su cargo.
3. Un cliente solo podrá consultar sus propios registros.
4. Una solicitud cerrada no podrá retroceder de estado sin reapertura autorizada y auditada.
5. La asignación de técnicos debe validar especialidad, disponibilidad y restricciones de carga.
6. Los plazos y el cumplimiento deben calcularse desde el backend con reglas explícitas.
7. Todas las transiciones de estado deben generar auditoría con usuario, fecha y cambio.
8. Las actualizaciones deben validar existencia, estado y coherencia transaccional.

---

## 7. Contratos API mínimos
La siguiente tabla es orientativa; el equipo podrá ampliar o reorganizar rutas siempre que preserven semántica REST y documentación consistente.

| Método | Recurso | Responsabilidad |
| :--- | :--- | :--- |
| POST | `/api/auth/login` | Iniciar sesión |
| GET | `/api/solicitudes` | Listado paginado y filtrado |
| POST | `/api/solicitudes` | Registrar solicitud |
| GET | `/api/solicitudes/:id` | Consultar detalle |
| PATCH | `/api/solicitudes/:id/estado` | Cambiar estado con reglas |
| POST | `/api/solicitudes/:id/asignaciones` | Asignar técnico |
| GET | `/api/solicitudes/:id/historial` | Consultar auditoría |
| GET | `/api/dashboard/indicadores` | Obtener métricas |

La API deberá documentar autenticación, parámetros, solicitudes, respuestas, códigos de error y ejemplos JSON. Deberá evitar exposición de datos sensibles y proveer mensajes de error útiles y seguros.

---

## 8. Datos, calidad y pruebas
* El modelo relacional deberá incluir como mínimo: usuarios, roles, clientes, técnicos, especialidades, solicitudes, estados, asignaciones, historial y notificaciones, más entidades que resulten de las decisiones del equipo. Se deberán entregar diagramas lógico y físico y el esquema reproducible con datos de prueba.
* Pruebas unitarias de al menos cinco reglas de negocio críticas.
* Pruebas de integración de endpoints y sus escenarios positivos y negativos.
* Dos flujos completos de extremo a extremo: registro-asignación-atención y consulta-seguimiento-cierre.
* Pruebas de autorización por roles y de entradas inválidas.
* Verificación responsiva y manejo de estados de carga, error y ausencia de datos.
* Informe de evidencias, defectos detectados y acciones correctivas.

---

## 9. Entregables
1. Repositorio(s) Git de frontend y backend, con instrucciones claras de instalación.
2. Diagramas de arquitectura y modelo lógico/físico de base de datos.
3. Scripts/migraciones y conjunto representativo de datos de prueba.
4. API documentada en OpenAPI/Swagger.
5. Manual técnico, configuración y despliegue reproducible.
6. Manual de usuario por rol.
7. Informe de pruebas con evidencias verificables.
8. Aplicación integrada y desplegada para demostración.
9. Video de diseño, desarrollo, arquitectura, pruebas y funcionamiento.
10. Presentación y defensa técnica individual de cada integrante.

---

## 10. Condiciones de trabajo y evaluación
* Equipos de cuatro estudiantes; responsabilidades y contribuciones individuales verificables en Git.
* No se admiten pantallas simuladas que suplanten operaciones críticas sin API y persistencia reales.
* Se permiten bibliotecas, documentación e IA como apoyo, pero el código, arquitectura y decisiones deberán explicarse y defenderse.
* La calificación combina producto grupal con defensa individual; el docente podrá pedir una modificación funcional en vivo.
* Se valorará la integridad de los datos, el control de errores, la legibilidad del código y la trazabilidad de las decisiones.

---

## 11. Planificación sugerida

| Semana | Hito principal | Evidencia |
| :--- | :--- | :--- |
| 1 | Análisis, requisitos, modelo y arquitectura | Diseño y backlog aprobados |
| 2 | Backend, autenticación y API REST | Endpoints operativos |
| 3 | React, formularios y flujos | Frontend integrado |
| 4 | Reglas avanzadas, notificaciones y dashboard | Incremento funcional |
| 5 | Pruebas, despliegue, documentación y defensa | Entrega final |

Se recomiendan dos revisiones formativas: una al cierre de la semana 2 (arquitectura y API) y otra al cierre de la semana 4 (integración y reglas de negocio).

---

## 12. RÚBRICA DE EVALUACIÓN (10 PUNTOS)
La rúbrica se aplicará al proyecto final. Los criterios técnicos suman 7 puntos (producto grupal) y la exposición y/o defensa técnica vale 3 puntos (desempeño individual).

| Criterio | Máximo | Evidencia para asignar puntuación |
| :--- | :---: | :--- |
| Arquitectura y organización del código | 1.0 | Separación por capas, estructura modular, control de versiones y justificación técnica. |
| Frontend React y experiencia de usuario | 1.0 | Componentes, Hooks, formularios, rutas protegidas, accesibilidad y respuesta adaptable. |
| Backend y API REST | 1.5 | Contratos, endpoints operativos, validaciones, respuestas HTTP, errores y documentación. |
| Reglas de negocio y funcionalidad integrada | 1.5 | Flujos completos, transiciones, asignaciones, auditoría, notificaciones y dashboard real. |
| Seguridad y persistencia | 1.0 | Autenticación, autorización, integridad relacional, secretos y protección de datos. |
| Pruebas, despliegue y documentación | 1.0 | Evidencias de pruebas, reproducibilidad, manuales, repositorios y despliegue. |
| **EXPOSICIÓN Y/O DEFENSA TÉCNICA INDIVIDUAL** | **3.0** | Explicación del diseño y código, dominio de React/Node/API, respuestas fundamentadas y modificación o diagnóstico en vivo. |
| **TOTAL** | **10.0** | |

### 12.1. Niveles de logro
* **Excelente (90-100%):** Cumple plenamente, es demostrable y evidencia decisiones técnicas justificadas.
* **Satisfactorio (70-89%):** Cumple lo esencial, con fallas menores que no impiden el flujo principal.
* **Básico (50-69%):** Cumple parcialmente; existen deficiencias relevantes o poca evidencia.
* **Insuficiente (0-49%):** No cumple lo esencial, falla el flujo o no se demuestra la competencia.

### 12.2. Desglose específico de exposición y defensa (3 puntos)
| Indicador individual | Puntos |
| :--- | :---: |
| Claridad de exposición y explicación de arquitectura, procesos y aportación propia | 0.75 |
| Dominio técnico del frontend, backend, API y base de datos; respuestas sustentadas | 1.00 |
| Demostración funcional, diagnóstico o modificación técnica solicitada en vivo | 1.00 |
| Comunicación profesional y uso adecuado del tiempo | 0.25 |
| **TOTAL** | **3.00** |

---
*Universidad de Guayaquil • Facultad de Ciencias Matemáticas y Físicas • Carrera de Software*