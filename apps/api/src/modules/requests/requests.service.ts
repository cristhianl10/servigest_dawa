import {
  CreateRequestDto,
  EditRequestDto,
  TransitionDto,
  AssignTechnicianDto,
  ReopenRequestDto,
  RequestStatus,
  RequestListFilter,
} from '@servigest/shared';
import type { NotificationType } from '@servigest/shared';
import type { Priority } from '@servigest/shared';
import { DomainError } from '../../domain/errors/domain-error.ts';
import {
  validateTransition,
  ActorContext,
} from '../../domain/state-machine/transitions.ts';
import { SlaEngine, DEFAULT_SLA_CONFIG } from '../../domain/sla/sla-engine.ts';
import {
  IRequestsRepository,
  ServiceRequestRecord,
  RequestAssignmentRecord,
  RequestDetailRecord,
  RequestListItem,
  RequestHistoryDetailRecord,
  RequestNotificationInput,
  RequestNotificationRecord,
  RequestListQuery,
} from './requests.repository.ts';
import { sseHub } from '../../infrastructure/sse/sse-hub.ts';

const OPEN_STATUSES: readonly RequestStatus[] = [
  'REGISTRADA',
  'APROBADA',
  'ASIGNADA',
  'EN_PROCESO',
  'PENDIENTE_INFO',
];

interface SlaContext {
  engine: SlaEngine;
  hours: Partial<Record<Priority, number>>;
}

export class RequestsService {
  private readonly repository: IRequestsRepository;

  constructor(repository: IRequestsRepository) {
    this.repository = repository;
  }

  public async createRequest(
    input: CreateRequestDto,
    actor: ActorContext
  ): Promise<RequestDetailRecord> {
    return this.repository.transaction(async (repo) => {
      const category = await repo.findCategory(input.categoryId);
      if (!category || category.status !== 'ACTIVA') {
        throw new DomainError(
          'CATEGORIA_INVALIDA',
          422,
          'La categoría seleccionada no es válida o está inactiva.'
        );
      }

      const site = await repo.findSite(input.siteId);
      if (!site || site.status !== 'ACTIVA') {
        throw new DomainError('SEDE_NO_ENCONTRADA', 404, 'La sede especificada no existe o no está activa.');
      }

      let clientId = site.clientId;
      if (actor.role === 'CLIENTE') {
        if (!actor.clientId || site.clientId !== actor.clientId) {
          throw new DomainError(
            'SEDE_NO_PERTENECE_AL_CLIENTE',
            422,
            'La sede no pertenece a su organización.'
          );
        }
        clientId = actor.clientId;
      }

      if (input.assetId) {
        const asset = await repo.findAsset(input.assetId);
        if (!asset || asset.siteId !== site.id) {
          throw new DomainError('EQUIPO_INVALIDO', 422, 'El equipo no pertenece a la sede seleccionada.');
        }
      }

      const now = new Date();
      const period = this.currentPeriod(now);
      const code = await repo.getNextCode(period);
      const sla = await this.loadSla(repo);
      const dueAt = sla.engine.calculateDueAt(
        now,
        input.priority,
        0,
        sla.hours[input.priority]
      );
      const statusId = await repo.getStatusId('REGISTRADA');

      const created = await repo.createRequest({
        code,
        clientId,
        siteId: input.siteId,
        assetId: input.assetId ?? null,
        categoryId: input.categoryId,
        priority: input.priority,
        status: 'REGISTRADA',
        statusId,
        description: input.description,
        createdBy: actor.id,
        assignedTechnicianId: null,
        dueAt,
        slaPausedMinutes: 0,
        pausedAt: null,
        approvedAt: null,
        assignedAt: null,
        startedAt: null,
        resolvedAt: null,
        closedAt: null,
        version: 1,
        createdAt: now,
        updatedAt: now,
      });

      await repo.createHistory({
        requestId: created.id,
        actorId: actor.id,
        action: 'CREACION',
        fromStatus: null,
        toStatus: 'REGISTRADA',
        comment: input.description,
        metadata: null,
        createdAt: now,
      });

      const staff = await repo.findUserIdsByRoles(['ADMIN', 'COORDINADOR']);
      const notifications = await repo.createNotifications(
        this.dedupeRecipients([actor.id, ...staff]).map((userId) => ({
          userId,
          requestId: created.id,
          type: 'SOLICITUD_REGISTRADA' as NotificationType,
          title: 'Nueva solicitud registrada',
          body: `Solicitud ${created.code} creada con prioridad ${created.priority}.`,
        }))
      );

      const detail = await repo.getRequestDetail(created.id);
      const result = detail ?? this.fallbackDetail(created);

      this.publishNotifications(notifications);
      return result;
    });
  }

