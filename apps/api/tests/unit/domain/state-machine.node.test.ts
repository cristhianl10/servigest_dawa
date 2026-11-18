import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  validateTransition,
  type ServiceRequestSnapshot,
  type ActorContext,
} from '../../../src/domain/state-machine/transitions.ts';
import { DomainError } from '../../../src/domain/errors/domain-error.ts';

describe('Máquina de Estados y Reglas de Negocio (RN-01 a RN-08 / T-051)', () => {
  const baseRequest: ServiceRequestSnapshot = {
    id: 'req-001',
    status: 'REGISTRADA',
    clientId: 'cli-001',
    assignedTechnicianId: null,
    resolution: null,
    version: 1,
  };

  const coordinadorActor: ActorContext = {
    id: 'usr-coord',
    role: 'COORDINADOR',
    clientId: null,
    technicianId: null,
  };

  const tecnicoActor: ActorContext = {
    id: 'usr-tec-1',
    role: 'TECNICO',
    clientId: null,
    technicianId: 'tec-001',
  };

  const clienteActor: ActorContext = {
    id: 'usr-cli-1',
    role: 'CLIENTE',
    clientId: 'cli-001',
    technicianId: null,
  };

  it('permite a un COORDINADOR aprobar una solicitud REGISTRADA', () => {
    const rule = validateTransition(
      baseRequest,
      { action: 'aprobar', version: 1 },
      coordinadorActor
    );
    assert.strictEqual(rule.to, 'APROBADA');
  });

  it('rechaza una transición no válida desde el estado actual (ej. REGISTRADA a EN_PROCESO)', () => {
    assert.throws(
      () => validateTransition(baseRequest, { action: 'iniciar', version: 1 }, tecnicoActor),
      (err: any) => err instanceof DomainError && err.code === 'TRANSICION_INVALIDA' && err.httpStatus === 409
    );
  });

  it('RN-08: rechaza con CONFLICTO_VERSION si la versión no coincide', () => {
    assert.throws(
      () => validateTransition(baseRequest, { action: 'aprobar', version: 2 }, coordinadorActor),
      (err: any) => err instanceof DomainError && err.code === 'CONFLICTO_VERSION' && err.httpStatus === 409
    );
  });

  it('rechaza con SIN_PERMISO si el rol no tiene autorización (CLIENTE aprobando)', () => {
    assert.throws(
      () => validateTransition(baseRequest, { action: 'aprobar', version: 1 }, clienteActor),
      (err: any) => err instanceof DomainError && err.code === 'SIN_PERMISO' && err.httpStatus === 403
    );
  });

  it('RN-02: rechaza con SIN_ASIGNACION si un técnico intenta iniciar solicitud no asignada a él', () => {
    const assignedRequest: ServiceRequestSnapshot = {
      ...baseRequest,
      status: 'ASIGNADA',
      assignedTechnicianId: 'tec-OTRO',
      version: 2,
    };

    assert.throws(
      () => validateTransition(assignedRequest, { action: 'iniciar', version: 2 }, tecnicoActor),
      (err: any) => err instanceof DomainError && err.code === 'SIN_ASIGNACION' && err.httpStatus === 403
    );
  });

  it('RN-01: rechaza el cierre si no existe resolución documentada (mínimo 30 caracteres)', () => {
    const resueltaSinResolucion: ServiceRequestSnapshot = {
      ...baseRequest,
      status: 'RESUELTA',
      resolution: null,
      version: 4,
    };

    assert.throws(
      () => validateTransition(resueltaSinResolucion, { action: 'cerrar', version: 4 }, coordinadorActor),
      (err: any) => err instanceof DomainError && err.code === 'RESOLUCION_REQUERIDA' && err.httpStatus === 422
    );
  });

  it('RN-04: rechaza cualquier modificación en solicitud CERRADA excepto reapertura autorizada', () => {
    const closedRequest: ServiceRequestSnapshot = {
      ...baseRequest,
      status: 'CERRADA',
      resolution: 'Resolución válida previa con más de 30 caracteres documentados.',
      version: 5,
    };

    assert.throws(
      () => validateTransition(closedRequest, { action: 'iniciar', version: 5 }, tecnicoActor),
      (err: any) => err instanceof DomainError && err.code === 'SOLICITUD_CERRADA' && err.httpStatus === 409
    );
  });

  it('RN-04: permite reapertura de solicitud CERRADA con motivo justificado >= 20 caracteres', () => {
    const closedRequest: ServiceRequestSnapshot = {
      ...baseRequest,
      status: 'CERRADA',
      resolution: 'Resolución previa documentada válida para el caso de prueba.',
      version: 5,
    };

    const rule = validateTransition(
      closedRequest,
      {
        action: 'reapertura',
        reason: 'El cliente reporta que la falla eléctrica persiste tras el cierre.',
        version: 5,
      },
      coordinadorActor
    );

    assert.strictEqual(rule.to, 'APROBADA');
  });
});
