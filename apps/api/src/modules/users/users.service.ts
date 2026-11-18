import type {
  CreateUserDto,
  RoleRecord,
  Role,
  UpdateUserDto,
  UserListFilter,
} from '@servigest/shared';
import { ROLES } from '@servigest/shared';
import { DomainError } from '../../domain/errors/domain-error.ts';
import { CryptoUtil } from '../auth/crypto.util.ts';
import type { AuthUserRecord } from '../auth/auth.service.ts';

export interface UserRecord extends AuthUserRecord {
  createdAt: Date;
}

export interface UserListResult {
  items: UserRecord[];
  total: number;
}

export interface CreateUserRecordInput {
  email: string;
  passwordHash: string;
  fullName: string;
  phone?: string | null;
  role: Role;
  clientId: string | null;
  mustChangePassword: boolean;
  status: 'ACTIVO' | 'INACTIVO';
}

export interface UpdateUserRecordInput {
  fullName?: string;
  phone?: string | null;
  role?: Role;
  clientId?: string | null;
  status?: 'ACTIVO' | 'INACTIVO';
  passwordHash?: string;
  mustChangePassword?: boolean;
}

export interface IUsersRepository {
  list(filter: UserListFilter): Promise<UserListResult>;
  findById(id: string): Promise<UserRecord | null>;
  findByEmail(email: string): Promise<UserRecord | null>;
  create(input: CreateUserRecordInput): Promise<UserRecord>;
  update(id: string, input: UpdateUserRecordInput): Promise<UserRecord>;
  countActiveAdmins(): Promise<number>;
}

const ROLE_NAMES: Record<Role, string> = {
  ADMIN: 'Administrador del Sistema',
  COORDINADOR: 'Coordinador de Servicios',
  TECNICO: 'Personal Técnico de Mantenimiento',
  CLIENTE: 'Cliente / Solicitante',
};

export class UsersService {
  constructor(private readonly repository: IUsersRepository) {}

  public async list(filter: UserListFilter): Promise<UserListResult> {
    return this.repository.list(filter);
  }

  public async getById(id: string): Promise<UserRecord> {
    const user = await this.repository.findById(id);
    if (!user) {
      throw new DomainError('RECURSO_NO_ENCONTRADO', 404, 'Usuario no encontrado.');
    }
    return user;
  }

  public async create(input: CreateUserDto): Promise<UserRecord> {
    const email = input.email.trim().toLowerCase();
    const existing = await this.repository.findByEmail(email);
    if (existing) {
      throw new DomainError('EMAIL_DUPLICADO', 409, 'El correo ya se encuentra registrado.');
    }

    this.assertRoleClientConsistency(input.role, input.clientId ?? null);

    const passwordHash = await CryptoUtil.hashPassword(input.temporaryPassword);
    return this.repository.create({
      email,
      passwordHash,
      fullName: input.fullName.trim(),
      phone: input.phone ?? null,
      role: input.role,
      clientId: input.clientId ?? null,
      mustChangePassword: true,
      status: 'ACTIVO',
    });
  }

  public async update(id: string, input: UpdateUserDto): Promise<UserRecord> {
    const existing = await this.getById(id);
    const nextRole = input.role ?? existing.role;
    const nextClientId =
      input.clientId !== undefined ? input.clientId : (existing.clientId ?? null);

    this.assertRoleClientConsistency(nextRole, nextClientId);

    const deactivating =
      (input.status === 'INACTIVO' && existing.status === 'ACTIVO') ||
      (nextRole !== 'ADMIN' && existing.role === 'ADMIN' && existing.status === 'ACTIVO');

    if (deactivating && existing.role === 'ADMIN' && existing.status === 'ACTIVO') {
      const activeAdmins = await this.repository.countActiveAdmins();
      if (activeAdmins <= 1) {
        throw new DomainError(
          'ENTIDAD_EN_USO',
          409,
          'No se puede desactivar o cambiar de rol al último administrador activo.'
        );
      }
    }

    return this.repository.update(id, {
      ...(input.fullName !== undefined ? { fullName: input.fullName.trim() } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.role !== undefined ? { role: input.role } : {}),
      ...(input.clientId !== undefined ? { clientId: input.clientId } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    });
  }

  public async deactivate(id: string): Promise<void> {
    const existing = await this.getById(id);
    if (existing.status === 'INACTIVO') return;

    if (existing.role === 'ADMIN') {
      const activeAdmins = await this.repository.countActiveAdmins();
      if (activeAdmins <= 1) {
        throw new DomainError(
          'ENTIDAD_EN_USO',
          409,
          'No se puede desactivar al último administrador activo.'
        );
      }
    }

    await this.repository.update(id, { status: 'INACTIVO' });
  }

  public listRoles(): RoleRecord[] {
    return ROLES.map((code, index) => ({
      id: index + 1,
      code,
      name: ROLE_NAMES[code],
    }));
  }

  private assertRoleClientConsistency(role: Role, clientId: string | null): void {
    if (role === 'CLIENTE' && !clientId) {
      throw new DomainError(
        'VALIDACION_FALLIDA',
        422,
        'Un usuario CLIENTE requiere clientId.',
        [{ field: 'clientId', issue: 'Obligatorio para el rol CLIENTE' }]
      );
    }
    if (role !== 'CLIENTE' && clientId) {
      throw new DomainError(
        'VALIDACION_FALLIDA',
        422,
        'Solo los usuarios CLIENTE pueden tener clientId.',
        [{ field: 'clientId', issue: 'No permitido para este rol' }]
      );
    }
  }
}
