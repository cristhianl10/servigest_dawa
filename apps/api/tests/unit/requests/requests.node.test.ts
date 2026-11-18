import { describe, it } from 'node:test';
import assert from 'node:assert';
import { RequestsService } from '../../../src/modules/requests/requests.service.ts';
import { InMemoryRequestsRepository } from '../../../src/modules/requests/requests.repository.ts';
import { DomainError } from '../../../src/domain/errors/domain-error.ts';
import type { ActorContext } from '../../../src/domain/state-machine/transitions.ts';

describe('Módulo de Solicitudes, Asignaciones y Auditoría (TC-SOL / TC-ASI / TC-AUD)', () => {
  function createFixture() {
    const repository = new InMemoryRequestsRepository();
    const service = new RequestsService(repository);

    const clientActor: ActorContext = {
      id: 'usr-cli-1',
      role: 'CLIENTE',
      clientId: 'cli-001',
    };

    const coordActor: ActorContext = {
      id: 'usr-coord-1',
      role: 'COORDINADOR',
    };

    const techActor: ActorContext = {
      id: 'usr-tec-1',
      role: 'TECNICO',
      technicianId: 'tec-001',
    };

    return { repository, service, clientActor, coordActor, techActor };
  }

  it('TC-SOL-01: registro de solicitud genera código SOL-YYYYMM-##### y calcula dueAt automáticamente', async () => {
    const { service, clientActor } = createFixture();

    const request = await service.createRequest(
      {
        siteId: 'site-001',
        assetId: 'asset-001',
        categoryId: 1, // Redes (ALTA = 8h)
        priority: 'ALTA',
        description: 'Falla intermitente en enlace de fibra óptica principal de la sede.',
      },
      clientActor
    );

    assert.ok(request.code.startsWith('SOL-'));
    assert.strictEqual(request.clientId, 'cli-001');
    assert.strictEqual(request.status, 'REGISTRADA');
    assert.strictEqual(request.version, 1);
    assert.ok(request.dueAt instanceof Date);
  });

  it('TC-SOL-02: rechaza con SEDE_NO_PERTENECE_AL_CLIENTE si cliente intenta usar sede de otra empresa', async () => {
    const { service, clientActor, repository } = createFixture();

    // Registrar sede de otro cliente
    (repository as any).sites.set('site-ajena', {
      id: 'site-ajena',
      clientId: 'cli-OTRO',
      name: 'Sede Ajena',
      status: 'ACTIVA',
    });

    await assert.rejects(
      async () =>
        service.createRequest(
          {
            siteId: 'site-ajena',
            categoryId: 1,
            priority: 'MEDIA',
            description: 'Descripción válida de más de veinte caracteres para la prueba.',
          },
          clientActor
        ),
      (err: any) => err instanceof DomainError && err.code === 'SEDE_NO_PERTENECE_AL_CLIENTE' && err.httpStatus === 422
    );
  });

  it('TC-ASI-01: asignación de técnico idóneo valida especialidad requerida y pasa a ASIGNADA', async () => {
    const { service, clientActor, coordActor } = createFixture();

    const req = await service.createRequest(
      {
        siteId: 'site-001',
        categoryId: 1, // Especialidad 1 (Redes)
        priority: 'ALTA',
        description: 'Descripción de prueba para el flujo de asignación exitoso.',
      },
      clientActor
    );

    // Coordinador primero aprueba la solicitud
    await service.transitionStatus(req.id, { action: 'aprobar', version: 1 }, coordActor);

    // Asignación de técnico tec-001 (que tiene especialidad 1)
    const asg = await service.assignTechnician(
      req.id,
      { technicianId: 'tec-001', version: 2 },
      coordActor
    );

    assert.strictEqual(asg.status, 'VIGENTE');
    assert.strictEqual(asg.technicianId, 'tec-001');

    const updated = await service.getRequestById(req.id, coordActor);
    assert.strictEqual(updated.status, 'ASIGNADA');
    assert.strictEqual(updated.assignedTechnicianId, 'tec-001');
  });

  it('TC-ASI-02: rechaza asignación con ESPECIALIDAD_INCOMPATIBLE si el técnico carece de la especialidad (RN-05)', async () => {
    const { service, clientActor, coordActor, repository } = createFixture();

    // Crear técnico que solo sabe climatización (especialidad 2), no redes (especialidad 1)
    (repository as any).technicians.set('tec-clima', {
      id: 'tec-clima',
      userId: 'usr-tec-2',
      employeeCode: 'TEC-002',
      fullName: 'Técnico Climatización',
      userStatus: 'ACTIVO',
      availability: 'DISPONIBLE',
      maxConcurrentLoad: 5,
      specialtyIds: [2], // Solo climatización
    });

    const req = await service.createRequest(
      {
        siteId: 'site-001',
        categoryId: 1, // Requiere especialidad 1 (Redes)
        priority: 'ALTA',
        description: 'Descripción de prueba para validar compatibilidad técnica.',
      },
      clientActor
    );

    await service.transitionStatus(req.id, { action: 'aprobar', version: 1 }, coordActor);

    await assert.rejects(
      async () =>
        service.assignTechnician(
          req.id,
          { technicianId: 'tec-clima', version: 2 },
          coordActor
        ),
      (err: any) => err instanceof DomainError && err.code === 'ESPECIALIDAD_INCOMPATIBLE' && err.httpStatus === 409
    );
  });

  it('TC-ASI-03: reasignación requiere motivo >= 10 caracteres y cierra la asignación anterior (RN-11/12)', async () => {
    const { service, clientActor, coordActor, repository } = createFixture();

    // Agregar segundo técnico capacitado
    (repository as any).technicians.set('tec-002', {
      id: 'tec-002',
      userId: 'usr-tec-3',
      employeeCode: 'TEC-003',
      fullName: 'Técnico Redes',
      userStatus: 'ACTIVO',
      availability: 'DISPONIBLE',
      maxConcurrentLoad: 5,
      specialtyIds: [1, 3],
    });

    const req = await service.createRequest(
      {
        siteId: 'site-001',
        categoryId: 1,
        priority: 'ALTA',
        description: 'Descripción de prueba para reasignación con control de motivo.',
      },
      clientActor
    );

    await service.transitionStatus(req.id, { action: 'aprobar', version: 1 }, coordActor);
    await service.assignTechnician(req.id, { technicianId: 'tec-001', version: 2 }, coordActor);

    // Intentar reasignar sin motivo -> MOTIVO_REQUERIDO
    await assert.rejects(
      async () =>
        service.assignTechnician(req.id, { technicianId: 'tec-002', version: 3 }, coordActor),
      (err: any) => err instanceof DomainError && err.code === 'MOTIVO_REQUERIDO' && err.httpStatus === 422
    );

    // Reasignar con motivo válido >= 10 caracteres
    const reasg = await service.assignTechnician(
      req.id,
      {
        technicianId: 'tec-002',
        reason: 'El técnico anterior se encuentra en comisión de emergencia en otra sede.',
        version: 3,
      },
      coordActor
    );

    assert.strictEqual(reasg.technicianId, 'tec-002');
    assert.strictEqual(reasg.status, 'VIGENTE');

    // Verificar que solo hay 1 asignación activa (RN-12)
    const activeCount = await repository.countActiveAssignmentsForTechnician('tec-001');
    assert.strictEqual(activeCount, 0); // La anterior se cerró
  });

  it('TC-SOL-04: auditoría inmutable registra cada transición cronológicamente (RN-07)', async () => {
    const { service, clientActor, coordActor } = createFixture();

    const req = await service.createRequest(
      {
        siteId: 'site-001',
        categoryId: 1,
        priority: 'ALTA',
        description: 'Descripción de prueba para verificar trazabilidad de auditoría.',
      },
      clientActor
    );

    await service.transitionStatus(req.id, { action: 'aprobar', version: 1 }, coordActor);

    const history = await service.getHistory(req.id, coordActor);
    assert.strictEqual(history.length, 2);
    assert.strictEqual(history[0].action, 'CREACION');
    assert.strictEqual(history[1].action, 'TRANSICION');
    assert.strictEqual(history[1].toStatus, 'APROBADA');
  });

  it('TC-SOL-05: pausa y reanudación (PENDIENTE_INFO) extiende la fecha de vencimiento (RN-06)', async () => {
    const { service, clientActor, coordActor, techActor } = createFixture();

    const req = await service.createRequest(
      {
        siteId: 'site-001',
        categoryId: 1,
        priority: 'ALTA',
        description: 'Descripción de prueba para verificar recalculo de fecha por pausa.',
      },
      clientActor
    );

    await service.transitionStatus(req.id, { action: 'aprobar', version: 1 }, coordActor);
    await service.assignTechnician(req.id, { technicianId: 'tec-001', version: 2 }, coordActor);
    await service.transitionStatus(req.id, { action: 'iniciar', version: 3 }, techActor);

    const initialDueAt = (await service.getRequestById(req.id, coordActor)).dueAt;

    // Pausar
    await service.transitionStatus(
      req.id,
      {
        action: 'solicitar_info',
        comment: 'Se requiere autorización escrita del encargado de planta.',
        version: 4,
      },
      techActor
    );

    // Reanudar
    await service.transitionStatus(req.id, { action: 'reanudar', version: 5 }, techActor);

    const resumedRequest = await service.getRequestById(req.id, coordActor);
    assert.strictEqual(resumedRequest.status, 'EN_PROCESO');
    assert.strictEqual(resumedRequest.pausedAt, null);
    assert.ok(resumedRequest.dueAt.getTime() >= initialDueAt.getTime());
  });
});