  public async transitionStatus(
    requestId: string,
    input: TransitionDto,
    actor: ActorContext
  ): Promise<RequestDetailRecord> {
    return this.repository.transaction(async (repo) => {
      const request = await repo.lockRequestById(requestId);
      if (!request) {
        throw new DomainError('RECURSO_NO_ENCONTRADO', 404, 'Solicitud no encontrada.');
      }

      if (input.action === 'asignar') {
        throw new DomainError(
          'TRANSICION_INVALIDA',
          409,
          'La asignación debe realizarse mediante POST /api/solicitudes/:id/asignaciones.'
        );
      }

      const rule = validateTransition(
        {
          id: request.id,
          status: request.status,
          clientId: request.clientId,
          assignedTechnicianId: request.assignedTechnicianId,
          resolution: request.resolution,
          version: request.version,
        },
        input,
        actor
      );

      if (rule.requiresAssignment) {
        const activeAssignment = await repo.findActiveAssignment(requestId);
        if (!activeAssignment || activeAssignment.technicianId !== request.assignedTechnicianId) {
          throw new DomainError(
            'SIN_ASIGNACION',
            403,
            'La solicitud no cuenta con una asignación vigente para ejecutar esta acción.'
          );
        }
      }

      const now = new Date();
      const updates: Partial<ServiceRequestRecord> = {
        status: rule.to,
        statusId: await repo.getStatusId(rule.to),
        version: request.version + 1,
      };

      let closeCurrentAssignment = false;

      if (rule.to === 'APROBADA') {
        updates.approvedAt = request.approvedAt ?? now;
        if (input.action === 'reapertura') {
          updates.closedAt = null;
          updates.resolvedAt = null;
          updates.startedAt = null;
          updates.assignedAt = null;
          updates.assignedTechnicianId = null;
          updates.pausedAt = null;
          closeCurrentAssignment = true;
        }
      }

      if (rule.to === 'EN_PROCESO') {
        if (input.action === 'reanudar' && request.pausedAt) {
          const sla = await this.loadSla(repo);
          const pausedMinutes = sla.engine.calculateBusinessMinutesBetween(request.pausedAt, now);
          const totalPaused = request.slaPausedMinutes + pausedMinutes;
          updates.slaPausedMinutes = totalPaused;
          updates.pausedAt = null;
          updates.dueAt = sla.engine.calculateDueAt(
            request.createdAt,
            request.priority,
            totalPaused,
            sla.hours[request.priority]
          );
        }
        if (input.action === 'reabrir_trabajo') {
          updates.resolvedAt = null;
        }
        updates.startedAt = request.startedAt ?? now;
      }

      if (rule.to === 'PENDIENTE_INFO') {
        updates.pausedAt = now;
      }

      if (rule.to === 'RESUELTA') {
        updates.resolvedAt = now;
        updates.resolution = input.resolution ?? null;
        updates.pausedAt = null;
      }

      if (rule.to === 'CERRADA') {
        updates.closedAt = now;
        closeCurrentAssignment = true;
      }

      if (rule.to === 'CANCELADA') {
        updates.cancellationReason = input.reason ?? null;
        closeCurrentAssignment = true;
      }

      if (closeCurrentAssignment) {
        const activeAssignment = await repo.findActiveAssignment(requestId);
        if (activeAssignment) {
          await repo.closeAssignment(activeAssignment.id, now);
        }
      }

      const updated = await repo.updateRequest(requestId, updates);

      await repo.createHistory({
        requestId,
        actorId: actor.id,
        action: input.action === 'reapertura' ? 'REAPERTURA' : 'TRANSICION',
        fromStatus: request.status,
        toStatus: rule.to,
        comment: input.comment ?? input.reason ?? input.resolution ?? null,
        metadata: { action: input.action },
        createdAt: now,
      });

      const recipientIds = [request.createdBy];
      const technicianUserId = request.assignedTechnicianId
        ? await repo.getTechnicianUserId(request.assignedTechnicianId)
        : null;
      if (technicianUserId) recipientIds.push(technicianUserId);

      const notificationType = this.notificationTypeForTransition(input.action, rule.to);
      const notifications = await repo.createNotifications(
        this.dedupeRecipients(recipientIds).map((userId) => ({
          userId,
          requestId,
          type: notificationType,
          title: this.notificationTitle(rule.to),
          body: `${updated.code}: ${request.status} → ${rule.to}.`,
        }))
      );

      const detail = await repo.getRequestDetail(requestId);
      const result = detail ?? this.fallbackDetail(updated);

      this.publishNotifications(notifications);
      return result;
    });
  }

