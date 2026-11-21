# 12 — Verificación local de integración

**Fecha:** 2026-11-20  
**Alcance:** PostgreSQL local, API Node/Express y frontend React/Vite.

## Resultado

Se habilitó una instancia PostgreSQL aislada para el proyecto en el puerto `5433`.
Se creó la base `servigest`, se ejecutaron el esquema y el seed, y se conectó una
instancia de la API en `http://127.0.0.1:3001`.

El frontend quedó levantado en `http://127.0.0.1:5174` y configurado para consumir
esa API.

## Comprobaciones realizadas

| Verificación | Resultado |
|---|---|
| PostgreSQL acepta conexiones | OK |
| Creación de base y usuario | OK |
| Ejecución de `database/01-init-schema.sql` | OK |
| Ejecución de `database/02-seed-data.sql` | OK, después de corregir UUID inválidos |
| Datos seed: usuarios | 4 registros |
| Datos seed: clientes | 3 registros |
| Datos seed: solicitudes | 1 registro |
| `GET /api/health` | `200`, `status: UP`, `db: UP` |
| `POST /api/auth/login` | `200` con cuenta ADMIN |
| Frontend Vite | Carga correcta en `5174` |
| Build de producción frontend | OK, 128 módulos transformados |

## Credenciales de desarrollo

Todas las cuentas seed usan la contraseña:

```text
ServiGest2026*
```

```text
admin@servigest.ec
coordinador@servigest.ec
tecnico@servigest.ec
cliente@servigest.ec
```

## Correcciones aplicadas

- Se reemplazaron identificadores no válidos como `t111...` y `s111...` por UUID válidos.
- Se actualizó el hash bcrypt del seed para que corresponda a `ServiGest2026*`.
- Se excluyó `.postgres-dev/` del repositorio.

## Pendiente

Esta verificación no sustituye las pruebas de integración completas ni los flujos
E2E definidos en `docs/05-pruebas.md`. Siguen pendientes la matriz completa por
roles, los dos flujos E2E, SSE desde navegador y el despliegue público.
