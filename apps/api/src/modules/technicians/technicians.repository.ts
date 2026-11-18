import { Prisma, PrismaClient } from '@prisma/client';
import type {
  TechnicianListFilter,
  TechnicianSpecialtyDto,
  UpdateTechnicianDto,
} from '@servigest/shared';
import type { Role } from '@servigest/shared';
import type {
  CreateTechnicianRecordInput,
  ITechnicianRepository,
  TechnicianListResult,
  TechnicianRecord,
  TechnicianSpecialtyRecord,
  TechnicianUserRecord,
} from './technicians.service.ts';

const TECHNICIAN_INCLUDE = {
  user: {
    select: {
      id: true,
      fullName: true,
      email: true,
      status: true,
      role: { select: { code: true } },
    },
  },
  specialties: {
    include: {
      specialty: { select: { code: true, name: true } },
    },
  },
  assignments: {
    where: { status: 'VIGENTE' },
    select: { id: true },
  },
} as const;

type TechnicianRow = {
  id: string;
  userId: string;
  employeeCode: string;
  availability: string;
  maxConcurrentLoad: number;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    fullName: string;
    email: string;
    status: string;
    role: { code: string };
  };
  specialties: Array<{
    specialtyId: number;
    level: string;
    specialty: { code: string; name: string };
  }>;
  assignments: Array<{ id: string }>;
};