  public async assignTechnician(
    requestId: string,
    input: AssignTechnicianDto,
    actor: ActorContext
  ): Promise<RequestAssignmentRecord> {
    return this.repository.transaction(async (repo) => {
      const request = await repo.lockRequestById(requestId);
      if (!request) {
        throw new DomainError('RECURSO_NO_ENCONTRADO', 404, 'Solicitud no encontrada.');
      }

      if (request.version !== input.version) {
        throw new DomainError(
          'CONFLICTO_VERSION',
          409,
          'La solicitud fue modificada por otro usuario. Recargue los datos.'
        );
      }

      if (!['APROBADA', 'ASIGNADA'].includes(request.status)) {
        throw new DomainError(
          'TRANSICION_INVALIDA',
          409,
          `No se puede asignar una solicitud en estado ${request.status}.`
        );
      }

      const technician = await repo.findTechnician(input.technicianId);
      if (
        !technician ||
        technician.userStatus !== 'ACTIVO' ||
        technician.availability !== 'DISPONIBLE'
      ) {
        throw new DomainError(
          'TECNICO_NO_DISPONIBLE',
          409,
          'El técnico no existe, está inactivo o no se encuentra disponible.'
        );
      }

      const category = await repo.findCategory(request.categoryId);
      if (!category || !technician.specialtyIds.includes(category.specialtyId)) {
        throw new DomainError(
          'ESPECIALIDAD_INCOMPATIBLE',
          409,
          'El técnico no posee la especialidad requerida para este servicio.'
        );
      }

      const current = await repo.findActiveAssignment(requestId);
      if (current && current.technicianId === technician.id) {
        throw new DomainError(
          'ASIGNACION_VIGENTE',
          409,
          'El técnico ya cuenta con una asignación vigente para esta solicitud.'
        );
      }

      if (current && (!input.reason || input.reason.trim().length < 10)) {
        throw new DomainError(
          'MOTIVO_REQUERIDO',
          422,
          'La reasignación requiere un motivo justificado (mínimo 10 caracteres).'
        );
      }

      const activeLoad = await repo.countActiveAssignmentsForTechnician(technician.id);
      if (activeLoad >= technician.maxConcurrentLoad) {
        throw new DomainError(
          'CARGA_EXCEDIDA',
          409,
          'El técnico ha alcanzado su límite de carga concurrente máxima.'
        );
      }

      const now = new Date();
      if (current) {
        await repo.closeAssignment(current.id, now);
      }

      const assignment = await repo.createAssignment({
        requestId,
        technicianId: technician.id,
        assignedBy: actor.id,
        reason: input.reason ?? null,
        status: 'VIGENTE',
        assignedAt: now,
        endedAt: null,
      });

      const statusId = await repo.getStatusId('ASIGNADA');
      await repo.updateRequest(requestId, {
        assignedTechnicianId: technician.id,
        assignedAt: now,
        status: 'ASIGNADA',
        statusId,
        version: request.version + 1,
      });

      await repo.createHistory({
        requestId,
        actorId: actor.id,
        action: current ? 'REASIGNACION' : 'ASIGNACION',
        fromStatus: request.status,
        toStatus: 'ASIGNADA',
        comment: input.reason ?? 'Asignación de técnico responsable',
        metadata: {
          previousTechnicianId: current?.technicianId ?? null,
          technicianId: technician.id,
          employeeCode: technician.employeeCode,
        },
        createdAt: now,
      });

      const recipientIds = [technician.userId, request.createdBy];
      if (current) {
        const previousUserId = await repo.getTechnicianUserId(current.technicianId);
        if (previousUserId) recipientIds.push(previousUserId);
      }

      const notifications = await repo.createNotifications(
        this.dedupeRecipients(recipientIds).map((userId) => ({
          userId,
          requestId,
          type: 'ASIGNACION' as NotificationType,
          title: current ? 'Solicitud reasignada' : 'Nueva solicitud asignada',
          body: `La solicitud ${request.code} fue asignada a ${technician.fullName}.`,
        }))
      );

      this.publishNotifications(notifications);
      return assignment;
    });
  }

