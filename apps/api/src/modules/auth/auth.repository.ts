import type { PrismaClient } from '@prisma/client';
import type { Role, UpdateProfileDto } from '@servigest/shared';
import type {
  AuthUserRecord,
  IAuthRepository,
  RefreshTokenRecord,
  PasswordResetTokenRecord,
} from './auth.service.ts';

type PrismaClientLike = Pick<
  PrismaClient,
  'user' | 'refreshToken' | 'passwordResetToken'
>;

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
  role: { code: string };
  technician?: { id: string } | null;
}): AuthUserRecord {
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
  };
}

export class PrismaAuthRepository implements IAuthRepository {
  private readonly client: PrismaClientLike;

  constructor(client: PrismaClientLike) {
    this.client = client;
  }

  public async findUserByEmail(email: string): Promise<AuthUserRecord | null> {
    const user = await this.client.user.findUnique({
      where: { email },
      include: { role: { select: { code: true } }, technician: { select: { id: true } } },
    });
    return user ? mapUser(user) : null;
  }

  public async findUserById(id: string): Promise<AuthUserRecord | null> {
    const user = await this.client.user.findUnique({
      where: { id },
      include: { role: { select: { code: true } }, technician: { select: { id: true } } },
    });
    return user ? mapUser(user) : null;
  }

  public async incrementFailedAttempts(
    userId: string,
    attempts: number,
    lockedUntil: Date | null
  ): Promise<void> {
    await this.client.user.update({
      where: { id: userId },
      data: { failedAttempts: attempts, lockedUntil },
    });
  }

  public async recordLoginSuccess(userId: string): Promise<void> {
    await this.client.user.update({
      where: { id: userId },
      data: { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });
  }

  public async createRefreshToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date
  ): Promise<void> {
    await this.client.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });
  }

  public async findRefreshToken(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const token = await this.client.refreshToken.findUnique({ where: { tokenHash } });
    if (!token) return null;
    return {
      id: token.id,
      userId: token.userId,
      tokenHash: token.tokenHash,
      expiresAt: token.expiresAt,
      revokedAt: token.revokedAt,
    };
  }

  public async revokeRefreshToken(tokenHash: string): Promise<void> {
    await this.client.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  public async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    await this.client.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  public async updateProfile(userId: string, input: UpdateProfileDto): Promise<AuthUserRecord> {
    const user = await this.client.user.update({
      where: { id: userId },
      data: {
        ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
      },
      include: { role: { select: { code: true } }, technician: { select: { id: true } } },
    });
    return mapUser(user);
  }

  public async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.client.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: false },
    });
  }

  public async createPasswordResetToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date
  ): Promise<void> {
    await this.client.passwordResetToken.create({
      data: { userId, tokenHash, expiresAt },
    });
  }

  public async findPasswordResetToken(
    tokenHash: string
  ): Promise<PasswordResetTokenRecord | null> {
    const token = await this.client.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!token) return null;
    return {
      id: token.id,
      userId: token.userId,
      tokenHash: token.tokenHash,
      expiresAt: token.expiresAt,
      usedAt: token.usedAt,
    };
  }

  public async markPasswordResetTokenUsed(id: string): Promise<void> {
    await this.client.passwordResetToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }
}

export { ROLE_IDS };

export class InMemoryAuthRepository implements IAuthRepository {
  private users: Map<string, AuthUserRecord> = new Map();
  private refreshTokens: Map<string, RefreshTokenRecord> = new Map(); // tokenHash -> Record
  private resetTokens: Map<string, PasswordResetTokenRecord> = new Map(); // tokenHash -> Record

  constructor(initialUsers: AuthUserRecord[] = []) {
    for (const u of initialUsers) {
      this.users.set(u.id, { ...u });
    }
  }

  public async findUserByEmail(email: string): Promise<AuthUserRecord | null> {
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === email.toLowerCase()) {
        return { ...u };
      }
    }
    return null;
  }

  public async findUserById(id: string): Promise<AuthUserRecord | null> {
    const user = this.users.get(id);
    return user ? { ...user } : null;
  }

  public async incrementFailedAttempts(
    userId: string,
    attempts: number,
    lockedUntil: Date | null
  ): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.failedAttempts = attempts;
      user.lockedUntil = lockedUntil;
    }
  }

  public async recordLoginSuccess(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.failedAttempts = 0;
      user.lockedUntil = null;
      user.lastLoginAt = new Date();
    }
  }

  public async createRefreshToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date
  ): Promise<void> {
    this.refreshTokens.set(tokenHash, {
      id: `rt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId,
      tokenHash,
      expiresAt,
      revokedAt: null,
    });
  }

  public async findRefreshToken(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const token = this.refreshTokens.get(tokenHash);
    return token ? { ...token } : null;
  }

  public async revokeRefreshToken(tokenHash: string): Promise<void> {
    const token = this.refreshTokens.get(tokenHash);
    if (token && !token.revokedAt) {
      token.revokedAt = new Date();
    }
  }

  public async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    const now = new Date();
    for (const token of this.refreshTokens.values()) {
      if (token.userId === userId && !token.revokedAt) {
        token.revokedAt = now;
      }
    }
  }

  public async updateProfile(userId: string, input: UpdateProfileDto): Promise<AuthUserRecord> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('USUARIO_NO_ENCONTRADO');
    }
    if (input.fullName !== undefined) user.fullName = input.fullName;
    if (input.phone !== undefined) user.phone = input.phone;
    return { ...user };
  }

  public async updatePassword(userId: string, passwordHash: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('USUARIO_NO_ENCONTRADO');
    }
    user.passwordHash = passwordHash;
    user.mustChangePassword = false;
  }

  public async createPasswordResetToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date
  ): Promise<void> {
    this.resetTokens.set(tokenHash, {
      id: `prt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId,
      tokenHash,
      expiresAt,
      usedAt: null,
    });
  }

  public async findPasswordResetToken(
    tokenHash: string
  ): Promise<PasswordResetTokenRecord | null> {
    const token = this.resetTokens.get(tokenHash);
    return token ? { ...token } : null;
  }

  public async markPasswordResetTokenUsed(id: string): Promise<void> {
    for (const token of this.resetTokens.values()) {
      if (token.id === id) {
        token.usedAt = new Date();
      }
    }
  }
}