function mapTechnician(row: TechnicianRow): TechnicianRecord {
  return {
    id: row.id,
    userId: row.userId,
    employeeCode: row.employeeCode,
    availability: row.availability === 'DISPONIBLE' ? 'DISPONIBLE' : 'NO_DISPONIBLE',
    maxConcurrentLoad: row.maxConcurrentLoad,
    user: {
      id: row.user.id,
      fullName: row.user.fullName,
      email: row.user.email,
      role: row.user.role.code as Role,
      status: row.user.status === 'ACTIVO' ? 'ACTIVO' : 'INACTIVO',
    },
    specialties: row.specialties.map((item) => ({
      specialtyId: item.specialtyId,
      code: item.specialty.code,
      name: item.specialty.name,
      level: item.level as TechnicianSpecialtyRecord['level'],
    })),
    activeLoad: row.assignments.length,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PrismaTechnicianRepository implements ITechnicianRepository {
  constructor(private readonly client: PrismaClient) {}

  public async list(
    filter: TechnicianListFilter,
    scopeTechnicianId?: string
  ): Promise<TechnicianListResult> {
    const where: Prisma.TechnicianWhereInput = {
      ...(scopeTechnicianId ? { id: scopeTechnicianId } : {}),
      ...(filter.availability ? { availability: filter.availability } : {}),
      ...(filter.status ? { user: { status: filter.status } } : {}),
      ...(filter.specialtyId
        ? { specialties: { some: { specialtyId: filter.specialtyId } } }
        : {}),
      ...(filter.search
        ? {
            OR: [
              { employeeCode: { contains: filter.search, mode: 'insensitive' } },
              { user: { fullName: { contains: filter.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.client.technician.findMany({
        where,
        include: TECHNICIAN_INCLUDE,
        orderBy: { employeeCode: 'asc' },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.client.technician.count({ where }),
    ]);

    return { items: rows.map(mapTechnician), total };
  }

  public async findById(id: string): Promise<TechnicianRecord | null> {
    const row = await this.client.technician.findUnique({
      where: { id },
      include: TECHNICIAN_INCLUDE,
    });
    return row ? mapTechnician(row) : null;
  }

  public async findByUserId(userId: string): Promise<TechnicianRecord | null> {
    const row = await this.client.technician.findUnique({
      where: { userId },
      include: TECHNICIAN_INCLUDE,
    });
    return row ? mapTechnician(row) : null;
  }

  public async findByEmployeeCode(code: string): Promise<TechnicianRecord | null> {
    const row = await this.client.technician.findUnique({
      where: { employeeCode: code },
      include: TECHNICIAN_INCLUDE,
    });
    return row ? mapTechnician(row) : null;
  }

  public async findUser(userId: string): Promise<TechnicianUserRecord | null> {
    const user = await this.client.user.findUnique({
      where: { id: userId },
      include: { role: { select: { code: true } } },
    });
    if (!user) return null;
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role.code as Role,
      status: user.status === 'ACTIVO' ? 'ACTIVO' : 'INACTIVO',
    };
  }

  public async findExistingSpecialtyIds(ids: number[]): Promise<number[]> {
    const rows = await this.client.specialty.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  public async create(input: CreateTechnicianRecordInput): Promise<TechnicianRecord> {
    const row = await this.client.technician.create({
      data: {
        userId: input.userId,
        employeeCode: input.employeeCode,
        availability: input.availability,
        maxConcurrentLoad: input.maxConcurrentLoad,
        specialties: {
          create: input.specialties.map((item) => ({
            specialtyId: item.specialtyId,
            level: item.level,
          })),
        },
      },
      include: TECHNICIAN_INCLUDE,
    });
    return mapTechnician(row);
  }

  public async update(id: string, input: UpdateTechnicianDto): Promise<TechnicianRecord> {
    const row = await this.client.technician.update({
      where: { id },
      data: {
        ...(input.employeeCode !== undefined ? { employeeCode: input.employeeCode } : {}),
        ...(input.availability !== undefined ? { availability: input.availability } : {}),
        ...(input.maxConcurrentLoad !== undefined
          ? { maxConcurrentLoad: input.maxConcurrentLoad }
          : {}),
      },
      include: TECHNICIAN_INCLUDE,
    });
    return mapTechnician(row);
  }

  public async replaceSpecialties(
    id: string,
    specialties: TechnicianSpecialtyDto[]
  ): Promise<TechnicianRecord> {
    await this.client.$transaction(async (tx) => {
      await tx.technicianSpecialty.deleteMany({ where: { technicianId: id } });
      await tx.technicianSpecialty.createMany({
        data: specialties.map((item) => ({
          technicianId: id,
          specialtyId: item.specialtyId,
          level: item.level,
        })),
      });
    });

    const row = await this.findById(id);
    if (!row) {
      throw new Error('TECNICO_NO_ENCONTRADO');
    }
    return row;
  }

  public async countActiveAssignments(id: string): Promise<number> {
    return this.client.requestAssignment.count({
      where: { technicianId: id, status: 'VIGENTE' },
    });
  }

  public async deactivate(id: string): Promise<void> {
    await this.client.$transaction(async (tx) => {
      const technician = await tx.technician.update({
        where: { id },
        data: { availability: 'NO_DISPONIBLE' },
        select: { userId: true },
      });
      await tx.user.update({
        where: { id: technician.userId },
        data: { status: 'INACTIVO' },
      });
    });
  }
}

interface SeedTechnician {
  id: string;
  userId: string;
  employeeCode: string;
  availability: 'DISPONIBLE' | 'NO_DISPONIBLE';
  maxConcurrentLoad: number;
  createdAt: Date;
  updatedAt: Date;
  specialties: TechnicianSpecialtyRecord[];
}

export class InMemoryTechnicianRepository implements ITechnicianRepository {
  private technicians = new Map<string, SeedTechnician>();
  private users = new Map<string, TechnicianUserRecord>();
  private specialties = new Map<number, { code: string; name: string }>();
  private activeLoads = new Map<string, number>();

  constructor(
    initial: {
      users?: TechnicianUserRecord[];
      specialties?: Array<{ id: number; code: string; name: string }>;
      technicians?: SeedTechnician[];
      activeLoads?: Record<string, number>;
    } = {}
  ) {
    for (const user of initial.users ?? []) this.users.set(user.id, { ...user });
    for (const specialty of initial.specialties ?? []) {
      this.specialties.set(specialty.id, { code: specialty.code, name: specialty.name });
    }
    for (const technician of initial.technicians ?? []) {
      this.technicians.set(technician.id, {
        ...technician,
        specialties: technician.specialties.map((item) => ({ ...item })),
      });
    }
    for (const [id, count] of Object.entries(initial.activeLoads ?? {})) {
      this.activeLoads.set(id, count);
    }
  }

  public async list(
    filter: TechnicianListFilter,
    scopeTechnicianId?: string
  ): Promise<TechnicianListResult> {
    const search = filter.search?.toLowerCase();
    const rows = Array.from(this.technicians.values())
      .filter((technician) => !scopeTechnicianId || technician.id === scopeTechnicianId)
      .filter((technician) => !filter.availability || technician.availability === filter.availability)
      .filter((technician) => {
        const user = this.users.get(technician.userId);
        return !filter.status || user?.status === filter.status;
      })
      .filter(
        (technician) =>
          !filter.specialtyId ||
          technician.specialties.some((item) => item.specialtyId === filter.specialtyId)
      )
      .filter((technician) => {
        if (!search) return true;
        const user = this.users.get(technician.userId);
        return (
          technician.employeeCode.toLowerCase().includes(search) ||
          (user?.fullName ?? '').toLowerCase().includes(search)
        );
      })
      .sort((a, b) => a.employeeCode.localeCompare(b.employeeCode));

    const start = (filter.page - 1) * filter.pageSize;
    return {
      items: rows.slice(start, start + filter.pageSize).map((row) => this.toRecord(row)),
      total: rows.length,
    };
  }

  public async findById(id: string): Promise<TechnicianRecord | null> {
    const technician = this.technicians.get(id);
    return technician ? this.toRecord(technician) : null;
  }

  public async findByUserId(userId: string): Promise<TechnicianRecord | null> {
    for (const technician of this.technicians.values()) {
      if (technician.userId === userId) return this.toRecord(technician);
    }
    return null;
  }

  public async findByEmployeeCode(code: string): Promise<TechnicianRecord | null> {
    for (const technician of this.technicians.values()) {
      if (technician.employeeCode.toLowerCase() === code.toLowerCase()) {
        return this.toRecord(technician);
      }
    }
    return null;
  }

  public async findUser(userId: string): Promise<TechnicianUserRecord | null> {
    const user = this.users.get(userId);
    return user ? { ...user } : null;
  }

  public async findExistingSpecialtyIds(ids: number[]): Promise<number[]> {
    return ids.filter((id) => this.specialties.has(id));
  }

  public async create(input: CreateTechnicianRecordInput): Promise<TechnicianRecord> {
    const now = new Date();
    const technician: SeedTechnician = {
      id: `tec-${now.getTime()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: input.userId,
      employeeCode: input.employeeCode,
      availability: input.availability,
      maxConcurrentLoad: input.maxConcurrentLoad,
      createdAt: now,
      updatedAt: now,
      specialties: input.specialties.map((item) => ({
        specialtyId: item.specialtyId,
        level: item.level,
        code: this.specialties.get(item.specialtyId)?.code ?? '',
        name: this.specialties.get(item.specialtyId)?.name ?? '',
      })),
    };
    this.technicians.set(technician.id, technician);
    return this.toRecord(technician);
  }

  public async update(id: string, input: UpdateTechnicianDto): Promise<TechnicianRecord> {
    const technician = this.technicians.get(id);
    if (!technician) throw new Error('TECNICO_NO_ENCONTRADO');
    if (input.employeeCode !== undefined) technician.employeeCode = input.employeeCode;
    if (input.availability !== undefined) technician.availability = input.availability;
    if (input.maxConcurrentLoad !== undefined) {
      technician.maxConcurrentLoad = input.maxConcurrentLoad;
    }
    technician.updatedAt = new Date();
    return this.toRecord(technician);
  }

  public async replaceSpecialties(
    id: string,
    specialties: TechnicianSpecialtyDto[]
  ): Promise<TechnicianRecord> {
    const technician = this.technicians.get(id);
    if (!technician) throw new Error('TECNICO_NO_ENCONTRADO');
    technician.specialties = specialties.map((item) => ({
      specialtyId: item.specialtyId,
      level: item.level,
      code: this.specialties.get(item.specialtyId)?.code ?? '',
      name: this.specialties.get(item.specialtyId)?.name ?? '',
    }));
    technician.updatedAt = new Date();
    return this.toRecord(technician);
  }

  public async countActiveAssignments(id: string): Promise<number> {
    return this.activeLoads.get(id) ?? 0;
  }

  public async deactivate(id: string): Promise<void> {
    const technician = this.technicians.get(id);
    if (!technician) throw new Error('TECNICO_NO_ENCONTRADO');
    technician.availability = 'NO_DISPONIBLE';
    const user = this.users.get(technician.userId);
    if (user) user.status = 'INACTIVO';
  }

  private toRecord(technician: SeedTechnician): TechnicianRecord {
    const user = this.users.get(technician.userId);
    return {
      ...technician,
      specialties: technician.specialties.map((item) => ({ ...item })),
      user:
        user ?? {
          id: technician.userId,
          fullName: '',
          email: '',
          role: 'TECNICO',
          status: 'ACTIVO',
        },
      activeLoad: this.activeLoads.get(technician.id) ?? 0,
    };
  }
}
