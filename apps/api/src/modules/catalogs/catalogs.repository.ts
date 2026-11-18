import { Prisma, type PrismaClient } from '@prisma/client';
import type {
  CreateHolidayDto,
  CreateServiceCategoryDto,
  CreateSpecialtyDto,
  Priority,
  UpdateParameterDto,
  UpdateServiceCategoryDto,
  UpdateSpecialtyDto,
} from '@servigest/shared';
import type {
  HolidayRecord,
  ICatalogRepository,
  RequestStatusRecord,
  ServiceCategoryRecord,
  SpecialtyRecord,
  SystemParameterRecord,
} from './catalogs.service.ts';

type PrismaClientLike = Pick<
  PrismaClient,
  'specialty' | 'serviceCategory' | 'requestStatus' | 'systemParameter' | 'holiday'
>;

function mapSpecialty(row: {
  id: number;
  code: string;
  name: string;
  description: string | null;
  status: string;
}): SpecialtyRecord {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    status: row.status === 'ACTIVA' ? 'ACTIVA' : 'INACTIVA',
  };
}

function mapCategory(row: {
  id: number;
  code: string;
  name: string;
  specialtyId: number;
  defaultPriority: string;
  status: string;
  specialty?: { id: number; code: string; name: string } | null;
}): ServiceCategoryRecord {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    specialtyId: row.specialtyId,
    specialty: row.specialty ?? null,
    defaultPriority: row.defaultPriority as Priority,
    status: row.status === 'ACTIVA' ? 'ACTIVA' : 'INACTIVA',
  };
}

function toDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export class PrismaCatalogRepository implements ICatalogRepository {
  constructor(private readonly client: PrismaClientLike) {}

  public async listSpecialties(): Promise<SpecialtyRecord[]> {
    const rows = await this.client.specialty.findMany({ orderBy: { id: 'asc' } });
    return rows.map(mapSpecialty);
  }

  public async findSpecialtyById(id: number): Promise<SpecialtyRecord | null> {
    const row = await this.client.specialty.findUnique({ where: { id } });
    return row ? mapSpecialty(row) : null;
  }

  public async findSpecialtyByCode(code: string): Promise<SpecialtyRecord | null> {
    const row = await this.client.specialty.findUnique({ where: { code } });
    return row ? mapSpecialty(row) : null;
  }

  public async findSpecialtyByName(name: string): Promise<SpecialtyRecord | null> {
    const row = await this.client.specialty.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    return row ? mapSpecialty(row) : null;
  }

  public async createSpecialty(input: CreateSpecialtyDto): Promise<SpecialtyRecord> {
    const row = await this.client.specialty.create({
      data: {
        code: input.code,
        name: input.name,
        description: input.description ?? null,
      },
    });
    return mapSpecialty(row);
  }

  public async updateSpecialty(
    id: number,
    input: UpdateSpecialtyDto
  ): Promise<SpecialtyRecord> {
    const row = await this.client.specialty.update({
      where: { id },
      data: {
        ...(input.code !== undefined ? { code: input.code } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
    });
    return mapSpecialty(row);
  }

  public async listCategories(): Promise<ServiceCategoryRecord[]> {
    const rows = await this.client.serviceCategory.findMany({
      include: { specialty: { select: { id: true, code: true, name: true } } },
      orderBy: { id: 'asc' },
    });
    return rows.map(mapCategory);
  }

  public async findCategoryById(id: number): Promise<ServiceCategoryRecord | null> {
    const row = await this.client.serviceCategory.findUnique({
      where: { id },
      include: { specialty: { select: { id: true, code: true, name: true } } },
    });
    return row ? mapCategory(row) : null;
  }

  public async findCategoryByCode(code: string): Promise<ServiceCategoryRecord | null> {
    const row = await this.client.serviceCategory.findUnique({
      where: { code },
      include: { specialty: { select: { id: true, code: true, name: true } } },
    });
    return row ? mapCategory(row) : null;
  }

  public async createCategory(input: CreateServiceCategoryDto): Promise<ServiceCategoryRecord> {
    const row = await this.client.serviceCategory.create({
      data: {
        code: input.code,
        name: input.name,
        specialtyId: input.specialtyId,
        defaultPriority: input.defaultPriority,
      },
      include: { specialty: { select: { id: true, code: true, name: true } } },
    });
    return mapCategory(row);
  }

  public async updateCategory(
    id: number,
    input: UpdateServiceCategoryDto
  ): Promise<ServiceCategoryRecord> {
    const row = await this.client.serviceCategory.update({
      where: { id },
      data: {
        ...(input.code !== undefined ? { code: input.code } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.specialtyId !== undefined ? { specialtyId: input.specialtyId } : {}),
        ...(input.defaultPriority !== undefined
          ? { defaultPriority: input.defaultPriority }
          : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
      include: { specialty: { select: { id: true, code: true, name: true } } },
    });
    return mapCategory(row);
  }

  public async listStatuses(): Promise<RequestStatusRecord[]> {
    const rows = await this.client.requestStatus.findMany({ orderBy: { sortOrder: 'asc' } });
    return rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      isTerminal: row.isTerminal,
      sortOrder: row.sortOrder,
    }));
  }

  public async listParameters(): Promise<SystemParameterRecord[]> {
    const rows = await this.client.systemParameter.findMany({ orderBy: { key: 'asc' } });
    return rows.map((row) => ({
      key: row.key,
      value: row.value,
      description: row.description,
      updatedBy: row.updatedBy,
      updatedAt: row.updatedAt,
    }));
  }

  public async findParameterByKey(key: string): Promise<SystemParameterRecord | null> {
    const row = await this.client.systemParameter.findUnique({ where: { key } });
    if (!row) return null;
    return {
      key: row.key,
      value: row.value,
      description: row.description,
      updatedBy: row.updatedBy,
      updatedAt: row.updatedAt,
    };
  }

  public async updateParameter(
    key: string,
    input: UpdateParameterDto,
    updatedBy: string
  ): Promise<SystemParameterRecord> {
    const row = await this.client.systemParameter.update({
      where: { key },
      data: {
        value: input.value as Prisma.InputJsonValue,
        ...(input.description !== undefined ? { description: input.description } : {}),
        updatedBy,
      },
    });
    return {
      key: row.key,
      value: row.value,
      description: row.description,
      updatedBy: row.updatedBy,
      updatedAt: row.updatedAt,
    };
  }

  public async listHolidays(): Promise<HolidayRecord[]> {
    const rows = await this.client.holiday.findMany({ orderBy: { date: 'asc' } });
    return rows.map((row) => ({
      date: row.date.toISOString().slice(0, 10),
      name: row.name,
    }));
  }

  public async findHoliday(date: string): Promise<HolidayRecord | null> {
    const row = await this.client.holiday.findUnique({ where: { date: toDateOnly(date) } });
    return row ? { date: row.date.toISOString().slice(0, 10), name: row.name } : null;
  }

  public async createHoliday(input: CreateHolidayDto): Promise<HolidayRecord> {
    const row = await this.client.holiday.create({
      data: { date: toDateOnly(input.date), name: input.name },
    });
    return { date: row.date.toISOString().slice(0, 10), name: row.name };
  }

  public async deleteHoliday(date: string): Promise<void> {
    await this.client.holiday.delete({ where: { date: toDateOnly(date) } });
  }
}

export class InMemoryCatalogRepository implements ICatalogRepository {
  private specialties = new Map<number, SpecialtyRecord>();
  private categories = new Map<number, ServiceCategoryRecord>();
  private statuses: RequestStatusRecord[] = [];
  private parameters = new Map<string, SystemParameterRecord>();
  private holidays = new Map<string, HolidayRecord>();
  private nextSpecialtyId = 1;
  private nextCategoryId = 1;

  constructor(
    initial: {
      specialties?: SpecialtyRecord[];
      categories?: ServiceCategoryRecord[];
      statuses?: RequestStatusRecord[];
      parameters?: SystemParameterRecord[];
      holidays?: HolidayRecord[];
    } = {}
  ) {
    for (const specialty of initial.specialties ?? []) {
      this.specialties.set(specialty.id, { ...specialty });
      this.nextSpecialtyId = Math.max(this.nextSpecialtyId, specialty.id + 1);
    }
    for (const category of initial.categories ?? []) {
      this.categories.set(category.id, { ...category });
      this.nextCategoryId = Math.max(this.nextCategoryId, category.id + 1);
    }
    this.statuses = (initial.statuses ?? []).map((status) => ({ ...status }));
    for (const parameter of initial.parameters ?? []) {
      this.parameters.set(parameter.key, { ...parameter });
    }
    for (const holiday of initial.holidays ?? []) {
      this.holidays.set(holiday.date, { ...holiday });
    }
  }

  public async listSpecialties(): Promise<SpecialtyRecord[]> {
    return Array.from(this.specialties.values())
      .sort((a, b) => a.id - b.id)
      .map((row) => ({ ...row }));
  }

  public async findSpecialtyById(id: number): Promise<SpecialtyRecord | null> {
    const row = this.specialties.get(id);
    return row ? { ...row } : null;
  }

  public async findSpecialtyByCode(code: string): Promise<SpecialtyRecord | null> {
    for (const row of this.specialties.values()) {
      if (row.code.toLowerCase() === code.toLowerCase()) return { ...row };
    }
    return null;
  }

  public async findSpecialtyByName(name: string): Promise<SpecialtyRecord | null> {
    for (const row of this.specialties.values()) {
      if (row.name.toLowerCase() === name.toLowerCase()) return { ...row };
    }
    return null;
  }

  public async createSpecialty(input: CreateSpecialtyDto): Promise<SpecialtyRecord> {
    const row: SpecialtyRecord = {
      id: this.nextSpecialtyId++,
      code: input.code,
      name: input.name,
      description: input.description ?? null,
      status: 'ACTIVA',
    };
    this.specialties.set(row.id, row);
    return { ...row };
  }

  public async updateSpecialty(
    id: number,
    input: UpdateSpecialtyDto
  ): Promise<SpecialtyRecord> {
    const row = this.specialties.get(id);
    if (!row) throw new Error('ESPECIALIDAD_NO_ENCONTRADA');
    Object.assign(row, input);
    return { ...row };
  }

  public async listCategories(): Promise<ServiceCategoryRecord[]> {
    return Array.from(this.categories.values())
      .sort((a, b) => a.id - b.id)
      .map((row) => ({ ...row, specialty: row.specialty ? { ...row.specialty } : null }));
  }

  public async findCategoryById(id: number): Promise<ServiceCategoryRecord | null> {
    const row = this.categories.get(id);
    return row ? { ...row, specialty: row.specialty ? { ...row.specialty } : null } : null;
  }

  public async findCategoryByCode(code: string): Promise<ServiceCategoryRecord | null> {
    for (const row of this.categories.values()) {
      if (row.code.toLowerCase() === code.toLowerCase()) {
        return { ...row, specialty: row.specialty ? { ...row.specialty } : null };
      }
    }
    return null;
  }

  public async createCategory(input: CreateServiceCategoryDto): Promise<ServiceCategoryRecord> {
    const specialty = this.specialties.get(input.specialtyId);
    const row: ServiceCategoryRecord = {
      id: this.nextCategoryId++,
      code: input.code,
      name: input.name,
      specialtyId: input.specialtyId,
      specialty: specialty ? { id: specialty.id, code: specialty.code, name: specialty.name } : null,
      defaultPriority: input.defaultPriority,
      status: 'ACTIVA',
    };
    this.categories.set(row.id, row);
    return { ...row, specialty: row.specialty ? { ...row.specialty } : null };
  }

  public async updateCategory(
    id: number,
    input: UpdateServiceCategoryDto
  ): Promise<ServiceCategoryRecord> {
    const row = this.categories.get(id);
    if (!row) throw new Error('CATEGORIA_NO_ENCONTRADA');
    if (input.specialtyId !== undefined) {
      row.specialtyId = input.specialtyId;
      const specialty = this.specialties.get(input.specialtyId);
      row.specialty = specialty
        ? { id: specialty.id, code: specialty.code, name: specialty.name }
        : null;
    }
    if (input.code !== undefined) row.code = input.code;
    if (input.name !== undefined) row.name = input.name;
    if (input.defaultPriority !== undefined) row.defaultPriority = input.defaultPriority;
    if (input.status !== undefined) row.status = input.status;
    return { ...row, specialty: row.specialty ? { ...row.specialty } : null };
  }

  public async listStatuses(): Promise<RequestStatusRecord[]> {
    return this.statuses.map((row) => ({ ...row }));
  }

  public async listParameters(): Promise<SystemParameterRecord[]> {
    return Array.from(this.parameters.values())
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((row) => ({ ...row }));
  }

  public async findParameterByKey(key: string): Promise<SystemParameterRecord | null> {
    const row = this.parameters.get(key);
    return row ? { ...row } : null;
  }

  public async updateParameter(
    key: string,
    input: UpdateParameterDto,
    updatedBy: string
  ): Promise<SystemParameterRecord> {
    const row = this.parameters.get(key);
    if (!row) throw new Error('PARAMETRO_NO_ENCONTRADO');
    row.value = input.value;
    if (input.description !== undefined) row.description = input.description;
    row.updatedBy = updatedBy;
    row.updatedAt = new Date();
    return { ...row };
  }

  public async listHolidays(): Promise<HolidayRecord[]> {
    return Array.from(this.holidays.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((row) => ({ ...row }));
  }

  public async findHoliday(date: string): Promise<HolidayRecord | null> {
    const row = this.holidays.get(date);
    return row ? { ...row } : null;
  }

  public async createHoliday(input: CreateHolidayDto): Promise<HolidayRecord> {
    const row: HolidayRecord = { date: input.date, name: input.name };
    this.holidays.set(row.date, row);
    return { ...row };
  }

  public async deleteHoliday(date: string): Promise<void> {
    this.holidays.delete(date);
  }
}
