import { describe, it } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { createApp } from '../../../src/app.ts';
import {
  buildHealthPayload,
  checkDatabase,
  type DatabaseProbe,
} from '../../../src/presentation/routes/health.routes.ts';
import { openApiDocument } from '../../../src/docs/openapi.ts';

describe('Salud, OpenAPI y metadatos (TC-META)', () => {
  it('TC-META-01: reporta base de datos disponible', async () => {
    const probe: DatabaseProbe = {
      async $queryRaw() {
        return [{ '?column?': 1 }];
      },
    };

    const status = await checkDatabase(probe);
    assert.strictEqual(status, 'UP');

    const payload = buildHealthPayload(status, 12.5, new Date('2026-11-18T10:00:00Z'));
    assert.deepStrictEqual(payload, {
      status: 'UP',
      db: 'UP',
      uptime: 12.5,
      version: '1.0.0',
      service: 'servigest-api',
      timestamp: '2026-11-18T10:00:00.000Z',
    });
  });

  it('TC-META-02: reporta DOWN cuando la consulta falla o excede el tiempo', async () => {
    const failing: DatabaseProbe = {
      async $queryRaw() {
        throw new Error('sin conexión');
      },
    };
    assert.strictEqual(await checkDatabase(failing), 'DOWN');

    const hanging: DatabaseProbe = {
      $queryRaw() {
        return new Promise(() => undefined);
      },
    };
    assert.strictEqual(await checkDatabase(hanging, 5), 'DOWN');
    assert.strictEqual(buildHealthPayload('DOWN').status, 'DOWN');
  });

  it('TC-META-03: publica el documento OpenAPI con todas las rutas descritas', async () => {
    const app = createApp();
    const response = await request(app).get('/api/openapi.json').expect(200);

    assert.strictEqual(response.body.openapi, '3.1.0');
    assert.strictEqual(response.body.info.title, 'ServiGest Ecuador API');

    const expectedPaths = [
      '/health',
      '/auth/login',
      '/auth/refresh',
      '/auth/logout',
      '/auth/forgot-password',
      '/auth/reset-password',
      '/auth/me',
      '/auth/me/password',
      '/usuarios',
      '/usuarios/{id}',
      '/roles',
      '/clientes',
      '/clientes/{id}',
      '/sedes',
      '/sedes/{id}',
      '/equipos',
      '/equipos/{id}',
      '/tecnicos',
      '/tecnicos/{id}',
      '/tecnicos/{id}/carga',
      '/tecnicos/{id}/especialidades',
      '/especialidades',
      '/especialidades/{id}',
      '/categorias-servicio',
      '/categorias-servicio/{id}',
      '/estados',
      '/parametros',
      '/parametros/{key}',
      '/feriados',
      '/feriados/{date}',
      '/solicitudes',
      '/solicitudes/{id}',
      '/solicitudes/{id}/estado',
      '/solicitudes/{id}/asignaciones',
      '/solicitudes/{id}/reabrir',
      '/solicitudes/{id}/historial',
      '/solicitudes/{id}/adjuntos',
      '/solicitudes/{id}/adjuntos/{attachmentId}',
      '/notificaciones',
      '/notificaciones/{id}/leida',
      '/notificaciones/leer-todas',
      '/notificaciones/stream',
      '/dashboard/indicadores',
      '/dashboard/carga-tecnicos',
      '/dashboard/evolucion',
      '/dashboard/mi-resumen',
    ];

    for (const path of expectedPaths) {
      assert.ok(path in response.body.paths, `Falta la ruta ${path}`);
    }

    for (const [path, methods] of Object.entries(response.body.paths)) {
      for (const [method, definition] of Object.entries(methods as Record<string, any>)) {
        assert.ok(definition.summary, `${method.toUpperCase()} ${path} sin summary`);
        assert.ok(definition.description, `${method.toUpperCase()} ${path} sin description`);
        assert.ok(definition.responses, `${method.toUpperCase()} ${path} sin responses`);
      }
    }
  });

  it('TC-META-04: protege todos los endpoints salvo los públicos', async () => {
    const publicOps = new Set([
      'get /health',
      'post /auth/login',
      'post /auth/refresh',
      'post /auth/forgot-password',
      'post /auth/reset-password',
    ]);

    for (const [path, methods] of Object.entries(openApiDocument.paths)) {
      for (const [method, definition] of Object.entries(methods as Record<string, any>)) {
        const key = `${method} ${path}`;
        if (publicOps.has(key)) {
          assert.deepStrictEqual(definition.security, [], `${key} debe ser público`);
        } else {
          assert.deepStrictEqual(definition.security, [{ bearerAuth: [] }], `${key} debe exigir JWT`);
        }
      }
    }
  });

  it('TC-META-05: sirve Swagger UI en desarrollo', async () => {
    const app = createApp();
    const response = await request(app).get('/api/docs').expect(200);

    assert.match(response.text, /SwaggerUIBundle/);
    assert.match(response.text, /\/api\/openapi\.json/);
  });
});
