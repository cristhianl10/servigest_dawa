import type { IAuthRepository, AuthUserRecord, RefreshTokenRecord } from './auth.service.ts';

export class InMemoryAuthRepository implements IAuthRepository {
  private users: Map<string, AuthUserRecord> = new Map();
  private refreshTokens: Map<string, RefreshTokenRecord> = new Map(); // tokenHash -> Record

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
      id: `rt-${Date.now()}-${Math.random()}`,
      userId,
      tokenHash,
      expiresAt,
      revokedAt: null,
    });
  }

  public async findRefreshToken(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const record = this.refreshTokens.get(tokenHash);
    return record ? { ...record } : null;
  }

  public async revokeRefreshToken(tokenHash: string): Promise<void> {
    const record = this.refreshTokens.get(tokenHash);
    if (record) {
      record.revokedAt = new Date();
    }
  }

  public async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    const now = new Date();
    for (const record of this.refreshTokens.values()) {
      if (record.userId === userId && !record.revokedAt) {
        record.revokedAt = now;
      }
    }
  }
}
