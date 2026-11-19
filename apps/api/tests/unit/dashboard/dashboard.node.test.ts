import { describe, it } from 'node:test';
import assert from 'node:assert';
import { DashboardService } from '../../../src/modules/dashboard/dashboard.service.ts';
import {
  InMemoryDashboardRepository,
  type DashboardRequestRecord,
} from '../../../src/modules/dashboard/dashboard.repository.ts';
import { DomainError } from '../../../src/domain/errors/domain-error.ts';
import type { DashboardQuery } from '@servigest/shared';

const NOW = new Date('2026-11-05T12:00:00Z');

function query(overrides: Partial<DashboardQuery> = {}): DashboardQuery {
  return {
    from: new Date('2026-11-01T00:00:00Z'),
    to: new Date('2026-11-10T00:00:00Z'),
    granularity: 'day',
    ...overrides,
  };
}

function request(
  overrides: Partial<DashboardRequestRecord> & Pick<DashboardRequestRecord, 'id'>
): DashboardRequestRecord {
  return {
    clientId: 'cli-a',
    categoryId: 1,
    assignedTechnicianId: 'tec-1',
    status: 'EN_PROCESO',
    priority: 'MEDIA',
    createdAt: new Date('2026-11-02T08:00:00Z'),
    resolvedAt: null,
    dueAt: new Date('2026-11-03T08:00:00Z'),
    slaPausedMinutes: 0,
    ...overrides,
  };
}

