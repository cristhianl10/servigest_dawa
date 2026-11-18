import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AuthService, type AuthUserRecord } from '../../../src/modules/auth/auth.service.ts';
import { InMemoryAuthRepository } from '../../../src/modules/auth/auth.repository.ts';
import { CryptoUtil } from '../../../src/modules/auth/crypto.util.ts';
import { DomainError } from '../../../src/domain/errors/domain-error.ts';

describe('Módulo de Seguridad y Autenticación (TC-AUTH / RF-AUTH / NFR-SEG)', () => {
  async function createFixture() {
    const passwordHash = await CryptoUtil.hashPassword('ServiGest2026*');
    const testUser: AuthUserRecord = {
      id: 'usr-1',
      email: 'coordinador@servigest.ec',
      passwordHash,
      fullName: 'Ana Torres',
      role: 'COORDINADOR',
      clientId: null,
      status: 'ACTIVO',
      mustChangePassword: false,
      failedAttempts: 0,
      lockedUntil: null,
      lastLoginAt: null,
    };

    const inactiveUser: AuthUserRecord = {
      id: 'usr-2',
      email: 'inactivo@servigest.ec',
      passwordHash,
      fullName: 'Juan Inactivo',
      role: 'TECNICO',
      clientId: null,
      status: 'INACTIVO',
      mustChangePassword: false,
      failedAttempts: 0,
    };

    const repository = new InMemoryAuthRepository([testUser, inactiveUser]);
    let resetToken: string | null = null;
    const service = new AuthService(repository, {
      onPasswordResetRequested: (_email, token) => {
        resetToken = token;
      },
    });

    return {
      repository,
      service,
      testUser,
      inactiveUser,
      getResetToken: () => resetToken,
    };
  }

  it('TC-AUTH-01: login exitoso con credenciales válidas genera JWT y refresh token', async () => {
    const { service } = await createFixture();
    const result = await service.login('coordinador@servigest.ec', 'ServiGest2026*');

    assert.ok(result.accessToken.length > 20);
    assert.ok(result.refreshToken.length > 20);
    assert.strictEqual(result.expiresIn, 900);
    assert.strictEqual(result.user.email, 'coordinador@servigest.ec');
    assert.strictEqual(result.user.role, 'COORDINADOR');
  });

  it('TC-AUTH-02: login con contraseña inválida arroja 401 CREDENCIALES_INVALIDAS e incrementa fallos', async () => {
    const { service, repository } = await createFixture();

    await assert.rejects(
      async () => service.login('coordinador@servigest.ec', 'ClaveIncorrecta1*'),
      (err: any) => err instanceof DomainError && err.code === 'CREDENCIALES_INVALIDAS' && err.httpStatus === 401
    );

    const user = await repository.findUserByEmail('coordinador@servigest.ec');
    assert.strictEqual(user?.failedAttempts, 1);
  });

  it('TC-AUTH-03: correo inexistente arroja 401 genérico sin revelar existencia', async () => {
    const { service } = await createFixture();

    await assert.rejects(
      async () => service.login('inexistente@servigest.ec', 'Cualquiera2026*'),
      (err: any) => err instanceof DomainError && err.code === 'CREDENCIALES_INVALIDAS' && err.httpStatus === 401
    );
  });

  it('TC-AUTH-04: al 5to intento fallido se bloquea temporalmente (429 DEMASIADOS_INTENTOS)', async () => {
    const { service } = await createFixture();

    for (let i = 0; i < 4; i++) {
      try {
        await service.login('coordinador@servigest.ec', 'ClaveIncorrecta1*');
      } catch (_e) {}
    }

    // 5to intento: activa bloqueo
    await assert.rejects(
      async () => service.login('coordinador@servigest.ec', 'ClaveIncorrecta1*'),
      (err: any) => err instanceof DomainError && err.code === 'CREDENCIALES_INVALIDAS' && err.httpStatus === 401
    );

    // 6to intento: ahora responde 429 DEMASIADOS_INTENTOS
    await assert.rejects(
      async () => service.login('coordinador@servigest.ec', 'ServiGest2026*'),
      (err: any) => err instanceof DomainError && err.code === 'DEMASIADOS_INTENTOS' && err.httpStatus === 429
    );
  });

  it('TC-AUTH-05: usuario inactivo no puede iniciar sesión (403 USUARIO_INACTIVO)', async () => {
    const { service } = await createFixture();

    await assert.rejects(
      async () => service.login('inactivo@servigest.ec', 'ServiGest2026*'),
      (err: any) => err instanceof DomainError && err.code === 'USUARIO_INACTIVO' && err.httpStatus === 403
    );
  });

  it('TC-AUTH-06: rotación de refresh token invalida el anterior y emite uno nuevo', async () => {
    const { service, repository } = await createFixture();
    const loginRes = await service.login('coordinador@servigest.ec', 'ServiGest2026*');

    const refreshRes = await service.refresh(loginRes.refreshToken);
    assert.ok(refreshRes.accessToken.length > 20);
    assert.ok(refreshRes.refreshToken !== loginRes.refreshToken);

    // El token anterior ahora debe estar revocado
    const oldHash = CryptoUtil.sha256(loginRes.refreshToken);
    const oldRecord = await repository.findRefreshToken(oldHash);
    assert.ok(oldRecord?.revokedAt !== null);
  });

  it('TC-AUTH-07: intento de reutilización de refresh token revocado invalida todas las sesiones', async () => {
    const { service } = await createFixture();
    const loginRes = await service.login('coordinador@servigest.ec', 'ServiGest2026*');

    // Primera rotación válida
    await service.refresh(loginRes.refreshToken);

    // Intento malicioso de reusar el token antiguo ya revocado
    await assert.rejects(
      async () => service.refresh(loginRes.refreshToken),
      (err: any) => err instanceof DomainError && err.code === 'REFRESH_INVALIDO' && err.httpStatus === 401
    );
  });

  it('TC-AUTH-09: forgot-password genera token de un uso sin revelar si el correo existe', async () => {
    const { service, repository, getResetToken } = await createFixture();

    await service.forgotPassword('coordinador@servigest.ec');
    const token = getResetToken();
    assert.ok(token && token.length > 20);

    const record = await repository.findPasswordResetToken(CryptoUtil.sha256(token!));
    assert.ok(record);
    assert.strictEqual(record?.userId, 'usr-1');

    let unknownCalled = false;
    const unknownRepo = new InMemoryAuthRepository();
    const unknownService = new AuthService(unknownRepo, {
      onPasswordResetRequested: () => {
        unknownCalled = true;
      },
    });
    await unknownService.forgotPassword('nadie@servigest.ec');
    assert.strictEqual(unknownCalled, false);
  });

  it('TC-AUTH-10: reset-password actualiza la contraseña, invalida sesiones y el token', async () => {
    const { service, repository, getResetToken } = await createFixture();
    const loginRes = await service.login('coordinador@servigest.ec', 'ServiGest2026*');

    await service.forgotPassword('coordinador@servigest.ec');
    const token = getResetToken()!;
    await service.resetPassword(token, 'NuevaClave2026*');

    const oldSession = await repository.findRefreshToken(
      CryptoUtil.sha256(loginRes.refreshToken)
    );
    assert.ok(oldSession?.revokedAt);

    const loginRes2 = await service.login('coordinador@servigest.ec', 'NuevaClave2026*');
    assert.ok(loginRes2.accessToken.length > 20);

    await assert.rejects(
      async () => service.resetPassword(token, 'OtraClave2026*'),
      (err: any) => err instanceof DomainError && err.code === 'TOKEN_INVALIDO'
    );
  });

  it('TC-AUTH-11: cambio de contraseña autenticado exige la contraseña actual', async () => {
    const { service } = await createFixture();

    await assert.rejects(
      async () => service.changePassword('usr-1', 'Incorrecta2026*', 'NuevaClave2026*'),
      (err: any) => err instanceof DomainError && err.code === 'CREDENCIALES_INVALIDAS'
    );

    await service.changePassword('usr-1', 'ServiGest2026*', 'NuevaClave2026*');
    const loginRes = await service.login('coordinador@servigest.ec', 'NuevaClave2026*');
    assert.strictEqual(loginRes.user.email, 'coordinador@servigest.ec');
  });

  it('TC-AUTH-12: actualización de perfil propio cambia nombre y teléfono', async () => {
    const { service } = await createFixture();

    const updated = await service.updateProfile('usr-1', {
      fullName: 'Ana Torres Actualizada',
      phone: '0991234567',
    });

    assert.strictEqual(updated.fullName, 'Ana Torres Actualizada');
    assert.strictEqual(updated.phone, '0991234567');
  });

  it('TC-AUTH-08: logout revoca el refresh token', async () => {
    const { service, repository } = await createFixture();
    const loginRes = await service.login('coordinador@servigest.ec', 'ServiGest2026*');

    await service.logout(loginRes.refreshToken);

    const hash = CryptoUtil.sha256(loginRes.refreshToken);
    const record = await repository.findRefreshToken(hash);
    assert.ok(record?.revokedAt !== null);
  });
});
