import { describe, it } from 'node:test';
import assert from 'node:assert';
import { TechniciansService } from '../../../src/modules/technicians/technicians.service.ts';
import { InMemoryTechnicianRepository } from '../../../src/modules/technicians/technicians.repository.ts';
import { DomainError } from '../../../src/domain/errors/domain-error.ts';

describe('Módulo de Técnicos y Especialidades (TC-TEC / RF-TEC)', () => {
  function createFixture() {
    const now = new Date('2026-11-01T10:00:00Z');
    const repository = new InMemoryTechnicianRepository({
      users: [
        {
          id: 'usr-tec-1',
          fullName: 'Luis Vera',
          email: 'tecnico@servigest.ec',
          role: 'TECNICO',
          status: 'ACTIVO',
        },
        {
          id: 'usr-tec-2',
          fullName: 'Mario Ruiz',
          email: 'tecnico2@servigest.ec',
          role: 'TECNICO',
          status: 'ACTIVO',
        },
        {
          id: 'usr-coord',
          fullName: 'Ana Torres',
          email: 'coordinador@servigest.ec',
          role: 'COORDINADOR',
          status: 'ACTIVO',
        },
      ],
      specialties: [
        { id: 1, code: 'REDES_COM', name: 'Redes y Telecomunicaciones' },
        { id: 2, code: 'CLIMATIZACION', name: 'Climatización y Refrigeración' },
        { id: 3, code: 'SERVIDORES', name: 'Servidores y Centros de Datos' },
      ],
      technicians: [
        {
          id: 'tec-1',
          userId: 'usr-tec-1',
          employeeCode: 'TEC-001',
          availability: 'DISPONIBLE',
          maxConcurrentLoad: 5,
          createdAt: now,
          updatedAt: now,
          specialties: [
            {
              specialtyId: 1,
              code: 'REDES_COM',
              name: 'Redes y Telecomunicaciones',
              level: 'AVANZADO',
            },
            {
              specialtyId: 3,
              code: 'SERVIDORES',
              name: 'Servidores y Centros de Datos',
              level: 'AVANZADO',
            },
          ],
        },
      ],
      activeLoads: { 'tec-1': 2 },
    });
    const service = new TechniciansService(repository);
    return { repository, service };
  }

  it('TC-TEC-01: lista técnicos con filtros y carga vigente', async () => {
    const { service } = createFixture();
    const actor = { id: 'usr-admin', role: 'ADMIN' as const };

    const all = await service.list({ page: 1, pageSize: 20 }, actor);
    assert.strictEqual(all.total, 1);
    assert.strictEqual(all.items[0].activeLoad, 2);
    assert.strictEqual(all.items[0].specialties.length, 2);

    const bySpecialty = await service.list(
      { page: 1, pageSize: 20, specialtyId: 1 },
      actor
    );
    assert.strictEqual(bySpecialty.total, 1);

    const byOtherSpecialty = await service.list(
      { page: 1, pageSize: 20, specialtyId: 2 },
      actor
    );
    assert.strictEqual(byOtherSpecialty.total, 0);
  });

  it('TC-TEC-02: un TECNICO solo puede listar y consultar su propio perfil', async () => {
    const { service } = createFixture();
    const own = { id: 'usr-tec-1', role: 'TECNICO' as const, technicianId: 'tec-1' };
    const other = { id: 'usr-tec-2', role: 'TECNICO' as const, technicianId: 'tec-2' };

    const ownList = await service.list({ page: 1, pageSize: 20 }, own);
    assert.strictEqual(ownList.total, 1);

    const otherList = await service.list({ page: 1, pageSize: 20 }, other);
    assert.strictEqual(otherList.total, 0);

    await assert.rejects(
      async () => service.getById('tec-1', other),
      (err: any) => err instanceof DomainError && err.code === 'SIN_PERMISO'
    );
  });

  it('TC-TEC-03: crea técnico vinculado a usuario TECNICO con especialidades', async () => {
    const { service } = createFixture();

    const technician = await service.create({
      userId: 'usr-tec-2',
      employeeCode: 'TEC-002',
      maxConcurrentLoad: 4,
      availability: 'DISPONIBLE',
      specialties: [{ specialtyId: 2, level: 'INTERMEDIO' }],
    });

    assert.strictEqual(technician.employeeCode, 'TEC-002');
    assert.strictEqual(technician.specialties[0].name, 'Climatización y Refrigeración');
    assert.strictEqual(technician.activeLoad, 0);
  });

  it('TC-TEC-04: rechaza usuario con rol distinto o código duplicado', async () => {
    const { service } = createFixture();

    await assert.rejects(
      async () =>
        service.create({
          userId: 'usr-coord',
          employeeCode: 'TEC-003',
          maxConcurrentLoad: 5,
          availability: 'DISPONIBLE',
          specialties: [{ specialtyId: 1, level: 'BASICO' }],
        }),
      (err: any) => err instanceof DomainError && err.code === 'VALIDACION_FALLIDA'
    );

    await assert.rejects(
      async () =>
        service.create({
          userId: 'usr-tec-2',
          employeeCode: 'TEC-001',
          maxConcurrentLoad: 5,
          availability: 'DISPONIBLE',
          specialties: [{ specialtyId: 1, level: 'BASICO' }],
        }),
      (err: any) => err instanceof DomainError && err.code === 'ENTIDAD_EN_USO'
    );
  });

  it('TC-TEC-05: exige al menos una especialidad existente', async () => {
    const { service } = createFixture();

    await assert.rejects(
      async () =>
        service.create({
          userId: 'usr-tec-2',
          employeeCode: 'TEC-004',
          maxConcurrentLoad: 5,
          availability: 'DISPONIBLE',
          specialties: [],
        }),
      (err: any) => err instanceof DomainError && err.code === 'TECNICO_SIN_ESPECIALIDAD'
    );

    await assert.rejects(
      async () =>
        service.create({
          userId: 'usr-tec-2',
          employeeCode: 'TEC-005',
          maxConcurrentLoad: 5,
          availability: 'DISPONIBLE',
          specialties: [{ specialtyId: 99, level: 'BASICO' }],
        }),
      (err: any) => err instanceof DomainError && err.code === 'VALIDACION_FALLIDA'
    );
  });

  it('TC-TEC-06: consulta carga y calcula cupos disponibles', async () => {
    const { service } = createFixture();

    const load = await service.getLoad('tec-1', { id: 'usr-admin', role: 'ADMIN' });
    assert.strictEqual(load.vigentes, 2);
    assert.strictEqual(load.maximo, 5);
    assert.strictEqual(load.cuposDisponibles, 3);
    assert.strictEqual(load.disponible, true);
  });

  it('TC-TEC-07: actualiza disponibilidad, carga y especialidades', async () => {
    const { service } = createFixture();

    const updated = await service.update('tec-1', {
      availability: 'NO_DISPONIBLE',
      maxConcurrentLoad: 3,
    });
    assert.strictEqual(updated.availability, 'NO_DISPONIBLE');
    assert.strictEqual(updated.maxConcurrentLoad, 3);

    const replaced = await service.replaceSpecialties('tec-1', [
      { specialtyId: 2, level: 'AVANZADO' },
    ]);
    assert.strictEqual(replaced.specialties.length, 1);
    assert.strictEqual(replaced.specialties[0].specialtyId, 2);
  });

  it('TC-TEC-08: desactiva técnico y su usuario asociado', async () => {
    const { service, repository } = createFixture();

    await service.deactivate('tec-1');
    const technician = await repository.findById('tec-1');
    const user = await repository.findUser('usr-tec-1');

    assert.strictEqual(technician?.availability, 'NO_DISPONIBLE');
    assert.strictEqual(user?.status, 'INACTIVO');
  });
});
