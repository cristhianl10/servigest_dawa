import {
  PRIORITIES,
  REQUEST_STATUSES,
  type DashboardEvolution,
  type DashboardOverview,
  type DashboardQuery,
  type MySummary,
  type Priority,
  type RequestStatus,
  type Role,
  type TechnicianLoadItem,
} from '@servigest/shared';
import { DomainError } from '../../domain/errors/domain-error.ts';
import type {
  DashboardRequestRecord,
  IDashboardRepository,
  TechnicianLoadRecord,
} from './dashboard.repository.ts';

const DAY_MS = 86_400_000;

export interface DashboardActor {
  id: string;
  role: Role;
  clientId?: string | null;
  technicianId?: string | null;
}

interface NormalizedRange {
  from: Date;
  to: Date;
  toExclusive: Date;
  fromLabel: string;
  toLabel: string;
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

function startOfUtcWeek(date: Date): Date {
  const start = startOfUtcDay(date);
  const day = start.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  return new Date(start.getTime() + diff * DAY_MS);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export class DashboardService {
  constructor(private readonly repository: IDashboardRepository) {}

  public async getOverview(
    query: DashboardQuery,
    now: Date = new Date()
  ): Promise<DashboardOverview> {
    const range = this.normalizeRange(query);
    const filters = {
      from: range.from,
      to: range.toExclusive,
      clientId: query.clientId,
      categoryId: query.categoryId,
    };

    const [requests, technicianLoad, overdue] = await Promise.all([
      this.repository.findRequests(filters),
      this.repository.listTechnicianLoad(),
      this.repository.countOverdue(filters, now),
    ]);

    const created = this.filterCreated(requests, range);
    const resolved = this.filterResolved(requests, range);

    return {
      range: { from: range.fromLabel, to: range.toLabel },
      byStatus: this.groupByStatus(created),
      byPriority: this.groupByPriority(created),
      technicianLoad: technicianLoad.map(({ technicianId, fullName, active, capacity }) => ({
        technicianId,
        fullName,
        active,
        capacity,
      })),
      avgResolutionHours: this.averageResolutionHours(resolved),
      slaCompliance: this.slaCompliance(resolved),
      overdue,
      evolution: this.buildEvolution(created, resolved, range, query.granularity),
    };
  }

  public async getEvolution(query: DashboardQuery): Promise<DashboardEvolution> {
    const range = this.normalizeRange(query);
    const requests = await this.repository.findRequests({
      from: range.from,
      to: range.toExclusive,
      clientId: query.clientId,
      categoryId: query.categoryId,
    });

    return {
      range: { from: range.fromLabel, to: range.toLabel },
      granularity: query.granularity,
      evolution: this.buildEvolution(
        this.filterCreated(requests, range),
        this.filterResolved(requests, range),
        range,
        query.granularity
      ),
    };
  }

  public async getTechnicianLoad(): Promise<TechnicianLoadItem[]> {
    const rows = await this.repository.listTechnicianLoad();
    return [...rows]
      .sort((a, b) => b.active - a.active || a.fullName.localeCompare(b.fullName))
      .map((row) => ({
        technicianId: row.technicianId,
        fullName: row.fullName,
        active: row.active,
        capacity: row.capacity,
        available: Math.max(row.capacity - row.active, 0),
      }));
  }

  public async getMySummary(
    actor: DashboardActor,
    query: DashboardQuery,
    now: Date = new Date()
  ): Promise<MySummary> {
    const scope = this.resolveScope(actor);
    const range = this.normalizeRange(query);
    const filters = {
      from: range.from,
      to: range.toExclusive,
      clientId: query.clientId,
      categoryId: query.categoryId,
    };

    const [requests, overdue] = await Promise.all([
      this.repository.findRequests(filters, scope),
      this.repository.countOverdue(filters, now, scope),
    ]);

    const created = this.filterCreated(requests, range);
    const resolved = this.filterResolved(requests, range);

    return {
      range: { from: range.fromLabel, to: range.toLabel },
      total: created.length,
      byStatus: this.groupByStatus(created),
      byPriority: this.groupByPriority(created),
      overdue,
      avgResolutionHours: this.averageResolutionHours(resolved),
      slaCompliance: this.slaCompliance(resolved),
    };
  }

  private resolveScope(actor: DashboardActor): { clientId?: string; technicianId?: string } {
    if (actor.role === 'TECNICO') {
      if (!actor.technicianId) {
        throw new DomainError(
          'SIN_PERMISO',
          403,
          'El usuario técnico no tiene perfil de técnico asociado.'
        );
      }
      return { technicianId: actor.technicianId };
    }

    if (actor.role === 'CLIENTE') {
      if (!actor.clientId) {
        throw new DomainError(
          'SIN_PERMISO',
          403,
          'El usuario cliente no tiene empresa asociada.'
        );
      }
      return { clientId: actor.clientId };
    }

    throw new DomainError('SIN_PERMISO', 403, 'Resumen no disponible para este rol.');
  }

  private normalizeRange(query: DashboardQuery): NormalizedRange {
    const from = startOfUtcDay(query.from);
    const to = startOfUtcDay(query.to);
    const days = Math.floor((to.getTime() - from.getTime()) / DAY_MS) + 1;

    if (from > to || days > 366) {
      throw new DomainError('RANGO_INVALIDO', 400, 'El rango de fechas no es válido.');
    }

    return {
      from,
      to,
      toExclusive: addDays(to, 1),
      fromLabel: formatDate(from),
      toLabel: formatDate(to),
    };
  }

  private filterCreated(
    requests: DashboardRequestRecord[],
    range: NormalizedRange
  ): DashboardRequestRecord[] {
    return requests.filter(
      (request) => request.createdAt >= range.from && request.createdAt < range.toExclusive
    );
  }

  private filterResolved(
    requests: DashboardRequestRecord[],
    range: NormalizedRange
  ): DashboardRequestRecord[] {
    return requests.filter(
      (request) =>
        request.resolvedAt !== null &&
        request.resolvedAt >= range.from &&
        request.resolvedAt < range.toExclusive
    );
  }

  private groupByStatus(
    requests: DashboardRequestRecord[]
  ): Array<{ status: RequestStatus; count: number }> {
    return REQUEST_STATUSES.map((status) => ({
      status,
      count: requests.filter((request) => request.status === status).length,
    })).filter((item) => item.count > 0);
  }

  private groupByPriority(
    requests: DashboardRequestRecord[]
  ): Array<{ priority: Priority; count: number }> {
    return PRIORITIES.map((priority) => ({
      priority,
      count: requests.filter((request) => request.priority === priority).length,
    })).filter((item) => item.count > 0);
  }

  private averageResolutionHours(requests: DashboardRequestRecord[]): number {
    const resolved = requests.filter((request) => request.resolvedAt !== null);
    if (resolved.length === 0) return 0;

    const totalHours = resolved.reduce((total, request) => {
      const elapsedMs =
        request.resolvedAt!.getTime() - request.createdAt.getTime();
      const pausedMs = request.slaPausedMinutes * 60_000;
      return total + Math.max(elapsedMs - pausedMs, 0) / 3_600_000;
    }, 0);

    return round2(totalHours / resolved.length);
  }

  private slaCompliance(requests: DashboardRequestRecord[]): {
    within: number;
    total: number;
    percentage: number;
  } {
    const total = requests.length;
    if (total === 0) return { within: 0, total: 0, percentage: 0 };

    const within = requests.filter(
      (request) => request.resolvedAt !== null && request.resolvedAt <= request.dueAt
    ).length;

    return { within, total, percentage: round2((within / total) * 100) };
  }

  private buildEvolution(
    created: DashboardRequestRecord[],
    resolved: DashboardRequestRecord[],
    range: NormalizedRange,
    granularity: 'day' | 'week'
  ): Array<{ date: string; created: number; resolved: number }> {
    const step = granularity === 'week' ? 7 : 1;
    const bucketOf = (date: Date): Date =>
      granularity === 'week' ? startOfUtcWeek(date) : startOfUtcDay(date);

    const createdCounts = new Map<string, number>();
    const resolvedCounts = new Map<string, number>();

    for (const request of created) {
      const key = formatDate(bucketOf(request.createdAt));
      createdCounts.set(key, (createdCounts.get(key) ?? 0) + 1);
    }

    for (const request of resolved) {
      const key = formatDate(bucketOf(request.resolvedAt!));
      resolvedCounts.set(key, (resolvedCounts.get(key) ?? 0) + 1);
    }

    const evolution: Array<{ date: string; created: number; resolved: number }> = [];
    const end = bucketOf(range.to);

    for (
      let cursor = bucketOf(range.from);
      cursor <= end;
      cursor = addDays(cursor, step)
    ) {
      const key = formatDate(cursor);
      evolution.push({
        date: key,
        created: createdCounts.get(key) ?? 0,
        resolved: resolvedCounts.get(key) ?? 0,
      });
    }

    return evolution;
  }
}