  public async editRequest(
    requestId: string,
    input: EditRequestDto,
    actor: ActorContext
  ): Promise<RequestDetailRecord> {
    return this.repository.transaction(async (repo) => {
      const request = await repo.lockRequestById(requestId);
      if (!request) {
        throw new DomainError('RECURSO_NO_ENCONTRADO', 404, 'Solicitud no encontrada.');
      }

      this.assertCanView(request, actor);

      if (request.version !== input.version) {
        throw new DomainError(
          'CONFLICTO_VERSION',
          409,
          'La solicitud fue modificada por otro usuario. Recargue los datos.'
        );
      }

      if (!OPEN_STATUSES.includes(request.status)) {
        throw new DomainError(
          request.status === 'CERRADA' ? 'SOLICITUD_CERRADA' : 'TRANSICION_INVALIDA',
          409,
          'La solicitud no puede editarse en su estado actual.'
        );
      }

      if (actor.role === 'CLIENTE' && request.status !== 'REGISTRADA') {
        throw new DomainError(
          'SIN_PERMISO',
          403,
          'El cliente solo puede editar solicitudes en estado REGISTRADA.'
        );
      }

      const changesCategoryOrAsset =
        input.categoryId !== undefined || input.assetId !== undefined;
      if (
        changesCategoryOrAsset &&
        !['REGISTRADA', 'APROBADA'].includes(request.status)
      ) {
        throw new DomainError(
          'TRANSICION_INVALIDA',
          409,
          'Solo se puede cambiar la categoría o el equipo antes de la asignación.'
        );
      }

      const updates: Partial<ServiceRequestRecord> = {
        version: request.version + 1,
      };
      const changedFields: string[] = [];

      if (input.description !== undefined && input.description !== request.description) {
        updates.description = input.description;
        changedFields.push('description');
      }

      if (input.categoryId !== undefined && input.categoryId !== request.categoryId) {
        const category = await repo.findCategory(input.categoryId);
        if (!category || category.status !== 'ACTIVA') {
          throw new DomainError('CATEGORIA_INVALIDA', 422, 'La categoría seleccionada no es válida.');
        }
        updates.categoryId = input.categoryId;
        changedFields.push('categoryId');
      }

      if (input.assetId !== undefined && input.assetId !== request.assetId) {
        if (input.assetId) {
          const asset = await repo.findAsset(input.assetId);
          if (!asset || asset.siteId !== request.siteId) {
            throw new DomainError(
              'EQUIPO_INVALIDO',
              422,
              'El equipo no pertenece a la sede de la solicitud.'
            );
          }
        }
        updates.assetId = input.assetId;
        changedFields.push('assetId');
      }

      if (input.priority !== undefined && input.priority !== request.priority) {
        const sla = await this.loadSla(repo);
        updates.priority = input.priority;
        updates.dueAt = sla.engine.calculateDueAt(
          request.createdAt,
          input.priority,
          request.slaPausedMinutes,
          sla.hours[input.priority]
        );
        changedFields.push('priority');
      }

      if (changedFields.length === 0) {
        const detail = await repo.getRequestDetail(requestId);
        return detail ?? this.fallbackDetail(request);
      }

      const updated = await repo.updateRequest(requestId, updates);

      await repo.createHistory({
        requestId,
        actorId: actor.id,
        action: 'EDICION',
        fromStatus: request.status,
        toStatus: request.status,
        comment: `Campos modificados: ${changedFields.join(', ')}`,
        metadata: { changedFields },
        createdAt: new Date(),
      });

      const detail = await repo.getRequestDetail(requestId);
      return detail ?? this.fallbackDetail(updated);
    });
  }

  public async reopenRequest(
    requestId: string,
    input: ReopenRequestDto,
    actor: ActorContext
  ): Promise<RequestDetailRecord> {
    return this.transitionStatus(
      requestId,
      {
        action: 'reapertura',
        reason: input.reason,
        version: input.version,
      },
      actor
    );
  }

  public async listRequests(
    actor: ActorContext,
    filter: RequestListFilter
  ): Promise<{ data: RequestListItem[]; total: number }> {
    if (filter.from && filter.to && filter.from > filter.to) {
      throw new DomainError('RANGO_INVALIDO', 400, 'La fecha inicial no puede ser posterior a la final.');
    }

    let forcedClientId = filter.clientId;
    let forcedTechnicianId = filter.technicianId;

    if (actor.role === 'CLIENTE') {
      forcedClientId = actor.clientId ?? '00000000-0000-0000-0000-000000000000';
      forcedTechnicianId = undefined;
    } else if (actor.role === 'TECNICO') {
      forcedTechnicianId = actor.technicianId ?? '00000000-0000-0000-0000-000000000000';
      forcedClientId = undefined;
    }

    const query: RequestListQuery = {
      page: filter.page,
      pageSize: filter.pageSize,
      clientId: forcedClientId,
      assignedTechnicianId: forcedTechnicianId,
      status: filter.status,
      priority: filter.priority,
      categoryId: filter.categoryId,
      overdue: filter.overdue,
      search: filter.search,
      from: filter.from ? this.parseDateFilter(filter.from, false) : undefined,
      to: filter.to ? this.parseDateFilter(filter.to, true) : undefined,
      sort: filter.sort,
    };

    return this.repository.listRequests(query);
  }

