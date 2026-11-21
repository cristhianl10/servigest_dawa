# 13 — Auditoría de pendientes del proyecto

**Fecha de revisión:** 2026-11-21  
**Alcance:** frontend React, integración con API, accesibilidad, flujos por rol y evidencia de pruebas.  
**Estado:** pendientes identificados; actualizar este documento al resolverlos.

## Propósito

Este documento conserva el análisis de faltantes realizado sobre el proyecto. Antes de declarar el proyecto terminado, una nueva revisión debe consultar este archivo y marcar cada pendiente con evidencia verificable.

## Resumen

El frontend y backend están implementados y conectados a una instancia PostgreSQL local. La API responde con `db: UP`, el login funciona con las cuentas seed y el frontend compila y carga correctamente. Todavía existe una brecha entre la interfaz construida y una interfaz completamente validada y accesible.

## Pendientes priorizados

### P-01 — Mostrar y ocultar contraseñas

- **Severidad:** Mayor.
- **Estado:** Implementado; pendiente de validación manual en navegador.
- **Afecta:** `LoginPage.tsx`, `ResetPasswordPage.tsx`, `ProfilePage.tsx`, `UsersPage.tsx`.
- **Problema:** Todos los campos usan `type="password"` sin un control para visualizar temporalmente el valor.
- **Solución requerida:** Botón accesible por teclado con estado `Mostrar contraseña` / `Ocultar contraseña`, `aria-label` y `aria-pressed`, independiente para cada campo.
- **Criterio de aceptación:** Se puede alternar la visibilidad sin perder foco ni contenido; por defecto la contraseña permanece oculta.
- **Implementación:** Componente reutilizable `apps/web/src/components/PasswordField.tsx`, aplicado a login, reset, perfil y usuarios. Incluye `aria-label`, `aria-pressed`, iconos de ojo y foco visible.
- **Verificación técnica:** TypeScript y build de producción frontend pasan.

### P-02 — Pruebas E2E de flujos principales

- **Severidad:** Mayor.
- **Estado:** Implementado y verificado; queda pendiente ampliar cobertura SSE específica si se requiere evidencia de evento individual.
- **Problema:** No hay evidencia automatizada de los dos flujos completos definidos en `docs/05-pruebas.md`.
- **Pendiente:** Registro → aprobación → asignación → atención → SSE; y consulta → seguimiento → cierre → intento inválido → reapertura.
- **Criterio de aceptación:** Ambos flujos pasan contra PostgreSQL y frontend real, sin mocks de la base.
- **Implementación:** Se añadieron `apps/web/e2e/auth-session.spec.ts` y `apps/web/e2e/business-flow.spec.ts`, junto con el script `apps/web:test:e2e`. La suite cubre login, mostrar/ocultar contraseña, registro, aprobación, asignación, atención, consulta, cierre, bloqueo de transición inválida, reapertura e historial.
- **Evidencia:** E2E-01 y E2E-02 ejecutados con Playwright, Chromium, frontend, API y PostgreSQL reales: 2 pruebas aprobadas, 0 fallidas.

### P-03 — Matriz de autorización por rol

- **Severidad:** Mayor.
- **Estado:** Verificado en endpoints críticos; falta ampliar cobertura al 100 % de endpoints.
- **Roles:** `ADMIN`, `COORDINADOR`, `TECNICO`, `CLIENTE`.
- **Pendiente:** Probar permisos, denegaciones, aislamiento de recursos e IDOR para cada endpoint protegido.
- **Criterio de aceptación:** El frontend oculta acciones no permitidas y el backend las rechaza aunque se manipule la interfaz.
- **Implementación/verificación:** Se agregaron `TC-SEC-01` para aislamiento de clientes e `TC-SEC-02` para aislamiento de técnicos en `apps/api/tests/unit/requests/requests.node.test.ts`, además de `apps/web/e2e/authorization-matrix.spec.ts`. La prueba E2E verifica `401` sin token, permisos de `ADMIN`/`COORDINADOR`, denegaciones para `TECNICO`/`CLIENTE`, acceso por rol a clientes y solicitudes, y aislamiento IDOR en solicitudes e historial.
- **Evidencia:** Matriz E2E ejecutada contra API, frontend y PostgreSQL reales: 1 prueba aprobada. La suite E2E completa queda en 5 pruebas aprobadas.
- **Pendiente residual:** Ampliar la matriz al 100 % de endpoints protegidos y añadir casos de tokens expirados o malformados.

### P-04 — Modales accesibles

- **Severidad:** Media.
- **Estado:** Implementado; pendiente de validación manual con teclado.
- **Ubicación:** `apps/web/src/components/Ui.tsx`.
- **Problema:** Debe verificarse focus trap, devolución del foco al invocador y cierre con `Escape`.
- **Criterio de aceptación:** Al abrir, el foco entra al modal; `Tab` no escapa; `Escape` cierra; el foco vuelve al botón que lo abrió.
- **Implementación:** `Modal` ahora gestiona foco inicial, focus trap, cierre con `Escape`, `aria-labelledby` y devolución del foco al elemento invocador.
- **Verificación técnica:** TypeScript y build de producción frontend pasan.

