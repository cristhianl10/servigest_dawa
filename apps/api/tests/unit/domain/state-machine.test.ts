import { describe, it, expect } from 'vitest';
import {
  validateTransition,
  ServiceRequestSnapshot,
  ActorContext,
} from '../../../src/domain/state-machine/transitions';
import { DomainError } from '../../../src/domain/errors/domain-error';

describe('Máquina de Estados - Transiciones y Reglas de Negocio (RN-01 a RN-08)', () => {
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
    expect(rule.to).toBe('APROBADA');
  });

  it('rechaza una transición no válida desde el estado actual (ej. REGISTRADA a EN_PROCESO)', () => {
    expect(() =>
      validateTransition(
        baseRequest,
        { action: 'iniciar', version: 1 },
        tecnicoActor
      )
    ).toThrow(DomainError);

    try {
      validateTransition(baseRequest, { action: 'iniciar', version: 1 }, tecnicoActor);
    } catch (err: any) {
      expect(err.code).toBe('TRANSICION_INVALIDA');
      expect(err.httpStatus).toBe(409);
    }
  });

  it('rechaza con CONFLICTO_VERSION si la versión no coincide (RN-08)', () => {
    expect(() =>
      validateTransition(
        baseRequest,
        { action: 'aprobar', version: 2 }, // versión incorrecta
        coordinadorActor
      )
    ).toThrow(DomainError);

    try {
      validateTransition(baseRequest, { action: 'aprobar', version: 2 }, coordinadorActor);
    } catch (err: any) {
      expect(err.code).toBe('CONFLICTO_VERSION');
      expect(err.httpStatus).toBe(409);
    }
  });

  it('rechaza con SIN_PERMISO si el rol no tiene autorización (ej. CLIENTE intentando aprobar)', () => {
    expect(() =>
      validateTransition(
        baseRequest,
        { action: 'aprobar', version: 1 },
        clienteActor
      )
    ).toThrow(DomainError);

    try {
      validateTransition(baseRequest, { action: 'aprobar', version: 1 }, clienteActor);
    } catch (err: any) {
      expect(err.code).toBe('SIN_PERMISO');
      expect(err.httpStatus).toBe(403);
    }
  });

  it('RN-02: rechaza con SIN_ASIGNACION si un técnico intenta iniciar una solicitud que no le fue asignada', () => {
    const assignedRequest: ServiceRequestSnapshot = {
      ...baseRequest,
      status: 'ASIGNADA',
      assignedTechnicianId: 'tec-OTRO',
      version: 2,
    };

    expect(() =>
      validateTransition(
        assignedRequest,
        { action: 'iniciar', version: 2 },
        tecnicoActor
      )
    ).toThrow(DomainError);

    try {
      validateTransition(assignedRequest, { action: 'iniciar', version: 2 }, tecnicoActor);
    } catch (err: any) {
      expect(err.code).toBe('SIN_ASIGNACION');
      expect(err.httpStatus).toBe(403);
    }
  });

  it('RN-01: rechaza el cierre si no existe resolución documentada (mínimo 30 caracteres)', () => {
    const resueltaSinResolucion: ServiceRequestSnapshot = {
      ...baseRequest,
      status: 'RESUELTA',
      resolution: null,
      version: 4,
    };

    expect(() =>
      validateTransition(
        resueltaSinResolucion,
        { action: 'cerrar', version: 4 },
        coordinadorActor
      )
    ).toThrow(DomainError);

    try {
      validateTransition(resueltaSinResolucion, { action: 'cerrar', version: 4 }, coordinadorActor);
    } catch (err: any) {
      expect(err.code).toBe('RESOLUCION_REQUERIDA');
      expect(err.httpStatus).toBe(422);
    }
  });

  it('RN-04: rechaza cualquier modificación en solicitud CERRADA excepto reapertura autorizada', () => {
    const closedRequest: ServiceRequestSnapshot = {
      ...baseRequest,
      status: 'CERRADA',
      resolution: 'Resolución válida previa con más de 30 caracteres documentados.',
      version: 5,
    };

    expect(() =>
      validateTransition(
        closedRequest,
        { action: 'iniciar', version: 5 },
        tecnicoActor
      )
    ).toThrow(DomainError);

    try {
      validateTransition(closedRequest, { action: 'iniciar', version: 5 }, tecnicoActor);
    } catch (err: any) {
      expect(err.code).toBe('SOLICITUD_CERRADA');
      expect(err.httpStatus).toBe(409);
    }
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

    expect(rule.to).toBe('APROBADA');
  });
});
