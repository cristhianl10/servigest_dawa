import { describe, it } from 'node:test';
import assert from 'node:assert';
import { UsersService } from '../../../src/modules/users/users.service.ts';
import { InMemoryUsersRepository } from '../../../src/modules/users/users.repository.ts';
import { CryptoUtil } from '../../../src/modules/auth/crypto.util.ts';
import { DomainError } from '../../../src/domain/errors/domain-error.ts';
import type { UserRecord } from '../../../src/modules/users/users.service.ts';

describe('Módulo de Usuarios y Roles (TC-USR / RF-USR)', () => {
  async function createFixture() {
    const passwordHash = await CryptoUtil.hashPassword('ServiGest2026*');
    const base = {
      passwordHash,
      phone: null,
      clientId: null,
      status: 'ACTIVO' as const,
      mustChangePassword: false,
      failedAttempts: 0,
      lockedUntil: null,
      lastLoginAt: null,
      technicianId: null,
    };

    const users: UserRecord[] = [
      {
        ...base,
        id: 'usr-admin',
        email: 'admin@servigest.ec',
        fullName: 'Administrador General',
        role: 'ADMIN',
        createdAt: new Date('2026-11-01T10:00:00Z'),
      },
      {
        ...base,
        id: 'usr-coord',
        email: 'coordinador@servigest.ec',
        fullName: 'Ana Torres',
        role: 'COORDINADOR',
        createdAt: new Date('2026-11-02T10:00:00Z'),
      },
      {
        ...base,
        id: 'usr-cliente',
        email: 'cliente@servigest.ec',
        fullName: 'Carlos Benites',
        role: 'CLIENTE',
        clientId: '11111111-1111-1111-1111-111111111111',
        createdAt: new Date('2026-11-03T10:00:00Z'),
      },
    ];

    const repository = new InMemoryUsersRepository(users);
    const service = new UsersService(repository);
    return { repository, service };
  }

  it('TC-USR-01: lista usuarios con filtros, búsqueda y paginación', async () => {
    const { service } = await createFixture();

    const all = await service.list({ page: 1, pageSize: 20 });
    assert.strictEqual(all.total, 3);
    assert.strictEqual(all.items[0].email, 'cliente@servigest.ec');

    const onlyCoords = await service.list({ page: 1, pageSize: 20, role: 'COORDINADOR' });
    assert.strictEqual(onlyCoords.total, 1);
    assert.strictEqual(onlyCoords.items[0].role, 'COORDINADOR');

    const search = await service.list({ page: 1, pageSize: 20, search: 'ana' });
    assert.strictEqual(search.total, 1);

    const paged = await service.list({ page: 2, pageSize: 2 });
    assert.strictEqual(paged.items.length, 1);
    assert.strictEqual(paged.total, 3);
  });

  it('TC-USR-02: crea usuario con hash de contraseña temporal y cambio obligatorio', async () => {
    const { service } = await createFixture();

    const created = await service.create({
      email: 'tecnico2@servigest.ec',
      fullName: 'Luis Vera',
      phone: '0999999999',
      role: 'TECNICO',
      clientId: null,
      temporaryPassword: 'Temporal2026*',
    });

    assert.strictEqual(created.email, 'tecnico2@servigest.ec');
    assert.strictEqual(created.mustChangePassword, true);
    assert.strictEqual(created.status, 'ACTIVO');
    assert.notStrictEqual(created.passwordHash, 'Temporal2026*');
    assert.ok(await CryptoUtil.verifyPassword('Temporal2026*', created.passwordHash));
  });

  it('TC-USR-03: rechaza correo duplicado con 409 EMAIL_DUPLICADO', async () => {
    const { service } = await createFixture();

    await assert.rejects(
      async () =>
        service.create({
          email: 'ADMIN@servigest.ec',
          fullName: 'Otro Admin',
          role: 'ADMIN',
          clientId: null,
          temporaryPassword: 'Temporal2026*',
        }),
      (err: any) => err instanceof DomainError && err.code === 'EMAIL_DUPLICADO'
    );
  });

  it('TC-USR-04: valida coherencia entre rol CLIENTE y clientId', async () => {
    const { service } = await createFixture();

    await assert.rejects(
      async () =>
        service.create({
          email: 'cliente2@servigest.ec',
          fullName: 'Cliente Sin Empresa',
          role: 'CLIENTE',
          clientId: null,
          temporaryPassword: 'Temporal2026*',
        }),
      (err: any) => err instanceof DomainError && err.code === 'VALIDACION_FALLIDA'
    );

    await assert.rejects(
      async () =>
        service.create({
          email: 'tecnico3@servigest.ec',
          fullName: 'Técnico Con Empresa',
          role: 'TECNICO',
          clientId: '11111111-1111-1111-1111-111111111111',
          temporaryPassword: 'Temporal2026*',
        }),
      (err: any) => err instanceof DomainError && err.code === 'VALIDACION_FALLIDA'
    );
  });

  it('TC-USR-05: actualiza datos y estado de un usuario', async () => {
    const { service } = await createFixture();

    const updated = await service.update('usr-coord', {
      fullName: 'Ana Torres Gómez',
      phone: '0987654321',
      status: 'INACTIVO',
    });

    assert.strictEqual(updated.fullName, 'Ana Torres Gómez');
    assert.strictEqual(updated.phone, '0987654321');
    assert.strictEqual(updated.status, 'INACTIVO');
  });

  it('TC-USR-06: no permite desactivar al último ADMIN activo', async () => {
    const { service } = await createFixture();

    await assert.rejects(
      async () => service.deactivate('usr-admin'),
      (err: any) => err instanceof DomainError && err.code === 'ENTIDAD_EN_USO' && err.httpStatus === 409
    );

    await service.create({
      email: 'admin2@servigest.ec',
      fullName: 'Segundo Administrador',
      role: 'ADMIN',
      clientId: null,
      temporaryPassword: 'Temporal2026*',
    });

    await service.deactivate('usr-admin');
    const admin = await service.getById('usr-admin');
    assert.strictEqual(admin.status, 'INACTIVO');
  });

  it('TC-USR-07: expone catálogo de roles canónicos', () => {
    const service = new UsersService(new InMemoryUsersRepository());
    const roles = service.listRoles();

    assert.deepStrictEqual(
      roles.map((role) => role.code),
      ['ADMIN', 'COORDINADOR', 'TECNICO', 'CLIENTE']
    );
    assert.strictEqual(roles[0].name, 'Administrador del Sistema');
  });
});
