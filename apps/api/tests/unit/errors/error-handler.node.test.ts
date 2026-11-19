import { describe, it } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { Prisma } from '@prisma/client';
import { createApp } from '../../../src/app.ts';
import { translateKnownError } from '../../../src/presentation/middlewares/error-handler.ts';

function prismaError(code: string) {
  const error = Object.create(Prisma.PrismaClientKnownRequestError.prototype) as Prisma.PrismaClientKnownRequestError;
  Object.defineProperty(error, 'code', { value: code, enumerable: true });
  return error;
}

describe('Manejo de errores y logging (TC-ERR)', () => {
  it('TC-ERR-01: traduce P2002 y P2003 a ENTIDAD_EN_USO', () => {
    assert.strictEqual(translateKnownError(prismaError('P2002'))?.code, 'ENTIDAD_EN_USO');
    assert.strictEqual(translateKnownError(prismaError('P2003'))?.code, 'ENTIDAD_EN_USO');
  });

  it('TC-ERR-02: traduce P2025 a RECURSO_NO_ENCONTRADO', () => {
    const error = translateKnownError(prismaError('P2025'));
    assert.strictEqual(error?.code, 'RECURSO_NO_ENCONTRADO');
    assert.strictEqual(error?.httpStatus, 404);
  });

  it('TC-ERR-03: ignora errores desconocidos', () => {
    assert.strictEqual(translateKnownError(new Error('boom')), null);
  });

  it('TC-ERR-04: responde 422 ante JSON malformado sin filtrar stack', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":')
      .expect(422);

    assert.strictEqual(response.body.error.code, 'VALIDACION_FALLIDA');
    assert.ok(response.body.error.requestId);
    assert.strictEqual(response.body.error.stack, undefined);
  });
});