### P-05 — Dashboard con alternativa accesible

- **Severidad:** Media.
- **Estado:** Implementado; pendiente de validación manual con lector de pantalla.
- **Ubicación:** `DashboardPage.tsx`.
- **Problema:** El gráfico usa `role="img"` y `aria-label`, pero no ofrece tabla o resumen textual equivalente.
- **Criterio de aceptación:** Una persona que no percibe el gráfico puede conocer los mismos valores y tendencias mediante texto o tabla.
- **Implementación:** El gráfico visual se oculta para tecnologías asistivas y se añadió una tabla accesible con período, solicitudes creadas y resueltas.
- **Verificación técnica:** TypeScript y build de producción frontend pasan.

### P-06 — Auditoría responsive y accesibilidad manual

- **Severidad:** Media.
- **Estado:** Pendiente de evidencia.
- **Tamaños:** 360, 768, 1024 y 1440 px.
- **Pendiente:** Verificar login, listado, detalle, dashboard, modales y navegación; además teclado, foco, contraste AA, zoom, lector de pantalla y `prefers-reduced-motion`.

### P-07 — Recuperación y renovación de sesión

- **Severidad:** Media.
- **Estado:** Verificado mediante pruebas unitarias y HTTP/E2E; queda pendiente únicamente ampliar escenarios de expiración real.
- **Pendiente:** Probar refresh token, expiración, logout, recuperación, token vencido y token reutilizado.
- **Evidencia:** La suite `apps/api/tests/unit/auth/auth.node.test.ts` ejecutó 12 casos con 12 aprobados, incluyendo rotación y reutilización de refresh token, logout, recuperación de contraseña, reset de un solo uso y cambio de contraseña.
- **Implementación/verificación:** `apps/web/e2e/auth-session.spec.ts` ahora cubre renovación, rotación e invalidación del refresh token al cerrar sesión, además de recuperación sin revelar la existencia del correo. La suite de autenticación queda con 4 pruebas aprobadas.
- **Pendiente residual:** Agregar un escenario controlado de expiración real de access token y validar el reintento automático desde una pantalla protegida.

### P-08 — Estados de interfaz

- **Severidad:** Media.
- **Estado:** Parcialmente implementado; falta revisión completa.
- **Pendiente:** Confirmar estados consistentes de carga, error, vacío, éxito y reintento en cada pantalla.

### P-09 — `PageHeader` no muestra `eyebrow`

- **Severidad:** Menor.
- **Estado:** Implementado.
- **Ubicación:** `apps/web/src/components/Ui.tsx`.
- **Problema:** El componente declara la prop `eyebrow`, pero no la desestructura ni la renderiza.
- **Criterio de aceptación:** Cuando una página envía `eyebrow`, aparece antes del título.
- **Implementación:** `PageHeader` ahora renderiza la prop como texto contextual sobre el título con estilo consistente.
- **Verificación técnica:** TypeScript y build de producción frontend pasan.

### P-10 — Cierre de sesión poco visible

- **Severidad:** Media.
- **Estado:** Implementado; pendiente de validación manual en móvil.
- **Problema detectado:** La acción `Cerrar sesión` existía únicamente al final de la barra lateral y en móvil quedaba oculta hasta abrir el menú.
- **Implementación:** Se añadió un botón visible en la barra superior; en pantallas pequeñas conserva el icono y un nombre accesible para lectores de pantalla. El flujo existente revoca la sesión mediante `POST /auth/logout`, limpia el token local y redirige a `/login`.
- **Verificación técnica:** TypeScript y build de producción frontend pasan.

## Elementos ya verificados

- Frontend React compila con Vite.
- API TypeScript compila.
- PostgreSQL local funciona en el entorno de pruebas.
- Esquema y seed se cargan correctamente después de corregir UUID inválidos.
- `GET /api/health` responde `status: UP` y `db: UP`.
- Login ADMIN probado correctamente.
- Rutas protegidas y navegación por rol están implementadas.
- Hay estados de carga, error y vacío en varias vistas.
- Hay `aria-live`, `role="alert"`, `role="status"` y navegación etiquetada.
- Existe soporte CSS para `prefers-reduced-motion`.

## Orden recomendado

1. Implementar mostrar/ocultar contraseña.
2. Corregir accesibilidad de modales.
3. Ejecutar matriz de roles e IDOR.
4. Implementar y ejecutar los dos flujos E2E.
5. Añadir alternativa textual al dashboard.
6. Hacer revisión responsive y de teclado.
7. Actualizar este documento con fecha, resultado y evidencia de cada corrección.

## Regla para futuras auditorías

Cuando se solicite “revisar lo faltante”, leer primero este documento, comprobar cada pendiente contra el código actual y actualizar los estados. No marcar un requisito como completo solo porque exista código: debe haber una prueba o evidencia reproducible.
