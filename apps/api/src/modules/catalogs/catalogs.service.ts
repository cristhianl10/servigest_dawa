import type {
  CreateHolidayDto,
  CreateServiceCategoryDto,
  CreateSpecialtyDto,
  Priority,
  UpdateParameterDto,
  UpdateServiceCategoryDto,
  UpdateSpecialtyDto,
} from '@servigest/shared';
import { DomainError } from '../../domain/errors/domain-error.ts';

export interface SpecialtyRecord {
  id: number;
  code: string;
  name: string;
  description: string | null;
  status: 'ACTIVA' | 'INACTIVA';
}

export interface ServiceCategoryRecord {
  id: number;
  code: string;
  name: string;
  specialtyId: number;
  specialty: { id: number; code: string; name: string } | null;
  defaultPriority: Priority;
  status: 'ACTIVA' | 'INACTIVA';
}

export interface RequestStatusRecord {
  id: number;
  code: string;
  name: string;
  isTerminal: boolean;
  sortOrder: number;
}

export interface SystemParameterRecord {
  key: string;
  value: unknown;
  description: string | null;
  updatedBy: string | null;
  updatedAt: Date;
}

export interface HolidayRecord {
  date: string;
  name: string;
}

export interface ICatalogRepository {
  listSpecialties(): Promise<SpecialtyRecord[]>;
  findSpecialtyById(id: number): Promise<SpecialtyRecord | null>;
  findSpecialtyByCode(code: string): Promise<SpecialtyRecord | null>;
  findSpecialtyByName(name: string): Promise<SpecialtyRecord | null>;
  createSpecialty(input: CreateSpecialtyDto): Promise<SpecialtyRecord>;
  updateSpecialty(id: number, input: UpdateSpecialtyDto): Promise<SpecialtyRecord>;

  listCategories(): Promise<ServiceCategoryRecord[]>;
  findCategoryById(id: number): Promise<ServiceCategoryRecord | null>;
  findCategoryByCode(code: string): Promise<ServiceCategoryRecord | null>;
  createCategory(input: CreateServiceCategoryDto): Promise<ServiceCategoryRecord>;
  updateCategory(
    id: number,
    input: UpdateServiceCategoryDto
  ): Promise<ServiceCategoryRecord>;

  listStatuses(): Promise<RequestStatusRecord[]>;

  listParameters(): Promise<SystemParameterRecord[]>;
  findParameterByKey(key: string): Promise<SystemParameterRecord | null>;
  updateParameter(
    key: string,
    input: UpdateParameterDto,
    updatedBy: string
  ): Promise<SystemParameterRecord>;

  listHolidays(): Promise<HolidayRecord[]>;
  findHoliday(date: string): Promise<HolidayRecord | null>;
  createHoliday(input: CreateHolidayDto): Promise<HolidayRecord>;
  deleteHoliday(date: string): Promise<void>;
}

export class CatalogsService {
  constructor(private readonly repository: ICatalogRepository) {}

  public listSpecialties(): Promise<SpecialtyRecord[]> {
    return this.repository.listSpecialties();
  }

  public async createSpecialty(input: CreateSpecialtyDto): Promise<SpecialtyRecord> {
    const code = input.code.trim().toUpperCase();
    if (await this.repository.findSpecialtyByCode(code)) {
      throw new DomainError('ENTIDAD_EN_USO', 409, 'El código de especialidad ya existe.');
    }
    if (await this.repository.findSpecialtyByName(input.name.trim())) {
      throw new DomainError('ENTIDAD_EN_USO', 409, 'El nombre de especialidad ya existe.');
    }
    return this.repository.createSpecialty({ ...input, code, name: input.name.trim() });
  }

  public async updateSpecialty(
    id: number,
    input: UpdateSpecialtyDto
  ): Promise<SpecialtyRecord> {
    const current = await this.repository.findSpecialtyById(id);
    if (!current) {
      throw new DomainError('RECURSO_NO_ENCONTRADO', 404, 'Especialidad no encontrada.');
    }

    if (input.code) {
      const duplicated = await this.repository.findSpecialtyByCode(input.code.trim().toUpperCase());
      if (duplicated && duplicated.id !== id) {
        throw new DomainError('ENTIDAD_EN_USO', 409, 'El código de especialidad ya existe.');
      }
    }
    if (input.name) {
      const duplicated = await this.repository.findSpecialtyByName(input.name.trim());
      if (duplicated && duplicated.id !== id) {
        throw new DomainError('ENTIDAD_EN_USO', 409, 'El nombre de especialidad ya existe.');
      }
    }

    return this.repository.updateSpecialty(id, {
      ...input,
      ...(input.code !== undefined ? { code: input.code.trim().toUpperCase() } : {}),
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
    });
  }

