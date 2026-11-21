# 08 — Despliegue y operación

**Objetivo:** cualquier integrante o el docente debe poder levantar, verificar y desplegar el sistema desde cero siguiendo este documento.

## 1. Requisitos previos

| Herramienta | Versión mínima |
| :--- | :--- |
| Node.js | 20 LTS |
| pnpm | 9 |
| Docker + Docker Compose | 24 / v2 |
| Git | 2.40 |
| PostgreSQL (alternativa local) | 16 |

## 2. Variables de entorno

Crear `.env` a partir de `.env.example`. Nunca versionar `.env`.

### 2.1. Backend (`apps/api/.env`)

| Variable | Ejemplo | Obligatoria | Descripción |
| :--- | :--- | :-: | :--- |
| `NODE_ENV` | `development` | Sí | `development`, `test`, `production`. |
| `PORT` | `3000` | Sí | Puerto de la API. En la instancia local de pruebas se usa `3001`. |
| `DATABASE_URL` | `postgresql://servigest:servigest@localhost:5432/servigest?schema=public` | Sí | Conexión Prisma. La instancia aislada local de pruebas usa el puerto `5433`. |
| `JWT_SECRET` | cadena aleatoria ≥ 32 caracteres | Sí | Firma del access token. |
| `JWT_ISSUER` | `servigest-api` | Sí | Emisor. |
| `JWT_AUDIENCE` | `servigest-web` | Sí | Audiencia. |
| `ACCESS_TOKEN_TTL` | `15m` | No | Vigencia del access token. |
| `REFRESH_TOKEN_TTL_DAYS` | `7` | No | Vigencia del refresh. |
| `CORS_ORIGIN` | `http://localhost:5173` | Sí | Origen permitido. |
| `WEB_URL` | `http://localhost:5173` | Sí | Enlaces de correo. |
| `APP_TIMEZONE` | `America/Guayaquil` | Sí | Zona de cálculo SLA. |
| `STORAGE_DRIVER` | `local` | Sí | `local` o `s3`. |
| `STORAGE_LOCAL_PATH` | `./storage` | Si `local` | Directorio de adjuntos. |
| `S3_BUCKET` / `S3_REGION` / `S3_ACCESS_KEY` / `S3_SECRET_KEY` | — | Si `s3` | Almacenamiento de objetos. |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | — | No | Correo de recuperación. |
| `LOG_LEVEL` | `info` | No | Nivel de logs. |
| `RATE_LIMIT_LOGIN_MAX` | `5` | No | Intentos por ventana. |
| `RATE_LIMIT_LOGIN_WINDOW_MIN` | `15` | No | Ventana de bloqueo. |

### 2.2. Frontend (`apps/web/.env`)

| Variable | Ejemplo | Descripción |
| :--- | :--- | :--- |
| `VITE_API_URL` | `http://localhost:3000/api` | Base de la API. |
| `VITE_APP_NAME` | `ServiGest Ecuador` | Nombre visible. |

> Generar secretos: `openssl rand -base64 48`.

## 3. Ejecución local

### 3.1. Con Docker (recomendado)

```bash
cp .env.example .env
docker compose up -d --build
docker compose exec api pnpm prisma migrate deploy
docker compose exec api pnpm prisma db seed
```

- Web: `http://localhost:8080`
- API: `http://localhost:3000/api`
- Swagger: `http://localhost:3000/api/docs`
- PostgreSQL: `localhost:5432`

### 3.2. Sin Docker

```bash
pnpm install
docker compose up -d db
cp .env.example apps/api/.env
pnpm --filter api prisma migrate dev
pnpm --filter api prisma db seed
pnpm --filter api dev
pnpm --filter web dev
```

### 3.3. Instancia local aislada para pruebas

Cuando PostgreSQL está instalado pero no se dispone de una base compartida, se puede
crear una instancia del proyecto en el directorio `.postgres-dev/`. Esta carpeta es
local y está excluida de Git.

```bash
initdb -D .postgres-dev --auth-local=trust --auth-host=scram-sha-256 --encoding=UTF8 --locale=C
pg_ctl -D .postgres-dev -o "-p 5433 -h 127.0.0.1 -k /tmp" -l /tmp/servigest-postgres.log start
psql -h /tmp -p 5433 -U "$(whoami)" -d postgres -c "CREATE ROLE servigest LOGIN PASSWORD 'servigest';"
psql -h /tmp -p 5433 -U "$(whoami)" -d postgres -c "CREATE DATABASE servigest OWNER servigest;"
psql -h /tmp -p 5433 -U servigest -d servigest -f database/01-init-schema.sql
psql -h /tmp -p 5433 -U servigest -d servigest -f database/02-seed-data.sql
```

Para esta instancia, configurar `apps/api/.env` con `DATABASE_URL` apuntando a
`127.0.0.1:5433` y ejecutar la API en `3001`; el frontend puede usar `5174` si
`5173` está ocupado.

### 3.3. `docker-compose.yml` de referencia

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: servigest
      POSTGRES_PASSWORD: servigest
      POSTGRES_DB: servigest
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U servigest"]
      interval: 5s
      timeout: 5s
      retries: 10

  api:
    build: ./apps/api
    env_file: .env
    depends_on:
      db:
        condition: service_healthy
    ports:
      - "3000:3000"
    volumes:
      - uploads:/app/storage

  web:
    build: ./apps/web
    depends_on:
      - api
    ports:
      - "8080:80"

volumes:
  pgdata:
  uploads:
