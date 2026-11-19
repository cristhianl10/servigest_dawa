import { PrismaClient } from '@prisma/client';
import type { Priority, RequestStatus } from '@servigest/shared';

export interface DashboardFilters {
  from: Date;
  to: Date;
  clientId?: string;
  categoryId?: number;
}

export interface DashboardScope {
  clientId?: string;
  technicianId?: string;
}

export interface DashboardRequestRecord {
  id: string;
  clientId: string;
  categoryId: number;
  assignedTechnicianId: string | null;
  status: RequestStatus;
  priority: Priority;
  createdAt: Date;
  resolvedAt: Date | null;
  dueAt: Date;
  slaPausedMinutes: number;
}

export interface TechnicianLoadRecord {
  technicianId: string;
  fullName: string;
  active: number;
  capacity: number;
}

export interface IDashboardRepository {
  findRequests(
    filters: DashboardFilters,
    scope?: DashboardScope
  ): Promise<DashboardRequestRecord[]>;
  countOverdue(
    filters: DashboardFilters,
    now: Date,
    scope?: DashboardScope
  ): Promise<number>;
  listTechnicianLoad(): Promise<TechnicianLoadRecord[]>;
}

export class PrismaDashboardRepository implements IDashboardRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async findRequests(
    filters: DashboardFilters,
    scope: DashboardScope = {}
  ): Promise<DashboardRequestRecord[]> {
    const rows = await this.prisma.serviceRequest.findMany({
      where: {
        ...(filters.clientId ? { clientId: filters.clientId } : {}),
        ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
        ...(scope.clientId ? { clientId: scope.clientId } : {}),
        ...(scope.technicianId ? { assignedTechnicianId: scope.technicianId } : {}),
        OR: [
          { createdAt: { gte: filters.from, lt: filters.to } },
          { resolvedAt: { gte: filters.from, lt: filters.to } },
        ],
      },
      select: {
        id: true,
        clientId: true,
        categoryId: true,
        assignedTechnicianId: true,
        priority: true,
        createdAt: true,
        resolvedAt: true,
        dueAt: true,
        slaPausedMinutes: true,
        status: { select: { code: true } },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      clientId: row.clientId,
      categoryId: row.categoryId,
      assignedTechnicianId: row.assignedTechnicianId,
      status: row.status.code as RequestStatus,
      priority: row.priority as Priority,
      createdAt: row.createdAt,
      resolvedAt: row.resolvedAt,
      dueAt: row.dueAt,
      slaPausedMinutes: row.slaPausedMinutes,
    }));
  }

  public countOverdue(
    filters: DashboardFilters,
    now: Date,
    scope: DashboardScope = {}
  ): Promise<number> {
    return this.prisma.serviceRequest.count({
      where: {
        ...(filters.clientId ? { clientId: filters.clientId } : {}),
        ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
        ...(scope.clientId ? { clientId: scope.clientId } : {}),
        ...(scope.technicianId ? { assignedTechnicianId: scope.technicianId } : {}),
        dueAt: { lt: now },
        resolvedAt: null,
        status: { code: { notIn: ['RESUELTA', 'CERRADA', 'CANCELADA'] } },
      },
    });
  }

  public async listTechnicianLoad(): Promise<TechnicianLoadRecord[]> {
    const rows = await this.prisma.technician.findMany({
      select: {
        id: true,
        maxConcurrentLoad: true,
        user: { select: { fullName: true } },
        _count: {
          select: { assignments: { where: { status: 'VIGENTE' } } },
        },
      },
    });

    return rows.map((row) => ({
      technicianId: row.id,
      fullName: row.user.fullName,
      active: row._count.assignments,
      capacity: row.maxConcurrentLoad,
    }));
  }
}

export interface DashboardSeed {
  requests?: DashboardRequestRecord[];
  technicianLoad?: TechnicianLoadRecord[];
}

export class InMemoryDashboardRepository implements IDashboardRepository {
  private readonly requests: DashboardRequestRecord[];
  private readonly technicianLoad: TechnicianLoadRecord[];

  constructor(seed: DashboardSeed = {}) {
    this.requests = seed.requests ?? [];
    this.technicianLoad = seed.technicianLoad ?? [];
  }

  public async findRequests(
    filters: DashboardFilters,
    scope: DashboardScope = {}
  ): Promise<DashboardRequestRecord[]> {
    return this.requests.filter((request) => {
      if (filters.clientId && request.clientId !== filters.clientId) return false;
      if (filters.categoryId && request.categoryId !== filters.categoryId) return false;
      if (scope.clientId && request.clientId !== scope.clientId) return false;
      if (scope.technicianId && request.assignedTechnicianId !== scope.technicianId) {
        return false;
      }

      const createdInRange =
        request.createdAt >= filters.from && request.createdAt < filters.to;
      const resolvedInRange =
        request.resolvedAt !== null &&
        request.resolvedAt >= filters.from &&
        request.resolvedAt < filters.to;

      return createdInRange || resolvedInRange;
    });
  }

  public async countOverdue(
    filters: DashboardFilters,
    now: Date,
    scope: DashboardScope = {}
  ): Promise<number> {
    return this.requests.filter((request) => {
      if (filters.clientId && request.clientId !== filters.clientId) return false;
      if (filters.categoryId && request.categoryId !== filters.categoryId) return false;
      if (scope.clientId && request.clientId !== scope.clientId) return false;
      if (scope.technicianId && request.assignedTechnicianId !== scope.technicianId) {
        return false;
      }
      return (
        request.dueAt < now &&
        request.resolvedAt === null &&
        request.status !== 'RESUELTA' &&
        request.status !== 'CERRADA' &&
        request.status !== 'CANCELADA'
      );
    }).length;
  }

  public async listTechnicianLoad(): Promise<TechnicianLoadRecord[]> {
    return this.technicianLoad.map((item) => ({ ...item }));
  }
}
