import { Prisma, PrismaClient } from '@prisma/client';
import type { Priority } from '@servigest/shared';
import type { RequestStatus } from '@servigest/shared';
import type { NotificationType } from '@servigest/shared';
import type { Role } from '@servigest/shared';

export interface ServiceRequestRecord {
  id: string;
  code: string;
  clientId: string;
  siteId: string;
  assetId?: string | null;
  categoryId: number;
  priority: Priority;
  status: RequestStatus;
  statusId: number;
  description: string;
  resolution?: string | null;
  cancellationReason?: string | null;
  createdBy: string;
  assignedTechnicianId?: string | null;
  dueAt: Date;
  slaPausedMinutes: number;
  pausedAt?: Date | null;
  approvedAt?: Date | null;
  assignedAt?: Date | null;
  startedAt?: Date | null;
  resolvedAt?: Date | null;
  closedAt?: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RequestAssignmentRecord {
  id: string;
  requestId: string;
  technicianId: string;
  assignedBy: string;
  reason?: string | null;
  status: 'VIGENTE' | 'FINALIZADA';
  assignedAt: Date;
  endedAt?: Date | null;
}

export interface RequestHistoryRecord {
  id: number;
  requestId: string;
  actorId?: string | null;
  action: 'CREACION' | 'TRANSICION' | 'ASIGNACION' | 'REASIGNACION' | 'REAPERTURA' | 'EDICION' | 'ADJUNTO';
  fromStatus?: RequestStatus | null;
  toStatus?: RequestStatus | null;
  comment?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
}

export interface RequestHistoryDetailRecord extends RequestHistoryRecord {
  actor?: {
    id: string;
    fullName: string;
    role: Role;
  } | null;
}

export interface ClientSiteRecord {
  id: string;
  clientId: string;
  name: string;
  status: 'ACTIVA' | 'INACTIVA';
}

export interface AssetRecord {
  id: string;
  siteId: string;
  code: string;
  name: string;
  status: 'OPERATIVO' | 'FUERA_SERVICIO';
}

export interface ServiceCategoryRecord {
  id: number;
  code: string;
  name: string;
  specialtyId: number;
  defaultPriority: Priority;
  status: 'ACTIVA' | 'INACTIVA';
}

export interface TechnicianRecord {
  id: string;
  userId: string;
  employeeCode: string;
  fullName: string;
  userStatus: 'ACTIVO' | 'INACTIVO';
  availability: 'DISPONIBLE' | 'NO_DISPONIBLE';
  maxConcurrentLoad: number;
  specialtyIds: number[];
}

export interface RequestAttachmentRecord {
  id: string;
  requestId: string;
  uploadedBy: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
}

export interface RequestNotificationInput {
  userId: string;
  requestId?: string | null;
  type: NotificationType;
  title: string;
  body: string;
}

export interface RequestNotificationRecord extends RequestNotificationInput {
  id: string;
  readAt?: Date | null;
  createdAt: Date;
}

export type RequestSort =
  | 'createdAt'
  | '-createdAt'
  | 'dueAt'
  | '-dueAt'
  | 'priority'
  | '-priority'
  | 'status'
  | '-status';

export interface RequestListQuery {
  page: number;
  pageSize: number;
  clientId?: string;
  assignedTechnicianId?: string;
  status?: RequestStatus | RequestStatus[];
  priority?: Priority;
  categoryId?: number;
  overdue?: boolean;
  search?: string;
  from?: Date;
  to?: Date;
  sort?: RequestSort;
}

export interface RequestListItem extends ServiceRequestRecord {
  client: { id: string; businessName: string };
  site: { id: string; name: string };
  category: { id: number; name: string };
  assignedTechnician: { id: string; fullName: string } | null;
  isOverdue: boolean;
}

export interface RequestDetailRecord extends ServiceRequestRecord {
  client: { id: string; businessName: string };
  site: { id: string; name: string; address: string };
  asset: { id: string; code: string; name: string } | null;
  category: { id: number; name: string; specialtyId: number };
  assignedTechnician: { id: string; fullName: string; employeeCode: string } | null;
  currentAssignment: RequestAssignmentRecord | null;
  history: RequestHistoryDetailRecord[];
  attachments: RequestAttachmentRecord[];
  isOverdue: boolean;
}

export interface IRequestsRepository {
  transaction<T>(work: (repo: IRequestsRepository) => Promise<T>): Promise<T>;