  public async getRequestById(
    requestId: string,
    actor: ActorContext
  ): Promise<RequestDetailRecord> {
    const request = await this.repository.getRequestDetail(requestId);
    if (!request) {
      throw new DomainError('RECURSO_NO_ENCONTRADO', 404, 'Solicitud no encontrada.');
    }

    this.assertCanView(request, actor);
    return request;
  }

  public async getHistory(
    requestId: string,
    actor: ActorContext
  ): Promise<RequestHistoryDetailRecord[]> {
    const request = await this.repository.findRequestById(requestId);
    if (!request) {
      throw new DomainError('RECURSO_NO_ENCONTRADO', 404, 'Solicitud no encontrada.');
    }

    this.assertCanView(request, actor);
    return this.repository.listHistory(requestId);
  }

  private assertCanView(request: ServiceRequestRecord, actor: ActorContext): void {
    if (actor.role === 'CLIENTE' && request.clientId !== actor.clientId) {
      throw new DomainError('RECURSO_NO_ENCONTRADO', 404, 'Solicitud no encontrada.');
    }

    if (
      actor.role === 'TECNICO' &&
      (!actor.technicianId || request.assignedTechnicianId !== actor.technicianId)
    ) {
      throw new DomainError('RECURSO_NO_ENCONTRADO', 404, 'Solicitud no encontrada.');
    }
  }

  private async loadSla(repo: IRequestsRepository): Promise<SlaContext> {
    const [holidays, hours] = await Promise.all([repo.getHolidays(), repo.getSlaHours()]);
    return {
      engine: new SlaEngine(DEFAULT_SLA_CONFIG, holidays),
      hours,
    };
  }

  private currentPeriod(date: Date): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Guayaquil',
      year: 'numeric',
      month: '2-digit',
    }).formatToParts(date);

    const year = parts.find((part) => part.type === 'year')?.value ?? '0000';
    const month = parts.find((part) => part.type === 'month')?.value ?? '00';
    return `${year}${month}`;
  }

  private parseDateFilter(value: string, endOfDay: boolean): Date {
    return new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}-05:00`);
  }

  private dedupeRecipients(userIds: Array<string | null | undefined>): string[] {
    return Array.from(new Set(userIds.filter((id): id is string => Boolean(id))));
  }

  private notificationTypeForTransition(
    action: TransitionDto['action'],
    to: RequestStatus
  ): NotificationType {
    if (action === 'reapertura') return 'REAPERTURA';
    if (to === 'CERRADA') return 'CIERRE';
    if (to === 'PENDIENTE_INFO') return 'INFO_REQUERIDA';
    return 'CAMBIO_ESTADO';
  }

  private notificationTitle(to: RequestStatus): string {
    switch (to) {
      case 'APROBADA':
        return 'Solicitud aprobada';
      case 'ASIGNADA':
        return 'Solicitud asignada';
      case 'EN_PROCESO':
        return 'Solicitud en proceso';
      case 'PENDIENTE_INFO':
        return 'Se requiere información adicional';
      case 'RESUELTA':
        return 'Solicitud resuelta';
      case 'CERRADA':
        return 'Solicitud cerrada';
      case 'CANCELADA':
        return 'Solicitud cancelada';
      default:
        return 'Solicitud actualizada';
    }
  }

  private publishNotifications(notifications: RequestNotificationRecord[]): void {
    for (const notification of notifications) {
      sseHub.publishToUsers([notification.userId], {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        requestId: notification.requestId ?? null,
        createdAt: notification.createdAt.toISOString(),
      });
    }
  }

  private fallbackDetail(request: ServiceRequestRecord): RequestDetailRecord {
    return {
      ...request,
      client: { id: request.clientId, businessName: request.clientId },
      site: { id: request.siteId, name: request.siteId, address: '' },
      asset: null,
      category: { id: request.categoryId, name: String(request.categoryId), specialtyId: 0 },
      assignedTechnician: null,
      currentAssignment: null,
      history: [],
      attachments: [],
      isOverdue: OPEN_STATUSES.includes(request.status) && new Date() > request.dueAt,
    };
  }
}

export type { RequestNotificationInput };
