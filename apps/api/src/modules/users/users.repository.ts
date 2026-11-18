import { Prisma, type PrismaClient } from '@prisma/client';
import type { Role, UserListFilter } from '@servigest/shared';
import type {
  CreateUserRecordInput,
  IUsersRepository,
  UpdateUserRecordInput,
  UserListResult,
  UserRecord,
} from './users.service.ts';

type PrismaClientLike = Pick<PrismaClient, 'user'>;

const ROLE_IDS: Record<Role, number> = {
  ADMIN: 1,
  COORDINADOR: 2,
  TECNICO: 3,
  CLIENTE: 4,
};

function mapUser(user: {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  phone: string | null;
  clientId: string | null;
  status: string;
  mustChangePassword: boolean;
  failedAttempts: number;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  role: { code: string };
  technician?: { id: string } | null;
}): UserRecord {
  return {
    id: user.id,
    email: user.email,
    passwordHash: user.passwordHash,
    fullName: user.fullName,
    phone: user.phone,
    role: user.role.code as Role,
    clientId: user.clientId,
    status: user.status === 'ACTIVO' ? 'ACTIVO' : 'INACTIVO',
    mustChangePassword: user.mustChangePassword,
    failedAttempts: user.failedAttempts,
    lockedUntil: user.lockedUntil,
    lastLoginAt: user.lastLoginAt,
    technicianId: user.technician?.id ?? null,
    createdAt: user.createdAt,
  };
}

const USER_INCLUDE = {
  role: { select: { code: true } },
  technician: { select: { id: true } },
} as const;

export class PrismaUsersRepository implements IUsersRepository {
  constructor(private readonly client: PrismaClientLike) {}

  public async list(filter: UserListFilter): Promise<UserListResult> {
    const where: Prisma.UserWhereInput = {
      ...(filter.role ? { role: { code: filter.role } } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.search
        ? {
            OR: [
              { email: { contains: filter.search, mode: 'insensitive' } },
              { fullName: { contains: filter.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.client.user.findMany({
        where,
        include: USER_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.client.user.count({ where }),
    ]);

    return { items: rows.map(mapUser), total };
  }

  public async findById(id: string): Promise<UserRecord | null> {
    const user = await this.client.user.findUnique({ where: { id }, include: USER_INCLUDE });
    return user ? mapUser(user) : null;
  }

  public async findByEmail(email: string): Promise<UserRecord | null> {
    const user = await this.client.user.findUnique({ where: { email }, include: USER_INCLUDE });
    return user ? mapUser(user) : null;
  }

  public async create(input: CreateUserRecordInput): Promise<UserRecord> {
    const user = await this.client.user.create({
      data: {
        email: input.email,
        passwordHash: input.passwordHash,
        fullName: input.fullName,
        phone: input.phone ?? null,
        roleId: ROLE_IDS[input.role],
        clientId: input.clientId,
        mustChangePassword: input.mustChangePassword,
        status: input.status,
      },
      include: USER_INCLUDE,
    });
    return mapUser(user);
  }

  public async update(id: string, input: UpdateUserRecordInput): Promise<UserRecord> {
    const user = await this.client.user.update({
      where: { id },
      data: {
        ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.role !== undefined ? { roleId: ROLE_IDS[input.role] } : {}),
        ...(input.clientId !== undefined ? { clientId: input.clientId } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.passwordHash !== undefined ? { passwordHash: input.passwordHash } : {}),
        ...(input.mustChangePassword !== undefined
          ? { mustChangePassword: input.mustChangePassword }
          : {}),
      },
      include: USER_INCLUDE,
    });
    return mapUser(user);
  }

  public async countActiveAdmins(): Promise<number> {
    return this.client.user.count({
      where: { status: 'ACTIVO', role: { code: 'ADMIN' } },
    });
  }
}

export class InMemoryUsersRepository implements IUsersRepository {
  private users = new Map<string, UserRecord>();

  constructor(initialUsers: UserRecord[] = []) {
    for (const user of initialUsers) {
      this.users.set(user.id, { ...user });
    }
  }

  public async list(filter: UserListFilter): Promise<UserListResult> {
    const search = filter.search?.toLowerCase();
    const rows = Array.from(this.users.values())
      .filter((user) => !filter.role || user.role === filter.role)
      .filter((user) => !filter.status || user.status === filter.status)
      .filter(
        (user) =>
          !search ||
          user.email.toLowerCase().includes(search) ||
          user.fullName.toLowerCase().includes(search)
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const start = (filter.page - 1) * filter.pageSize;
    return {
      items: rows.slice(start, start + filter.pageSize).map((user) => ({ ...user })),
      total: rows.length,
    };
  }

  public async findById(id: string): Promise<UserRecord | null> {
    const user = this.users.get(id);
    return user ? { ...user } : null;
  }

  public async findByEmail(email: string): Promise<UserRecord | null> {
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === email.toLowerCase()) return { ...user };
    }
    return null;
  }

  public async create(input: CreateUserRecordInput): Promise<UserRecord> {
    const user: UserRecord = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      email: input.email,
      passwordHash: input.passwordHash,
      fullName: input.fullName,
      phone: input.phone ?? null,
      role: input.role,
      clientId: input.clientId,
      status: input.status,
      mustChangePassword: input.mustChangePassword,
      failedAttempts: 0,
      lockedUntil: null,
      lastLoginAt: null,
      technicianId: null,
      createdAt: new Date(),
    };
    this.users.set(user.id, user);
    return { ...user };
  }

  public async update(id: string, input: UpdateUserRecordInput): Promise<UserRecord> {
    const user = this.users.get(id);
    if (!user) throw new Error('USUARIO_NO_ENCONTRADO');

    if (input.fullName !== undefined) user.fullName = input.fullName;
    if (input.phone !== undefined) user.phone = input.phone;
    if (input.role !== undefined) user.role = input.role;
    if (input.clientId !== undefined) user.clientId = input.clientId;
    if (input.status !== undefined) user.status = input.status;
    if (input.passwordHash !== undefined) user.passwordHash = input.passwordHash;
    if (input.mustChangePassword !== undefined) {
      user.mustChangePassword = input.mustChangePassword;
    }
    return { ...user };
  }

  public async countActiveAdmins(): Promise<number> {
    return Array.from(this.users.values()).filter(
      (user) => user.status === 'ACTIVO' && user.role === 'ADMIN'
    ).length;
  }
}
