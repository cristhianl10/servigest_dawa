import { describe, it } from 'node:test';
import assert from 'node:assert';
import { NotificationsService } from '../../../src/modules/notifications/notifications.service.ts';
import {
  InMemoryNotificationRepository,
  type SeedNotification,
} from '../../../src/modules/notifications/notifications.repository.ts';
import { DomainError } from '../../../src/domain/errors/domain-error.ts';

describe('Módulo de Notificaciones (TC-NOT)', () => {
  function createFixture() {
    const notifications: SeedNotification[] = [
      {
        id: 'not-1',
        userId: 'usr-1',
        requestId: 'req-1',
        type: 'ASIGNACION',
        title: 'Solicitud asignada',
        body: 'SOL-202611-00001 fue asignada.',
        createdAt: new Date('2026-11-10T10:00:00Z'),
      },
      {
        id: 'not-2',
        userId: 'usr-1',
        requestId: 'req-2',
        type: 'CAMBIO_ESTADO',
        title: 'Solicitud resuelta',
        body: 'SOL-202611-00002 pasó a RESUELTA.',
        readAt: new Date('2026-11-09T12:00:00Z'),
        createdAt: new Date('2026-11-09T11:00:00Z'),
      },
      {
        id: 'not-3',
        userId: 'usr-2',
        type: 'INFO_REQUERIDA',
        title: 'Información requerida',
        body: 'Se requiere información adicional.',
        createdAt: new Date('2026-11-11T09:00:00Z'),
      },
      {
        id: 'not-4',
        userId: 'usr-1',
        requestId: 'req-3',
        type: 'CIERRE',
        title: 'Solicitud cerrada',
        body: 'SOL-202611-00003 fue cerrada.',
        createdAt: new Date('2026-11-08T08:00:00Z'),
      },
    ];
    const repository = new InMemoryNotificationRepository(notifications);
    const service = new NotificationsService(repository);
    return { repository, service };
  }

  it('TC-NOT-01: lista solo notificaciones propias con paginación', async () => {
    const { service } = createFixture();

    const result = await service.list('usr-1', { page: 1, pageSize: 20 });
    assert.strictEqual(result.total, 3);
    assert.strictEqual(result.unreadCount, 2);
    assert.deepStrictEqual(
      result.items.map((item) => item.id),
      ['not-1', 'not-2', 'not-4']
    );

    const page = await service.list('usr-1', { page: 2, pageSize: 2 });
    assert.deepStrictEqual(
      page.items.map((item) => item.id),
      ['not-4']
    );
  });

  it('TC-NOT-02: filtra únicamente no leídas', async () => {
    const { service } = createFixture();

    const result = await service.list('usr-1', {
      page: 1,
      pageSize: 20,
      unread: true,
    });
    assert.strictEqual(result.total, 2);
    assert.deepStrictEqual(
      result.items.map((item) => item.id),
      ['not-1', 'not-4']
    );
    assert.ok(result.items.every((item) => item.readAt === null));
  });

  it('TC-NOT-03: marca una notificación propia como leída', async () => {
    const { service } = createFixture();
    const readAt = new Date('2026-11-12T10:00:00Z');

    const updated = await service.markRead('usr-1', 'not-1', readAt);
    assert.strictEqual(updated.readAt?.toISOString(), readAt.toISOString());

    const result = await service.list('usr-1', { page: 1, pageSize: 20 });
    assert.strictEqual(result.unreadCount, 1);
  });

  it('TC-NOT-04: no permite leer notificaciones de otro usuario', async () => {
    const { service } = createFixture();

    await assert.rejects(
      async () => service.markRead('usr-1', 'not-3'),
      (err: any) => err instanceof DomainError && err.code === 'RECURSO_NO_ENCONTRADO'
    );

    await assert.rejects(
      async () => service.markRead('usr-1', 'no-existe'),
      (err: any) => err instanceof DomainError && err.code === 'RECURSO_NO_ENCONTRADO'
    );
  });

  it('TC-NOT-05: marcar como leída es idempotente y conserva la fecha original', async () => {
    const { service } = createFixture();
    const first = await service.markRead('usr-1', 'not-1', new Date('2026-11-12T10:00:00Z'));
    const second = await service.markRead('usr-1', 'not-1', new Date('2026-11-13T10:00:00Z'));

    assert.strictEqual(second.readAt?.toISOString(), first.readAt?.toISOString());
  });

  it('TC-NOT-06: marca todas como leídas solo para el usuario autenticado', async () => {
    const { service } = createFixture();
    const readAt = new Date('2026-11-12T10:00:00Z');

    const count = await service.markAllRead('usr-1', readAt);
    assert.strictEqual(count, 2);

    const own = await service.list('usr-1', { page: 1, pageSize: 20 });
    assert.strictEqual(own.unreadCount, 0);

    const other = await service.list('usr-2', { page: 1, pageSize: 20 });
    assert.strictEqual(other.unreadCount, 1);
    assert.strictEqual(await service.markAllRead('usr-1', readAt), 0);
  });
});