  // Solicitudes
  createRequest(request: Omit<ServiceRequestRecord, 'id'>): Promise<ServiceRequestRecord>;
  findRequestById(id: string): Promise<ServiceRequestRecord | null>;
  lockRequestById(id: string): Promise<ServiceRequestRecord | null>;
  updateRequest(id: string, updates: Partial<ServiceRequestRecord>): Promise<ServiceRequestRecord>;
  listRequests(query: RequestListQuery): Promise<{ data: RequestListItem[]; total: number }>;
  getRequestDetail(id: string): Promise<RequestDetailRecord | null>;

  // Correlativo mensual
  getNextCode(period: string): Promise<string>;

  // Asignaciones
  createAssignment(assignment: Omit<RequestAssignmentRecord, 'id'>): Promise<RequestAssignmentRecord>;
  findActiveAssignment(requestId: string): Promise<RequestAssignmentRecord | null>;
  closeAssignment(assignmentId: string, endedAt: Date): Promise<void>;
  countActiveAssignmentsForTechnician(technicianId: string): Promise<number>;

  // Historial inmutable
  createHistory(event: Omit<RequestHistoryRecord, 'id'>): Promise<RequestHistoryRecord>;
  listHistory(requestId: string): Promise<RequestHistoryDetailRecord[]>;

  // Catálogos auxiliares de validación
  findSite(siteId: string): Promise<ClientSiteRecord | null>;
  findAsset(assetId: string): Promise<AssetRecord | null>;
  findCategory(categoryId: number): Promise<ServiceCategoryRecord | null>;
  findTechnician(technicianId: string): Promise<TechnicianRecord | null>;
  getStatusId(code: RequestStatus): Promise<number>;

  // Configuración de SLA
  getHolidays(): Promise<Set<string>>;
  getSlaHours(): Promise<Partial<Record<Priority, number>>>;