```

## 4. Migraciones y datos

- Desarrollo: `pnpm prisma migrate dev --name <descripcion>`.
- Producción: `pnpm prisma migrate deploy` (nunca `db push`).
- Seed: `pnpm prisma db seed` (idempotente; no ejecutar en producción con datos reales).
- Respaldo previo a migraciones en producción:

```bash
pg_dump "$DATABASE_URL" -Fc -f backup_$(date +%Y%m%d_%H%M).dump
```

## 5. Verificación local antes del despliegue

La verificación se realiza en local antes de desplegar, contra una base de prueba:

```bash
docker compose up -d db
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm --filter api prisma migrate deploy
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm build
```

- Si alguna verificación falla, no se despliega.
- Las pruebas E2E requieren `pnpm exec playwright install --with-deps`.
- El resultado se adjunta al informe de pruebas.

## 6. Despliegue en producción (referencia)

### 6.1. Arquitectura sugerida

| Componente | Servicio sugerido |
| :--- | :--- |
| PostgreSQL | Neon, Supabase o RDS |
| API | Render, Railway o Fly.io (contenedor Docker) |
| Web | Vercel, Netlify o Cloudflare Pages |
| Adjuntos | S3 o compatible |
| Correo | Resend, SendGrid o SMTP institucional |

### 6.2. Pasos

1. Crear la base de datos y copiar la cadena de conexión con SSL (`?sslmode=require`).
2. Configurar las variables de entorno del backend en el proveedor.
3. Desplegar la API desde el `Dockerfile` de `apps/api`.
4. Ejecutar `prisma migrate deploy` como paso de release.
5. Desplegar el frontend con `VITE_API_URL` apuntando a la API pública.
6. Configurar `CORS_ORIGIN` con el dominio exacto del frontend.
7. Configurar HTTPS y cookies `Secure`.
8. Ejecutar la verificación posterior (sección 7).
9. Cargar el seed de demostración solo si es un ambiente de demo.

### 6.3. Verificación posterior al despliegue

```bash
curl -fsS https://api.dominio.com/api/health
curl -fsS https://api.dominio.com/api/openapi.json | head
```

- Login con cada rol de demo.
- Registrar una solicitud y recorrer el flujo completo.
- Verificar que una notificación SSE llega sin recargar.
- Confirmar que el dashboard responde con datos reales.
- Revisar logs sin errores 5xx.

## 7. Seguridad operativa

- [ ] HTTPS obligatorio en producción.
- [ ] Cookies `Secure`, `HttpOnly`, `SameSite=Strict`.
- [ ] `CORS_ORIGIN` restringido al dominio del frontend.
- [ ] Secretos en el gestor del proveedor, no en el repositorio.
- [ ] `helmet` y cabeceras de seguridad activas.
- [ ] Rate limit de login y endpoints sensibles.
- [ ] Base de datos sin puerto público.
- [ ] Copias de seguridad automáticas y restauración probada.
- [ ] Swagger protegido o deshabilitado si el enunciado lo permite.
- [ ] Logs sin tokens, contraseñas ni datos personales innecesarios.
- [ ] Dependencias auditadas (`pnpm audit`).

## 8. Respaldos y restauración

| Aspecto | Política |
| :--- | :--- |
| Frecuencia | Diaria automática + manual antes de migraciones. |
| Retención | 7 diarios, 4 semanales, 3 mensuales. |
| Prueba de restauración | Mensual en ambiente de staging. |
| Adjuntos | Copia del bucket o volumen según proveedor. |

```bash
pg_restore --clean --if-exists -d "$DATABASE_URL" backup_20261115.dump
```

## 9. Monitoreo y runbook

| Síntoma | Diagnóstico | Acción |
| :--- | :--- | :--- |
| `/health` con `db: down` | Credenciales, red o límite de conexiones | Revisar `DATABASE_URL`, pool y estado del proveedor. |
| 401 masivos | Reloj desfasado o `JWT_SECRET` cambiado | Sincronizar reloj; rotar tokens si corresponde. |
| 429 en login | Ataque o usuario bloqueado | Revisar IPs; desbloquear usuario tras validación. |
| SSE sin eventos | Proxy con buffering o timeout | Desactivar buffering, verificar heartbeat y reconexión. |
| Dashboard lento | Consultas sin índice o rango excesivo | Revisar `EXPLAIN`, índices y límite de 366 días. |
| Error 500 recurrente | Log con `requestId` | Corregir, agregar prueba de regresión y redeploy. |

**Rollback:** redesplegar la imagen anterior y, si la migración es incompatible, restaurar el respaldo previo. Las migraciones deben ser compatibles hacia atrás cuando sea posible.

## 10. Credenciales de demostración (solo desarrollo)

| Rol | Correo | Contraseña |
| :--- | :--- | :--- |
| ADMIN | `admin@servigest.ec` | `ServiGest2026*` |
| COORDINADOR | `coordinador@servigest.ec` | `ServiGest2026*` |
| TECNICO | `tecnico@servigest.ec` | `ServiGest2026*` |
| CLIENTE | `cliente@servigest.ec` | `ServiGest2026*` |

> Cambiar o deshabilitar estas cuentas en cualquier ambiente público.

## 11. Checklist de entrega reproducible

- [ ] Repositorio con README de instalación.
- [ ] `.env.example` completo y sin secretos reales.
- [ ] `docker compose up` levanta db + api + web.
- [ ] Migraciones y seed ejecutan sin errores.
- [ ] Swagger accesible.
- [ ] Usuarios demo funcionan.
- [ ] Healthcheck responde.
- [ ] Verificación local completa (lint, typecheck, pruebas y build).
- [ ] Aplicación desplegada y accesible por URL.
- [ ] Manuales y video adjuntos.
