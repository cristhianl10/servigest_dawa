import type { RequestStatus } from '@servigest/shared';
import type { Role } from '@servigest/shared';
import type { TransitionAction } from '@servigest/shared';
import type { TransitionDto } from '@servigest/shared';
import { DomainError } from '../errors/domain-error.ts';

export interface TransitionRule {
  from: readonly RequestStatus[];
  to: RequestStatus;
  roles: readonly Role[];
  requiresAssignment?: boolean;
  requiredFields?: Array<'comment' | 'resolution' | 'reason'>;
  minLength?: Record<string, number>;
}

export const TRANSITIONS: Record<TransitionAction, TransitionRule> = {
  aprobar: {
    from: ['REGISTRADA'],
    to: 'APROBADA',
    roles: ['ADMIN', 'COORDINADOR'],
  },
  cancelar: {
    from: ['REGISTRADA', 'APROBADA', 'ASIGNADA', 'EN_PROCESO', 'PENDIENTE_INFO'],
    to: 'CANCELADA',
    roles: ['ADMIN', 'COORDINADOR', 'CLIENTE'],
    requiredFields: ['reason'],
    minLength: { reason: 10 },
  },
  asignar: {
    from: ['APROBADA'],
    to: 'ASIGNADA',
    roles: ['ADMIN', 'COORDINADOR'],
  },
  iniciar: {
    from: ['ASIGNADA'],
    to: 'EN_PROCESO',
    roles: ['TECNICO'],
    requiresAssignment: true,
  },
  solicitar_info: {
    from: ['ASIGNADA', 'EN_PROCESO'],
    to: 'PENDIENTE_INFO',
    roles: ['TECNICO', 'COORDINADOR'],
    requiresAssignment: true,
    requiredFields: ['comment'],
    minLength: { comment: 10 },
  },
  reanudar: {
    from: ['PENDIENTE_INFO'],
    to: 'EN_PROCESO',
    roles: ['TECNICO', 'COORDINADOR'],
    requiresAssignment: true,
  },
  resolver: {
    from: ['EN_PROCESO'],
    to: 'RESUELTA',
    roles: ['TECNICO'],
    requiresAssignment: true,
    requiredFields: ['resolution'],
    minLength: { resolution: 30 },
  },
  cerrar: {
    from: ['RESUELTA'],
    to: 'CERRADA',
    roles: ['ADMIN', 'COORDINADOR', 'CLIENTE'],
  },
  reabrir_trabajo: {
    from: ['RESUELTA'],
    to: 'EN_PROCESO',
    roles: ['COORDINADOR'],
    requiredFields: ['reason'],
    minLength: { reason: 10 },
  },
  reapertura: {
    from: ['CERRADA'],
    to: 'APROBADA',
    roles: ['ADMIN', 'COORDINADOR'],
    requiredFields: ['reason'],
    minLength: { reason: 20 },
  },
};

export interface ActorContext {
  id: string;
  role: Role;
  clientId?: string | null;
  technicianId?: string | null;
}

export interface ServiceRequestSnapshot {
  id: string;
  status: RequestStatus;
  clientId: string;
  assignedTechnicianId?: string | null;
  resolution?: string | null;
  version: number;
}

export function validateTransition(
  request: ServiceRequestSnapshot,
  input: TransitionDto,
  actor: ActorContext
): TransitionRule {
  // 1. Control de versión / concurrencia optimista (RN-08)
  if (request.version !== input.version) {
    throw new DomainError('CONFLICTO_VERSION', 409, 'La solicitud fue modificada por otro usuario. Recargue los datos.');
  }

  // 2. Regla de transición
  const rule = TRANSITIONS[input.action];
  if (!rule) {
    throw new DomainError('TRANSICION_INVALIDA', 409, `La acción '${input.action}' no es reconocida.`);
  }

  // 3. Estado origen permitido
  if (!rule.from.includes(request.status)) {
    if (request.status === 'CERRADA' && input.action !== 'reapertura') {
      throw new DomainError('SOLICITUD_CERRADA', 409, 'Una solicitud cerrada no puede modificarse sin reapertura autorizada.');
    }
    throw new DomainError(
      'TRANSICION_INVALIDA',
      409,
      `No se puede ejecutar '${input.action}' desde el estado '${request.status}'.`
    );
  }

  // 4. Rol con permiso
  if (!rule.roles.includes(actor.role)) {
    throw new DomainError('SIN_PERMISO', 403, `El rol ${actor.role} no tiene permiso para la acción '${input.action}'.`);
  }

  // 5. Restricción de cliente (solo puede cerrar o cancelar sus propias solicitudes - RN-03)
  if (actor.role === 'CLIENTE' && request.clientId !== actor.clientId) {
    throw new DomainError('RECURSO_NO_ENCONTRADO', 404, 'Solicitud no encontrada.');
  }

  // 6. Restricción de técnico (RN-02)
  if (rule.requiresAssignment) {
    if (!actor.technicianId || request.assignedTechnicianId !== actor.technicianId) {
      if (actor.role === 'TECNICO') {
        throw new DomainError('SIN_ASIGNACION', 403, 'Solo el técnico asignado a la solicitud puede realizar esta acción.');
      }
    }
  }

  // 7. Validación de campos obligatorios y longitudes mínimas
  if (rule.requiredFields) {
    for (const field of rule.requiredFields) {
      const val = (input as Record<string, unknown>)[field];
      if (typeof val !== 'string' || val.trim().length === 0) {
        throw new DomainError(
          field === 'resolution' ? 'RESOLUCION_REQUERIDA' : 'MOTIVO_REQUERIDO',
          422,
          `El campo '${field}' es obligatorio para la acción '${input.action}'.`
        );
      }
      const min = rule.minLength?.[field] ?? 0;
      if (val.trim().length < min) {
        throw new DomainError(
          'VALIDACION_FALLIDA',
          422,
          `El campo '${field}' debe tener al menos ${min} caracteres.`
        );
      }
    }
  }

  // 8. Validación de cierre (RN-01: No cerrar solicitudes sin resolución documentada previa)
  if (rule.to === 'CERRADA') {
    if (!request.resolution || request.resolution.trim().length < 30) {
      throw new DomainError('RESOLUCION_REQUERIDA', 422, 'No se puede cerrar una solicitud sin resolución documentada (mínimo 30 caracteres).');
    }
  }

  return rule;
}