  // Notificaciones transaccionales
  findUserIdsByRoles(roles: Role[]): Promise<string[]>;
  getTechnicianUserId(technicianId: string): Promise<string | null>;
  createNotifications(inputs: RequestNotificationInput[]): Promise<RequestNotificationRecord[]>;
}

const STATUS_IDS: Record<RequestStatus, number> = {
  REGISTRADA: 1,
  APROBADA: 2,
  ASIGNADA: 3,
  EN_PROCESO: 4,
  PENDIENTE_INFO: 5,
  RESUELTA: 6,
  CERRADA: 7,
  CANCELADA: 8,
};

const CLOSED_STATUSES: readonly RequestStatus[] = ['RESUELTA', 'CERRADA', 'CANCELADA'];
const PRIORITY_ORDER: Record<Priority, number> = {
  CRITICA: 0,
  ALTA: 1,
  MEDIA: 2,
  BAJA: 3,
};

type PrismaDb = PrismaClient | Prisma.TransactionClient;

type RequestRow = Prisma.ServiceRequestGetPayload<{ include: { status: true } }>;

function mapRequest(row: RequestRow): ServiceRequestRecord {
  return {
    id: row.id,
    code: row.code,
    clientId: row.clientId,
    siteId: row.siteId,
    assetId: row.assetId,
    categoryId: row.categoryId,
    priority: row.priority as Priority,
    status: row.status.code as RequestStatus,
    statusId: row.statusId,
    description: row.description,
    resolution: row.resolution,
    cancellationReason: row.cancellationReason,
    createdBy: row.createdBy,
    assignedTechnicianId: row.assignedTechnicianId,
    dueAt: row.dueAt,
    slaPausedMinutes: row.slaPausedMinutes,
    pausedAt: row.pausedAt,
    approvedAt: row.approvedAt,
    assignedAt: row.assignedAt,
    startedAt: row.startedAt,
    resolvedAt: row.resolvedAt,
    closedAt: row.closedAt,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapAssignment(row: {
  id: string;
  requestId: string;
  technicianId: string;
  assignedBy: string;
  reason: string | null;
  status: string;
  assignedAt: Date;
  endedAt: Date | null;
}): RequestAssignmentRecord {
  return {
    id: row.id,
    requestId: row.requestId,
    technicianId: row.technicianId,
    assignedBy: row.assignedBy,
    reason: row.reason,
    status: row.status as 'VIGENTE' | 'FINALIZADA',
    assignedAt: row.assignedAt,
    endedAt: row.endedAt,
  };
}

export class PrismaRequestsRepository implements IRequestsRepository {
  constructor(
    private readonly db: PrismaClient,
    private readonly tx?: Prisma.TransactionClient
  ) {}

  private get client(): PrismaDb {
    return this.tx ?? this.db;
  }

  public async transaction<T>(work: (repo: IRequestsRepository) => Promise<T>): Promise<T> {
    if (this.tx) {
      return work(new PrismaRequestsRepository(this.db, this.tx));
    }
    return this.db.$transaction((tx) => work(new PrismaRequestsRepository(this.db, tx)));
  }

  private async findRequestRow(id: string): Promise<RequestRow | null> {
    return this.client.serviceRequest.findUnique({
      where: { id },
      include: { status: true },
    });
  }

  public async createRequest(data: Omit<ServiceRequestRecord, 'id'>): Promise<ServiceRequestRecord> {
    const created = await this.client.serviceRequest.create({
      data: {
        code: data.code,
        clientId: data.clientId,
        siteId: data.siteId,
        assetId: data.assetId ?? null,
        categoryId: data.categoryId,
        priority: data.priority,
        statusId: data.statusId,
        description: data.description,
        resolution: data.resolution ?? null,
        cancellationReason: data.cancellationReason ?? null,
        createdBy: data.createdBy,
        assignedTechnicianId: data.assignedTechnicianId ?? null,
        dueAt: data.dueAt,
        slaPausedMinutes: data.slaPausedMinutes,
        pausedAt: data.pausedAt ?? null,
        approvedAt: data.approvedAt ?? null,
        assignedAt: data.assignedAt ?? null,
        startedAt: data.startedAt ?? null,
        resolvedAt: data.resolvedAt ?? null,
        closedAt: data.closedAt ?? null,
        version: data.version,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      },
      include: { status: true },
    });
    return mapRequest(created);
  }

  public async findRequestById(id: string): Promise<ServiceRequestRecord | null> {
    const row = await this.findRequestRow(id);
    return row ? mapRequest(row) : null;
  }

  public async lockRequestById(id: string): Promise<ServiceRequestRecord | null> {
    await this.client.$queryRaw`SELECT id FROM service_requests WHERE id = ${id}::uuid FOR UPDATE`;
    return this.findRequestById(id);
  }

  public async updateRequest(
    id: string,
    updates: Partial<ServiceRequestRecord>
  ): Promise<ServiceRequestRecord> {
    const data: Record<string, unknown> = {};

    const scalarFields = [
      'clientId',
      'siteId',
      'assetId',
      'categoryId',
      'priority',
      'description',
      'resolution',
      'cancellationReason',
      'createdBy',
      'assignedTechnicianId',
      'dueAt',
      'slaPausedMinutes',
      'pausedAt',
      'approvedAt',
      'assignedAt',
      'startedAt',
      'resolvedAt',
      'closedAt',
      'version',
    ] as const;

    for (const field of scalarFields) {
      if (updates[field] !== undefined) {
        data[field] = updates[field];
      }
    }

    if (updates.statusId !== undefined) {
      data.statusId = updates.statusId;
    } else if (updates.status !== undefined) {
      data.statusId = STATUS_IDS[updates.status];
    }

    const updated = await this.client.serviceRequest.update({
      where: { id },
      data,
      include: { status: true },
    });
    return mapRequest(updated);
  }

  public async listRequests(query: RequestListQuery): Promise<{ data: RequestListItem[]; total: number }> {
    const where: Prisma.ServiceRequestWhereInput = {};

    if (query.clientId) where.clientId = query.clientId;
    if (query.assignedTechnicianId) where.assignedTechnicianId = query.assignedTechnicianId;
    if (query.priority) where.priority = query.priority;
    if (query.categoryId) where.categoryId = query.categoryId;

    if (query.status) {
      const statuses = Array.isArray(query.status) ? query.status : [query.status];
      where.status = { code: { in: statuses } };
    }

    if (query.overdue) {
      where.dueAt = { lt: new Date() };
      where.status = {
        ...(where.status as object),
        code: { notIn: ['RESUELTA', 'CERRADA', 'CANCELADA'] },
      };
    }

    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from ? { gte: query.from } : {}),
        ...(query.to ? { lte: query.to } : {}),
      };
    }

    const orderBy = this.buildOrderBy(query.sort);

    const [total, rows] = await Promise.all([
      this.client.serviceRequest.count({ where }),
      this.client.serviceRequest.findMany({
        where,
        include: {
          status: true,
          client: { select: { id: true, businessName: true } },
          site: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
          assignedTechnician: {
            select: { id: true, user: { select: { fullName: true } } },
          },
        },
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    const now = new Date();
    return {
      total,
      data: rows.map((row) => {
        const item = mapRequest(row);
        return {
          ...item,
          client: row.client,
          site: row.site,
          category: row.category,
          assignedTechnician: row.assignedTechnician
            ? { id: row.assignedTechnician.id, fullName: row.assignedTechnician.user.fullName }
            : null,
          isOverdue: this.isOverdue(item, now),
        };
      }),
    };
  }

  public async getRequestDetail(id: string): Promise<RequestDetailRecord | null> {
    const row = await this.client.serviceRequest.findUnique({
      where: { id },
      include: {
        status: true,
        client: { select: { id: true, businessName: true } },
        site: { select: { id: true, name: true, address: true } },
        asset: { select: { id: true, code: true, name: true } },
        category: { select: { id: true, name: true, specialtyId: true } },
        assignedTechnician: {
          select: {
            id: true,
            employeeCode: true,
            user: { select: { fullName: true } },
          },
        },
        assignments: {
          where: { status: 'VIGENTE' },
          take: 1,
        },
        history: {
          include: {
            actor: {
              include: { role: { select: { code: true } } },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        attachments: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!row) return null;

    const item = mapRequest(row);
    return {
      ...item,
      client: row.client,
      site: row.site,
      asset: row.asset,
      category: row.category,
      assignedTechnician: row.assignedTechnician
        ? {
            id: row.assignedTechnician.id,
            fullName: row.assignedTechnician.user.fullName,
            employeeCode: row.assignedTechnician.employeeCode,
          }
        : null,
      currentAssignment: row.assignments[0] ? mapAssignment(row.assignments[0]) : null,
      history: row.history.map((event) => ({
        id: Number(event.id),
        requestId: event.requestId,
        actorId: event.actorId,
        action: event.action as RequestHistoryRecord['action'],
        fromStatus: event.fromStatus as RequestStatus | null,
        toStatus: event.toStatus as RequestStatus | null,
        comment: event.comment,
        metadata: event.metadata as Record<string, unknown> | null,
        createdAt: event.createdAt,
        actor: event.actor
          ? {
              id: event.actor.id,
              fullName: event.actor.fullName,
              role: event.actor.role.code as Role,
            }
          : null,
      })),
      attachments: row.attachments.map((attachment) => ({
        id: attachment.id,
        requestId: attachment.requestId,
        uploadedBy: attachment.uploadedBy,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        createdAt: attachment.createdAt,
      })),
      isOverdue: this.isOverdue(item, new Date()),
    };
  }

  public async getNextCode(period: string): Promise<string> {
    const sequence = await this.client.requestCodeSequence.upsert({
      where: { period },
      create: { period, lastValue: 1 },
      update: { lastValue: { increment: 1 } },
    });
    return `SOL-${period}-${String(sequence.lastValue).padStart(5, '0')}`;
  }

  public async createAssignment(
    assignment: Omit<RequestAssignmentRecord, 'id'>
  ): Promise<RequestAssignmentRecord> {
    const created = await this.client.requestAssignment.create({
      data: {
        requestId: assignment.requestId,
        technicianId: assignment.technicianId,
        assignedBy: assignment.assignedBy,
        reason: assignment.reason ?? null,
        status: assignment.status,
        assignedAt: assignment.assignedAt,
        endedAt: assignment.endedAt ?? null,
      },
    });
    return mapAssignment(created);
  }

  public async findActiveAssignment(requestId: string): Promise<RequestAssignmentRecord | null> {
    const assignment = await this.client.requestAssignment.findFirst({
      where: { requestId, status: 'VIGENTE' },
    });
    return assignment ? mapAssignment(assignment) : null;
  }

  public async closeAssignment(assignmentId: string, endedAt: Date): Promise<void> {
    await this.client.requestAssignment.update({
      where: { id: assignmentId },
      data: { status: 'FINALIZADA', endedAt },
    });
  }

  public async countActiveAssignmentsForTechnician(technicianId: string): Promise<number> {
    return this.client.requestAssignment.count({
      where: {
        technicianId,
        status: 'VIGENTE',
        request: {
          status: { code: { notIn: ['RESUELTA', 'CERRADA', 'CANCELADA'] } },
        },
      },
    });
  }

  public async createHistory(
    event: Omit<RequestHistoryRecord, 'id'>
  ): Promise<RequestHistoryRecord> {
    const created = await this.client.requestHistory.create({
      data: {
        requestId: event.requestId,
        actorId: event.actorId ?? null,
        action: event.action,
        fromStatus: event.fromStatus ?? null,
        toStatus: event.toStatus ?? null,
        comment: event.comment ?? null,
        metadata: (event.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        createdAt: event.createdAt,
      },
    });
    return {
      id: Number(created.id),
      requestId: created.requestId,
      actorId: created.actorId,
      action: created.action as RequestHistoryRecord['action'],
      fromStatus: created.fromStatus as RequestStatus | null,
      toStatus: created.toStatus as RequestStatus | null,
      comment: created.comment,
      metadata: created.metadata as Record<string, unknown> | null,
      createdAt: created.createdAt,
    };
  }

  public async listHistory(requestId: string): Promise<RequestHistoryDetailRecord[]> {
    const rows = await this.client.requestHistory.findMany({
      where: { requestId },
      include: {
        actor: { include: { role: { select: { code: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return rows.map((event) => ({
      id: Number(event.id),
      requestId: event.requestId,
      actorId: event.actorId,
      action: event.action as RequestHistoryRecord['action'],
      fromStatus: event.fromStatus as RequestStatus | null,
      toStatus: event.toStatus as RequestStatus | null,
      comment: event.comment,
      metadata: event.metadata as Record<string, unknown> | null,
      createdAt: event.createdAt,
      actor: event.actor
        ? {
            id: event.actor.id,
            fullName: event.actor.fullName,
            role: event.actor.role.code as Role,
          }
        : null,
    }));
  }

  public async findSite(siteId: string): Promise<ClientSiteRecord | null> {
    const site = await this.client.clientSite.findUnique({ where: { id: siteId } });
    if (!site) return null;
    return {
      id: site.id,
      clientId: site.clientId,
      name: site.name,
      status: site.status as ClientSiteRecord['status'],
    };
  }

  public async findAsset(assetId: string): Promise<AssetRecord | null> {
    const asset = await this.client.asset.findUnique({ where: { id: assetId } });
    if (!asset) return null;
    return {
      id: asset.id,
      siteId: asset.siteId,
      code: asset.code,
      name: asset.name,
      status: asset.status as AssetRecord['status'],
    };
  }

  public async findCategory(categoryId: number): Promise<ServiceCategoryRecord | null> {
    const category = await this.client.serviceCategory.findUnique({ where: { id: categoryId } });
    if (!category) return null;
    return {
      id: category.id,
      code: category.code,
      name: category.name,
      specialtyId: category.specialtyId,
      defaultPriority: category.defaultPriority as Priority,
      status: category.status as ServiceCategoryRecord['status'],
    };
  }

  public async findTechnician(technicianId: string): Promise<TechnicianRecord | null> {
    const technician = await this.client.technician.findUnique({
      where: { id: technicianId },
      include: {
        user: { select: { id: true, fullName: true, status: true } },
        specialties: { select: { specialtyId: true } },
      },
    });
    if (!technician) return null;
    return {
      id: technician.id,
      userId: technician.userId,
      employeeCode: technician.employeeCode,
      fullName: technician.user.fullName,
      userStatus: technician.user.status as TechnicianRecord['userStatus'],
      availability: technician.availability as TechnicianRecord['availability'],
      maxConcurrentLoad: technician.maxConcurrentLoad,
      specialtyIds: technician.specialties.map((item) => item.specialtyId),
    };
  }

  public async getStatusId(code: RequestStatus): Promise<number> {
    const status = await this.client.requestStatus.findUnique({ where: { code } });
    if (!status) throw new Error(`Estado desconocido: ${code}`);
    return status.id;
  }

  public async getHolidays(): Promise<Set<string>> {
    const rows = await this.client.holiday.findMany({ select: { date: true } });
    return new Set(rows.map((row) => row.date.toISOString().slice(0, 10)));
  }

  public async getSlaHours(): Promise<Partial<Record<Priority, number>>> {
    const rows = await this.client.systemParameter.findMany({
      where: { key: { in: ['sla.critica.hours', 'sla.alta.hours', 'sla.media.hours', 'sla.baja.hours'] } },
    });

    const map: Partial<Record<Priority, number>> = {};
    const keys: Record<string, Priority> = {
      'sla.critica.hours': 'CRITICA',
      'sla.alta.hours': 'ALTA',
      'sla.media.hours': 'MEDIA',
      'sla.baja.hours': 'BAJA',
    };

    for (const row of rows) {
      const priority = keys[row.key];
      const value = typeof row.value === 'number' ? row.value : Number(row.value);
      if (priority && Number.isFinite(value) && value > 0) {
        map[priority] = value;
      }
    }
    return map;
  }

  public async findUserIdsByRoles(roles: Role[]): Promise<string[]> {
    const users = await this.client.user.findMany({
      where: {
        status: 'ACTIVO',
        role: { code: { in: roles } },
      },
      select: { id: true },
    });
    return users.map((user) => user.id);
  }

  public async getTechnicianUserId(technicianId: string): Promise<string | null> {
    const technician = await this.client.technician.findUnique({
      where: { id: technicianId },
      select: { userId: true },
    });
    return technician?.userId ?? null;
  }

  public async createNotifications(
    inputs: RequestNotificationInput[]
  ): Promise<RequestNotificationRecord[]> {
    if (inputs.length === 0) return [];

    const created = await this.client.notification.createManyAndReturn({
      data: inputs.map((input) => ({
        userId: input.userId,
        requestId: input.requestId ?? null,
        type: input.type,
        title: input.title,
        body: input.body,
      })),
    });

    return created.map((row) => ({
      id: row.id,
      userId: row.userId,
      requestId: row.requestId,
      type: row.type as NotificationType,
      title: row.title,
      body: row.body,
      readAt: row.readAt,
      createdAt: row.createdAt,
    }));
  }

  private buildOrderBy(sort?: RequestSort): Prisma.ServiceRequestOrderByWithRelationInput {
    switch (sort) {
      case 'dueAt':
        return { dueAt: 'asc' };
      case '-dueAt':
        return { dueAt: 'desc' };
      case 'priority':
        return { priority: 'asc' };
      case '-priority':
        return { priority: 'desc' };
      case 'status':
        return { status: { sortOrder: 'asc' } };
      case '-status':
        return { status: { sortOrder: 'desc' } };
      case 'createdAt':
        return { createdAt: 'asc' };
      case '-createdAt':
      default:
        return { createdAt: 'desc' };
    }
  }

  private isOverdue(request: ServiceRequestRecord, now: Date): boolean {
    if (CLOSED_STATUSES.includes(request.status)) return false;
    return now.getTime() > request.dueAt.getTime();
  }
}

interface InMemoryUser {
  id: string;
  fullName: string;
  role: Role;
  status: 'ACTIVO' | 'INACTIVO';
}

export class InMemoryRequestsRepository implements IRequestsRepository {
  private requests: Map<string, ServiceRequestRecord> = new Map();
  private assignments: Map<string, RequestAssignmentRecord> = new Map();
  private history: RequestHistoryRecord[] = [];
  private notifications: RequestNotificationRecord[] = [];
  private sequences: Map<string, number> = new Map();

  private sites: Map<string, ClientSiteRecord> = new Map();
  private assets: Map<string, AssetRecord> = new Map();
  private categories: Map<number, ServiceCategoryRecord> = new Map();
  private technicians: Map<string, TechnicianRecord> = new Map();
  private users: Map<string, InMemoryUser> = new Map();

  private holidays: Set<string> = new Set();
  private slaHours: Partial<Record<Priority, number>> = {};

  constructor() {
    this.initDefaultCatalogs();
  }

  private initDefaultCatalogs() {
    this.sites.set('site-001', {
      id: 'site-001',
      clientId: 'cli-001',
      name: 'Matriz Centro',
      status: 'ACTIVA',
    });
    this.assets.set('asset-001', {
      id: 'asset-001',
      siteId: 'site-001',
      code: 'SRV-01',
      name: 'Servidor Principal',
      status: 'OPERATIVO',
    });
    this.categories.set(1, {
      id: 1,
      code: 'FALLA_CONECTIVIDAD',
      name: 'Falla de Conectividad',
      specialtyId: 1,
      defaultPriority: 'ALTA',
      status: 'ACTIVA',
    });
    this.categories.set(3, {
      id: 3,
      code: 'CAIDA_SERVIDOR',
      name: 'Caída de Servidor Físico',
      specialtyId: 3,
      defaultPriority: 'CRITICA',
      status: 'ACTIVA',
    });
    this.technicians.set('tec-001', {
      id: 'tec-001',
      userId: 'usr-tec-1',
      employeeCode: 'TEC-001',
      fullName: 'Luis Vera',
      userStatus: 'ACTIVO',
      availability: 'DISPONIBLE',
      maxConcurrentLoad: 5,
      specialtyIds: [1, 3],
    });
    this.users.set('usr-admin', {
      id: 'usr-admin',
      fullName: 'Administrador General',
      role: 'ADMIN',
      status: 'ACTIVO',
    });
    this.users.set('usr-coord', {
      id: 'usr-coord',
      fullName: 'Ana Torres',
      role: 'COORDINADOR',
      status: 'ACTIVO',
    });
    this.users.set('usr-tec-1', {
      id: 'usr-tec-1',
      fullName: 'Luis Vera',
      role: 'TECNICO',
      status: 'ACTIVO',
    });
  }

  public async transaction<T>(work: (repo: IRequestsRepository) => Promise<T>): Promise<T> {
    return work(this);
  }

  public async createRequest(data: Omit<ServiceRequestRecord, 'id'>): Promise<ServiceRequestRecord> {
    const id = `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const record: ServiceRequestRecord = { ...data, id };
    this.requests.set(id, record);
    return { ...record };
  }

  public async findRequestById(id: string): Promise<ServiceRequestRecord | null> {
    const request = this.requests.get(id);
    return request ? { ...request } : null;
  }

  public async lockRequestById(id: string): Promise<ServiceRequestRecord | null> {
    return this.findRequestById(id);
  }

  public async updateRequest(
    id: string,
    updates: Partial<ServiceRequestRecord>
  ): Promise<ServiceRequestRecord> {
    const current = this.requests.get(id);
    if (!current) throw new Error('Request not found');
    const updated = { ...current, ...updates, updatedAt: new Date() };
    this.requests.set(id, updated);
    return { ...updated };
  }

  public async listRequests(query: RequestListQuery): Promise<{ data: RequestListItem[]; total: number }> {
    let list = Array.from(this.requests.values());

    if (query.clientId) list = list.filter((request) => request.clientId === query.clientId);
    if (query.assignedTechnicianId) {
      list = list.filter((request) => request.assignedTechnicianId === query.assignedTechnicianId);
    }
    if (query.priority) list = list.filter((request) => request.priority === query.priority);
    if (query.categoryId) list = list.filter((request) => request.categoryId === query.categoryId);

    if (query.status) {
      const statuses = Array.isArray(query.status) ? query.status : [query.status];
      list = list.filter((request) => statuses.includes(request.status));
    }

    if (query.search) {
      const term = query.search.toLowerCase();
      list = list.filter(
        (request) =>
          request.code.toLowerCase().includes(term) ||
          request.description.toLowerCase().includes(term)
      );
    }

    if (query.from) list = list.filter((request) => request.createdAt >= query.from!);
    if (query.to) list = list.filter((request) => request.createdAt <= query.to!);
    if (query.overdue) {
      const now = new Date();
      list = list.filter((request) => this.isOverdue(request, now));
    }

    list.sort((a, b) => this.compare(a, b, query.sort));

    const total = list.length;
    const start = (query.page - 1) * query.pageSize;
    const page = list.slice(start, start + query.pageSize);
    const now = new Date();

    return {
      total,
      data: page.map((request) => this.toListItem(request, now)),
    };
  }

  public async getRequestDetail(id: string): Promise<RequestDetailRecord | null> {
    const request = this.requests.get(id);
    if (!request) return null;

    const site = this.sites.get(request.siteId);
    const asset = request.assetId ? this.assets.get(request.assetId) : null;
    const category = this.categories.get(request.categoryId);
    const technician = request.assignedTechnicianId
      ? this.technicians.get(request.assignedTechnicianId)
      : null;
    const currentAssignment = Array.from(this.assignments.values()).find(
      (assignment) => assignment.requestId === id && assignment.status === 'VIGENTE'
    );

    return {
      ...request,
      client: { id: request.clientId, businessName: `Cliente ${request.clientId}` },
      site: site ? { id: site.id, name: site.name, address: site.name } : {
        id: request.siteId,
        name: request.siteId,
        address: '',
      },
      asset: asset ?? null,
      category: category
        ? { id: category.id, name: category.name, specialtyId: category.specialtyId }
        : { id: request.categoryId, name: `Categoría ${request.categoryId}`, specialtyId: 0 },
      assignedTechnician: technician
        ? {
            id: technician.id,
            fullName: technician.fullName,
            employeeCode: technician.employeeCode,
          }
        : null,
      currentAssignment: currentAssignment ? { ...currentAssignment } : null,
      history: await this.listHistory(id),
      attachments: [],
      isOverdue: this.isOverdue(request, new Date()),
    };
  }

  public async getNextCode(period: string): Promise<string> {
    const current = this.sequences.get(period) ?? 0;
    const nextVal = current + 1;
    this.sequences.set(period, nextVal);
    return `SOL-${period}-${String(nextVal).padStart(5, '0')}`;
  }

  public async createAssignment(
    assignment: Omit<RequestAssignmentRecord, 'id'>
  ): Promise<RequestAssignmentRecord> {
    const id = `asg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const record: RequestAssignmentRecord = { ...assignment, id };
    this.assignments.set(id, record);
    return { ...record };
  }

  public async findActiveAssignment(requestId: string): Promise<RequestAssignmentRecord | null> {
    for (const assignment of this.assignments.values()) {
      if (assignment.requestId === requestId && assignment.status === 'VIGENTE') {
        return { ...assignment };
      }
    }
    return null;
  }

  public async closeAssignment(assignmentId: string, endedAt: Date): Promise<void> {
    const assignment = this.assignments.get(assignmentId);
    if (assignment) {
      assignment.status = 'FINALIZADA';
      assignment.endedAt = endedAt;
    }
  }

  public async countActiveAssignmentsForTechnician(technicianId: string): Promise<number> {
    let count = 0;
    for (const assignment of this.assignments.values()) {
      if (assignment.technicianId !== technicianId || assignment.status !== 'VIGENTE') continue;
      const request = this.requests.get(assignment.requestId);
      if (request && !CLOSED_STATUSES.includes(request.status)) count++;
    }
    return count;
  }

  public async createHistory(
    event: Omit<RequestHistoryRecord, 'id'>
  ): Promise<RequestHistoryRecord> {
    const id = this.history.length + 1;
    const record: RequestHistoryRecord = { ...event, id };
    this.history.push(record);
    return { ...record };
  }

  public async listHistory(requestId: string): Promise<RequestHistoryDetailRecord[]> {
    return this.history
      .filter((event) => event.requestId === requestId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((event) => {
        const actor = event.actorId ? this.users.get(event.actorId) : null;
        return {
          ...event,
          actor: actor
            ? { id: actor.id, fullName: actor.fullName, role: actor.role }
            : null,
        };
      });
  }

  public async findSite(siteId: string): Promise<ClientSiteRecord | null> {
    return this.sites.get(siteId) ?? null;
  }

  public async findAsset(assetId: string): Promise<AssetRecord | null> {
    return this.assets.get(assetId) ?? null;
  }

  public async findCategory(categoryId: number): Promise<ServiceCategoryRecord | null> {
    return this.categories.get(categoryId) ?? null;
  }

  public async findTechnician(technicianId: string): Promise<TechnicianRecord | null> {
    return this.technicians.get(technicianId) ?? null;
  }

  public async getStatusId(code: RequestStatus): Promise<number> {
    return STATUS_IDS[code];
  }

  public async getHolidays(): Promise<Set<string>> {
    return new Set(this.holidays);
  }

  public async getSlaHours(): Promise<Partial<Record<Priority, number>>> {
    return { ...this.slaHours };
  }

  public async findUserIdsByRoles(roles: Role[]): Promise<string[]> {
    return Array.from(this.users.values())
      .filter((user) => user.status === 'ACTIVO' && roles.includes(user.role))
      .map((user) => user.id);
  }

  public async getTechnicianUserId(technicianId: string): Promise<string | null> {
    return this.technicians.get(technicianId)?.userId ?? null;
  }

  public async createNotifications(
    inputs: RequestNotificationInput[]
  ): Promise<RequestNotificationRecord[]> {
    return inputs.map((input) => {
      const record: RequestNotificationRecord = {
        ...input,
        id: `ntf-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        readAt: null,
        createdAt: new Date(),
      };
      this.notifications.push(record);
      return { ...record };
    });
  }

  private toListItem(request: ServiceRequestRecord, now: Date): RequestListItem {
    const site = this.sites.get(request.siteId);
    const category = this.categories.get(request.categoryId);
    const technician = request.assignedTechnicianId
      ? this.technicians.get(request.assignedTechnicianId)
      : null;

    return {
      ...request,
      client: { id: request.clientId, businessName: `Cliente ${request.clientId}` },
      site: { id: request.siteId, name: site?.name ?? request.siteId },
      category: {
        id: request.categoryId,
        name: category?.name ?? `Categoría ${request.categoryId}`,
      },
      assignedTechnician: technician
        ? { id: technician.id, fullName: technician.fullName }
        : null,
      isOverdue: this.isOverdue(request, now),
    };
  }

  private compare(a: ServiceRequestRecord, b: ServiceRequestRecord, sort?: RequestSort): number {
    const direction = sort?.startsWith('-') ? -1 : 1;
    const field = (sort ?? '-createdAt').replace(/^-/, '');

    if (field === 'priority') {
      return (PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]) * direction;
    }
    if (field === 'dueAt') {
      return (a.dueAt.getTime() - b.dueAt.getTime()) * direction;
    }
    if (field === 'status') {
      return (STATUS_IDS[a.status] - STATUS_IDS[b.status]) * direction;
    }
    return (a.createdAt.getTime() - b.createdAt.getTime()) * direction;
  }

  private isOverdue(request: ServiceRequestRecord, now: Date): boolean {
    if (CLOSED_STATUSES.includes(request.status)) return false;
    return now.getTime() > request.dueAt.getTime();
  }
}