describe('Módulo de Dashboard (TC-DASH)', () => {
  function createFixture() {
    const requests: DashboardRequestRecord[] = [
      request({
        id: 'req-1',
        status: 'CERRADA',
        priority: 'ALTA',
        createdAt: new Date('2026-11-01T09:00:00Z'),
        resolvedAt: new Date('2026-11-01T15:00:00Z'),
        dueAt: new Date('2026-11-01T20:00:00Z'),
      }),
      request({
        id: 'req-2',
        status: 'RESUELTA',
        priority: 'CRITICA',
        categoryId: 2,
        createdAt: new Date('2026-11-02T08:00:00Z'),
        resolvedAt: new Date('2026-11-03T08:00:00Z'),
        dueAt: new Date('2026-11-02T12:00:00Z'),
      }),
      request({
        id: 'req-3',
        status: 'EN_PROCESO',
        priority: 'ALTA',
        createdAt: new Date('2026-11-02T10:00:00Z'),
        dueAt: new Date('2026-11-02T18:00:00Z'),
        slaPausedMinutes: 60,
      }),
      request({
        id: 'req-4',
        clientId: 'cli-b',
        assignedTechnicianId: 'tec-2',
        status: 'CERRADA',
        priority: 'MEDIA',
        createdAt: new Date('2026-10-31T10:00:00Z'),
        resolvedAt: new Date('2026-11-04T10:00:00Z'),
        dueAt: new Date('2026-11-04T20:00:00Z'),
        slaPausedMinutes: 120,
      }),
      request({
        id: 'req-5',
        status: 'CANCELADA',
        priority: 'BAJA',
        createdAt: new Date('2026-11-05T11:00:00Z'),
        dueAt: new Date('2026-11-06T11:00:00Z'),
      }),
      request({
        id: 'req-6',
        status: 'REGISTRADA',
        priority: 'MEDIA',
        createdAt: new Date('2026-11-15T11:00:00Z'),
        dueAt: new Date('2026-11-16T11:00:00Z'),
      }),
    ];

    const repository = new InMemoryDashboardRepository({
      requests,
      technicianLoad: [
        { technicianId: 'tec-1', fullName: 'Luis Vera', active: 3, capacity: 5 },
        { technicianId: 'tec-2', fullName: 'Mario Ruiz', active: 0, capacity: 4 },
      ],
    });

    return { service: new DashboardService(repository), repository };
  }

  it('TC-DASH-01: calcula indicadores por estado, prioridad y SLA', async () => {
    const { service } = createFixture();
    const data = await service.getOverview(query(), NOW);

    assert.deepStrictEqual(data.range, { from: '2026-11-01', to: '2026-11-10' });
    assert.deepStrictEqual(data.byStatus, [
      { status: 'EN_PROCESO', count: 1 },
      { status: 'RESUELTA', count: 1 },
      { status: 'CERRADA', count: 1 },
      { status: 'CANCELADA', count: 1 },
    ]);
    assert.deepStrictEqual(data.byPriority, [
      { priority: 'CRITICA', count: 1 },
      { priority: 'ALTA', count: 2 },
      { priority: 'BAJA', count: 1 },
    ]);
    assert.strictEqual(data.avgResolutionHours, 41.33);
    assert.deepStrictEqual(data.slaCompliance, {
      within: 2,
      total: 3,
      percentage: 66.67,
    });
    assert.strictEqual(data.overdue, 1);
  });

  it('TC-DASH-02: construye evolución diaria con creadas y resueltas', async () => {
    const { service } = createFixture();
    const data = await service.getOverview(query(), NOW);

    assert.strictEqual(data.evolution.length, 10);
    assert.deepStrictEqual(data.evolution[0], {
      date: '2026-11-01',
      created: 1,
      resolved: 1,
    });
    assert.deepStrictEqual(data.evolution[1], {
      date: '2026-11-02',
      created: 2,
      resolved: 0,
    });
    assert.deepStrictEqual(data.evolution[3], {
      date: '2026-11-04',
      created: 0,
      resolved: 1,
    });
    assert.deepStrictEqual(data.evolution[4], {
      date: '2026-11-05',
      created: 1,
      resolved: 0,
    });
  });

  it('TC-DASH-03: agrupa por semana cuando granularity=week', async () => {
    const { service } = createFixture();
    const data = await service.getEvolution(
      query({ granularity: 'week' })
    );

    const week1 = data.evolution.find((item) => item.date === '2026-10-26');
    const week2 = data.evolution.find((item) => item.date === '2026-11-02');
    assert.strictEqual(data.evolution.length, 3);
    assert.strictEqual(week1?.created, 1);
    assert.strictEqual(week1?.resolved, 1);
    assert.strictEqual(week2?.created, 3);
    assert.strictEqual(week2?.resolved, 2);
  });

  it('TC-DASH-04: aplica filtros de clientId y categoryId', async () => {
    const { service } = createFixture();

    const client = await service.getOverview(query({ clientId: 'cli-b' }), NOW);
    assert.deepStrictEqual(client.byStatus, []);

    const category = await service.getOverview(query({ categoryId: 2 }), NOW);
    assert.deepStrictEqual(category.byStatus, [{ status: 'RESUELTA', count: 1 }]);
  });

  it('TC-DASH-05: ordena carga de técnicos y calcula disponibilidad', async () => {
    const { service } = createFixture();
    const load = await service.getTechnicianLoad();

    assert.deepStrictEqual(load[0], {
      technicianId: 'tec-1',
      fullName: 'Luis Vera',
      active: 3,
      capacity: 5,
      available: 2,
    });
    assert.strictEqual(load[1].available, 4);
  });

  it('TC-DASH-06: resumen propio de cliente y técnico respeta su alcance', async () => {
    const { service } = createFixture();

    const client = await service.getMySummary(
      { id: 'usr-cli', role: 'CLIENTE', clientId: 'cli-b' },
      query(),
      NOW
    );
    assert.strictEqual(client.total, 0);

    const technician = await service.getMySummary(
      { id: 'usr-tec', role: 'TECNICO', technicianId: 'tec-1' },
      query(),
      NOW
    );
    assert.strictEqual(technician.total, 4);
    assert.strictEqual(technician.overdue, 1);
  });

  it('TC-DASH-07: rechaza perfiles incompletos sin perfil asociado', async () => {
    const { service } = createFixture();

    await assert.rejects(
      async () => service.getMySummary({ id: 'usr-tec', role: 'TECNICO' }, query(), NOW),
      (err: any) => err instanceof DomainError && err.code === 'SIN_PERMISO'
    );

    await assert.rejects(
      async () => service.getMySummary({ id: 'usr-cli', role: 'CLIENTE' }, query(), NOW),
      (err: any) => err instanceof DomainError && err.code === 'SIN_PERMISO'
    );
  });

  it('TC-DASH-08: valida rango invertido o mayor a 366 días', async () => {
    const { service } = createFixture();

    await assert.rejects(
      async () =>
        service.getOverview(
          query({
            from: new Date('2026-11-10T00:00:00Z'),
            to: new Date('2026-11-01T00:00:00Z'),
          }),
          NOW
        ),
      (err: any) => err instanceof DomainError && err.code === 'RANGO_INVALIDO'
    );

    await assert.rejects(
      async () =>
        service.getOverview(
          query({
            from: new Date('2025-01-01T00:00:00Z'),
            to: new Date('2026-11-01T00:00:00Z'),
          }),
          NOW
        ),
      (err: any) => err instanceof DomainError && err.code === 'RANGO_INVALIDO'
    );
  });

  it('TC-DASH-09: devuelve ceros y series vacías sin datos', async () => {
    const service = new DashboardService(new InMemoryDashboardRepository());

    const data = await service.getOverview(query(), NOW);
    assert.deepStrictEqual(data.byStatus, []);
    assert.deepStrictEqual(data.byPriority, []);
    assert.strictEqual(data.avgResolutionHours, 0);
    assert.deepStrictEqual(data.slaCompliance, { within: 0, total: 0, percentage: 0 });
    assert.strictEqual(data.overdue, 0);
    assert.strictEqual(data.evolution.every((item) => item.created === 0), true);
  });
});
