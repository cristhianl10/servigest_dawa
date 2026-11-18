import type {
  CreateTechnicianDto,
  Role,
  TechnicianListFilter,
  TechnicianSpecialtyDto,
  UpdateTechnicianDto,
} from '@servigest/shared';
import { DomainError } from '../../domain/errors/domain-error.ts';

export interface TechnicianSpecialtyRecord {
  specialtyId: number;
  code: string;
  name: string;
  level: 'BASICO' | 'INTERMEDIO' | 'AVANZADO';
}

export interface TechnicianUserRecord {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  status: 'ACTIVO' | 'INACTIVO';
}

export interface TechnicianRecord {
  id: string;
  userId: string;
  employeeCode: string;
  availability: 'DISPONIBLE' | 'NO_DISPONIBLE';
  maxConcurrentLoad: number;
  user: TechnicianUserRecord;
  specialties: TechnicianSpecialtyRecord[];
  activeLoad: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TechnicianListResult {
  items: TechnicianRecord[];
  total: number;
}

export interface TechnicianLoad {
  vigentes: number;
  maximo: number;
  disponible: boolean;
  cuposDisponibles: number;
}

export interface CreateTechnicianRecordInput {
  userId: string;
  employeeCode: string;
  availability: 'DISPONIBLE' | 'NO_DISPONIBLE';
  maxConcurrentLoad: number;
  specialties: TechnicianSpecialtyDto[];
}

export interface ITechnicianRepository {
  list(filter: TechnicianListFilter, scopeTechnicianId?: string): Promise<TechnicianListResult>;
  findById(id: string): Promise<TechnicianRecord | null>;
  findByUserId(userId: string): Promise<TechnicianRecord | null>;
  findByEmployeeCode(code: string): Promise<TechnicianRecord | null>;
  findUser(userId: string): Promise<TechnicianUserRecord | null>;
  findExistingSpecialtyIds(ids: number[]): Promise<number[]>;
  create(input: CreateTechnicianRecordInput): Promise<TechnicianRecord>;
  update(id: string, input: UpdateTechnicianDto): Promise<TechnicianRecord>;
  replaceSpecialties(id: string, specialties: TechnicianSpecialtyDto[]): Promise<TechnicianRecord>;
  countActiveAssignments(id: string): Promise<number>;
  deactivate(id: string): Promise<void>;
}

export interface ActorLike {
  id: string;
  role: Role;
  technicianId?: string | null;
}

export class TechniciansService {
  constructor(private readonly repository: ITechnicianRepository) {}

  public async list(
    filter: TechnicianListFilter,
    actor: ActorLike
  ): Promise<TechnicianListResult> {
    let scope: string | undefined;
    if (actor.role === 'TECNICO') {
      if (!actor.technicianId) {
        return { items: [], total: 0 };
      }
      scope = actor.technicianId;
    }
    return this.repository.list(filter, scope);
  }

  public async getById(id: string, actor?: ActorLike): Promise<TechnicianRecord> {
    if (actor?.role === 'TECNICO' && actor.technicianId !== id) {
      throw new DomainError('SIN_PERMISO', 403, 'Solo puede consultar su propio perfil técnico.');
    }
    const technician = await this.repository.findById(id);
    if (!technician) {
      throw new DomainError('RECURSO_NO_ENCONTRADO', 404, 'Técnico no encontrado.');
    }
    return technician;
  }

  public async create(input: CreateTechnicianDto): Promise<TechnicianRecord> {
    const user = await this.repository.findUser(input.userId);
    if (!user) {
      throw new DomainError('RECURSO_NO_ENCONTRADO', 404, 'Usuario no encontrado.');
    }
    if (user.role !== 'TECNICO') {
      throw new DomainError(
        'VALIDACION_FALLIDA',
        422,
        'El usuario vinculado debe tener rol TECNICO.',
        [{ field: 'userId', issue: 'Rol distinto de TECNICO' }]
      );
    }
    if (user.status !== 'ACTIVO') {
      throw new DomainError('TECNICO_NO_DISPONIBLE', 409, 'El usuario técnico está inactivo.');
    }

    const existingUser = await this.repository.findByUserId(input.userId);
    if (existingUser) {
      throw new DomainError('ENTIDAD_EN_USO', 409, 'El usuario ya tiene un perfil de técnico.');
    }

    const existingCode = await this.repository.findByEmployeeCode(input.employeeCode.trim());
    if (existingCode) {
      throw new DomainError('ENTIDAD_EN_USO', 409, 'El código de empleado ya está registrado.');
    }

    await this.assertSpecialties(input.specialties);

    return this.repository.create({
      ...input,
      employeeCode: input.employeeCode.trim(),
    });
  }

  public async update(id: string, input: UpdateTechnicianDto): Promise<TechnicianRecord> {
    await this.getById(id);

    if (input.employeeCode) {
      const existing = await this.repository.findByEmployeeCode(input.employeeCode.trim());
      if (existing && existing.id !== id) {
        throw new DomainError('ENTIDAD_EN_USO', 409, 'El código de empleado ya está registrado.');
      }
    }

    return this.repository.update(id, {
      ...input,
      ...(input.employeeCode !== undefined ? { employeeCode: input.employeeCode.trim() } : {}),
    });
  }

  public async replaceSpecialties(
    id: string,
    specialties: TechnicianSpecialtyDto[]
  ): Promise<TechnicianRecord> {
    await this.getById(id);
    await this.assertSpecialties(specialties);
    return this.repository.replaceSpecialties(id, specialties);
  }

  public async deactivate(id: string): Promise<void> {
    await this.getById(id);
    await this.repository.deactivate(id);
  }

  public async getLoad(id: string, actor?: ActorLike): Promise<TechnicianLoad> {
    const technician = await this.getById(id, actor);
    const vigentes = await this.repository.countActiveAssignments(id);
    return {
      vigentes,
      maximo: technician.maxConcurrentLoad,
      disponible: vigentes < technician.maxConcurrentLoad,
      cuposDisponibles: Math.max(0, technician.maxConcurrentLoad - vigentes),
    };
  }

  private async assertSpecialties(specialties: TechnicianSpecialtyDto[]): Promise<void> {
    if (specialties.length === 0) {
      throw new DomainError(
        'TECNICO_SIN_ESPECIALIDAD',
        422,
        'El técnico debe tener al menos una especialidad.'
      );
    }

    const uniqueIds = Array.from(new Set(specialties.map((item) => item.specialtyId)));
    const existing = await this.repository.findExistingSpecialtyIds(uniqueIds);
    const missing = uniqueIds.filter((id) => !existing.includes(id));
    if (missing.length > 0) {
      throw new DomainError(
        'VALIDACION_FALLIDA',
        422,
        'Una o más especialidades no existen.',
        missing.map((id) => ({ field: 'specialties', issue: `Especialidad ${id} inexistente` }))
      );
    }
  }
}
