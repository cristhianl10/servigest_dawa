import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CatalogsService } from '../../../src/modules/catalogs/catalogs.service.ts';
import { InMemoryCatalogRepository } from '../../../src/modules/catalogs/catalogs.repository.ts';
import { DomainError } from '../../../src/domain/errors/domain-error.ts';

describe('Módulo de Catálogos y Parámetros (TC-CAT)', () => {
  function createFixture() {
    const repository = new InMemoryCatalogRepository({
      specialties: [
        {
          id: 1,
          code: 'REDES_COM',
          name: 'Redes y Telecomunicaciones',
          description: 'Cableado y fibra',
          status: 'ACTIVA',
        },
      ],
      categories: [
        {
          id: 1,
          code: 'FALLA_CONECTIVIDAD',
          name: 'Interrupción de Enlace o Falla de Red',
          specialtyId: 1,
          specialty: { id: 1, code: 'REDES_COM', name: 'Redes y Telecomunicaciones' },
          defaultPriority: 'ALTA',
          status: 'ACTIVA',
        },
      ],
      statuses: [
        { id: 1, code: 'REGISTRADA', name: 'Registrada', isTerminal: false, sortOrder: 1 },
        { id: 7, code: 'CERRADA', name: 'Cerrada', isTerminal: true, sortOrder: 7 },
      ],
      parameters: [
        {
          key: 'SLA_HORAS',
          value: { CRITICA: 4, ALTA: 8 },
          description: 'Horas de SLA por prioridad',
          updatedBy: null,
          updatedAt: new Date('2026-11-01T00:00:00Z'),
        },
      ],
      holidays: [{ date: '2026-07-24', name: 'Feriado de prueba' }],
    });
    const service = new CatalogsService(repository);
    return { repository, service };
  }

  it('TC-CAT-01: crea especialidad y rechaza código o nombre duplicado', async () => {
    const { service } = createFixture();
    const created = await service.createSpecialty({
      code: 'climatizacion',
      name: 'Climatización y Refrigeración',
    });
    assert.strictEqual(created.code, 'CLIMATIZACION');

    await assert.rejects(
      async () => service.createSpecialty({ code: 'CLIMATIZACION', name: 'Otra' }),
      (err: any) => err instanceof DomainError && err.code === 'ENTIDAD_EN_USO'
    );
    await assert.rejects(
      async () =>
        service.createSpecialty({
          code: 'OTRA',
          name: 'Climatización y Refrigeración',
        }),
      (err: any) => err instanceof DomainError && err.code === 'ENTIDAD_EN_USO'
    );
  });

  it('TC-CAT-02: baja lógica de especialidad', async () => {
    const { service } = createFixture();
    await service.deactivateSpecialty(1);
    const specialties = await service.listSpecialties();
    assert.strictEqual(specialties[0].status, 'INACTIVA');
  });

  it('TC-CAT-03: crea categoría validando especialidad existente', async () => {
    const { service } = createFixture();
    const created = await service.createCategory({
      code: 'caida_servidor',
      name: 'Caída de Servidor',
      specialtyId: 1,
      defaultPriority: 'CRITICA',
    });
    assert.strictEqual(created.code, 'CAIDA_SERVIDOR');

    await assert.rejects(
      async () =>
        service.createCategory({
          code: 'OTRA',
          name: 'Otra categoría',
          specialtyId: 99,
          defaultPriority: 'MEDIA',
        }),
      (err: any) => err instanceof DomainError && err.code === 'VALIDACION_FALLIDA'
    );
  });

  it('TC-CAT-04: lista estados en orden de flujo', async () => {
    const { service } = createFixture();
    const statuses = await service.listStatuses();
    assert.deepStrictEqual(
      statuses.map((status) => status.code),
      ['REGISTRADA', 'CERRADA']
    );
  });

  it('TC-CAT-05: actualiza parámetro auditando al usuario', async () => {
    const { service } = createFixture();
    const updated = await service.updateParameter(
      'SLA_HORAS',
      { value: { CRITICA: 2, ALTA: 6 }, description: 'SLA ajustado' },
      'usr-admin'
    );

    assert.deepStrictEqual(updated.value, { CRITICA: 2, ALTA: 6 });
    assert.strictEqual(updated.updatedBy, 'usr-admin');
    assert.strictEqual(updated.description, 'SLA ajustado');

    await assert.rejects(
      async () =>
        service.updateParameter('NO_EXISTE', { value: 1 }, 'usr-admin'),
      (err: any) => err instanceof DomainError && err.code === 'RECURSO_NO_ENCONTRADO'
    );
  });

  it('TC-CAT-06: gestiona feriados y evita duplicados', async () => {
    const { service } = createFixture();

    const created = await service.createHoliday({
      date: '2026-12-25',
      name: 'Navidad',
    });
    assert.strictEqual(created.date, '2026-12-25');

    await assert.rejects(
      async () => service.createHoliday({ date: '2026-12-25', name: 'Navidad' }),
      (err: any) => err instanceof DomainError && err.code === 'ENTIDAD_EN_USO'
    );

    const holidays = await service.listHolidays();
    assert.strictEqual(holidays.length, 2);

    await service.deleteHoliday('2026-12-25');
    assert.strictEqual((await service.listHolidays()).length, 1);
  });
});