  public async deactivateSpecialty(id: number): Promise<void> {
    const current = await this.repository.findSpecialtyById(id);
    if (!current) {
      throw new DomainError('RECURSO_NO_ENCONTRADO', 404, 'Especialidad no encontrada.');
    }
    if (current.status === 'INACTIVA') return;
    await this.repository.updateSpecialty(id, { status: 'INACTIVA' });
  }

  public listCategories(): Promise<ServiceCategoryRecord[]> {
    return this.repository.listCategories();
  }

  public async createCategory(input: CreateServiceCategoryDto): Promise<ServiceCategoryRecord> {
    const code = input.code.trim().toUpperCase();
    if (await this.repository.findCategoryByCode(code)) {
      throw new DomainError('ENTIDAD_EN_USO', 409, 'El código de categoría ya existe.');
    }
    await this.assertSpecialty(input.specialtyId);
    return this.repository.createCategory({ ...input, code, name: input.name.trim() });
  }

  public async updateCategory(
    id: number,
    input: UpdateServiceCategoryDto
  ): Promise<ServiceCategoryRecord> {
    const current = await this.repository.findCategoryById(id);
    if (!current) {
      throw new DomainError('RECURSO_NO_ENCONTRADO', 404, 'Categoría de servicio no encontrada.');
    }

    if (input.code) {
      const duplicated = await this.repository.findCategoryByCode(
        input.code.trim().toUpperCase()
      );
      if (duplicated && duplicated.id !== id) {
        throw new DomainError('ENTIDAD_EN_USO', 409, 'El código de categoría ya existe.');
      }
    }
    if (input.specialtyId !== undefined) {
      await this.assertSpecialty(input.specialtyId);
    }

    return this.repository.updateCategory(id, {
      ...input,
      ...(input.code !== undefined ? { code: input.code.trim().toUpperCase() } : {}),
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
    });
  }

  public async deactivateCategory(id: number): Promise<void> {
    const current = await this.repository.findCategoryById(id);
    if (!current) {
      throw new DomainError('RECURSO_NO_ENCONTRADO', 404, 'Categoría de servicio no encontrada.');
    }
    if (current.status === 'INACTIVA') return;
    await this.repository.updateCategory(id, { status: 'INACTIVA' });
  }

  public listStatuses(): Promise<RequestStatusRecord[]> {
    return this.repository.listStatuses();
  }

  public listParameters(): Promise<SystemParameterRecord[]> {
    return this.repository.listParameters();
  }

  public async updateParameter(
    key: string,
    input: UpdateParameterDto,
    updatedBy: string
  ): Promise<SystemParameterRecord> {
    const current = await this.repository.findParameterByKey(key);
    if (!current) {
      throw new DomainError('RECURSO_NO_ENCONTRADO', 404, 'Parámetro no encontrado.');
    }
    return this.repository.updateParameter(key, input, updatedBy);
  }

  public listHolidays(): Promise<HolidayRecord[]> {
    return this.repository.listHolidays();
  }

  public async createHoliday(input: CreateHolidayDto): Promise<HolidayRecord> {
    const existing = await this.repository.findHoliday(input.date);
    if (existing) {
      throw new DomainError('ENTIDAD_EN_USO', 409, 'La fecha ya está registrada como feriado.');
    }
    return this.repository.createHoliday({ ...input, name: input.name.trim() });
  }

  public async deleteHoliday(date: string): Promise<void> {
    const existing = await this.repository.findHoliday(date);
    if (!existing) {
      throw new DomainError('RECURSO_NO_ENCONTRADO', 404, 'Feriado no encontrado.');
    }
    await this.repository.deleteHoliday(date);
  }

  private async assertSpecialty(id: number): Promise<void> {
    const specialty = await this.repository.findSpecialtyById(id);
    if (!specialty) {
      throw new DomainError(
        'VALIDACION_FALLIDA',
        422,
        'La especialidad indicada no existe.',
        [{ field: 'specialtyId', issue: 'Especialidad inexistente' }]
      );
    }
  }
}
