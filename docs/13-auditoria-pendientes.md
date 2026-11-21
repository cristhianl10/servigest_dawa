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
- **Estado:** Pendiente.
- **Problema:** No hay evidencia automatizada de los dos flujos completos definidos en `docs/05-pruebas.md`.
- **Pendiente:** Registro → aprobación → asignación → atención → SSE; y consulta → seguimiento → cierre → intento inválido → reapertura.
- **Criterio de aceptación:** Ambos flujos pasan contra PostgreSQL y frontend real, sin mocks de la base.

### P-03 — Matriz de autorización por rol

- **Severidad:** Mayor.
- **Estado:** Parcialmente verificado; falta completar la matriz HTTP por endpoint.
- **Roles:** `ADMIN`, `COORDINADOR`, `TECNICO`, `CLIENTE`.
- **Pendiente:** Probar permisos, denegaciones, aislamiento de recursos e IDOR para cada endpoint protegido.
- **Criterio de aceptación:** El frontend oculta acciones no permitidas y el backend las rechaza aunque se manipule la interfaz.
- **Implementación/verificación:** Se agregaron `TC-SEC-01` para aislamiento de clientes e `TC-SEC-02` para aislamiento de técnicos en `apps/api/tests/unit/requests/requests.node.test.ts`. Ambas pruebas pasan.
- **Pendiente:** Ejecutar la matriz completa de endpoints, roles, tokens inválidos y casos IDOR contra API + PostgreSQL.

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
- **Estado:** Pendiente.
- **Ubicación:** `DashboardPage.tsx`.
- **Problema:** El gráfico usa `role="img"` y `aria-label`, pero no ofrece tabla o resumen textual equivalente.
- **Criterio de aceptación:** Una persona que no percibe el gráfico puede conocer los mismos valores y tendencias mediante texto o tabla.

### P-06 — Auditoría responsive y accesibilidad manual

- **Severidad:** Media.
- **Estado:** Pendiente de evidencia.
- **Tamaños:** 360, 768, 1024 y 1440 px.
- **Pendiente:** Verificar login, listado, detalle, dashboard, modales y navegación; además teclado, foco, contraste AA, zoom, lector de pantalla y `prefers-reduced-motion`.

### P-07 — Recuperación y renovación de sesión

- **Severidad:** Media.
- **Estado:** Pendiente de evidencia completa.
- **Pendiente:** Probar refresh token, expiración, logout, recuperación, token vencido y token reutilizado.

### P-08 — Estados de interfaz

- **Severidad:** Media.
- **Estado:** Parcialmente implementado; falta revisión completa.
- **Pendiente:** Confirmar estados consistentes de carga, error, vacío, éxito y reintento en cada pantalla.

### P-09 — `PageHeader` no muestra `eyebrow`

- **Severidad:** Menor.
- **Estado:** Pendiente.
- **Ubicación:** `apps/web/src/components/Ui.tsx`.
- **Problema:** El componente declara la prop `eyebrow`, pero no la desestructura ni la renderiza.
- **Criterio de aceptación:** Cuando una página envía `eyebrow`, aparece antes del título.

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
