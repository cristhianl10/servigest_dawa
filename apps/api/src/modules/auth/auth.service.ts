import type { Role, UpdateProfileDto } from '@servigest/shared';
import { DomainError } from '../../domain/errors/domain-error.ts';
import { CryptoUtil } from './crypto.util.ts';

export interface AuthUserRecord {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  phone?: string | null;
  role: Role;
  clientId: string | null;
  status: 'ACTIVO' | 'INACTIVO';
  mustChangePassword: boolean;
  failedAttempts: number;
  lockedUntil?: Date | null;
  lastLoginAt?: Date | null;
  technicianId?: string | null;
}

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt?: Date | null;
}

export interface PasswordResetTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date | null;
}

export interface IAuthRepository {
  findUserByEmail(email: string): Promise<AuthUserRecord | null>;
  findUserById(id: string): Promise<AuthUserRecord | null>;
  incrementFailedAttempts(userId: string, attempts: number, lockedUntil: Date | null): Promise<void>;
  recordLoginSuccess(userId: string): Promise<void>;
  createRefreshToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  findRefreshToken(tokenHash: string): Promise<RefreshTokenRecord | null>;
  revokeRefreshToken(tokenHash: string): Promise<void>;
  revokeAllUserRefreshTokens(userId: string): Promise<void>;
  updateProfile(userId: string, input: UpdateProfileDto): Promise<AuthUserRecord>;
  updatePassword(userId: string, passwordHash: string): Promise<void>;
  createPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  findPasswordResetToken(tokenHash: string): Promise<PasswordResetTokenRecord | null>;
  markPasswordResetTokenUsed(id: string): Promise<void>;
}

export interface AuthServiceOptions {
  onPasswordResetRequested?: (email: string, rawToken: string) => Promise<void> | void;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: Role;
    clientId: string | null;
    mustChangePassword: boolean;
  };
}

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class AuthService {
  private readonly repository: IAuthRepository;
  private readonly onPasswordResetRequested?: AuthServiceOptions['onPasswordResetRequested'];

  constructor(repository: IAuthRepository, options: AuthServiceOptions = {}) {
    this.repository = repository;
    this.onPasswordResetRequested = options.onPasswordResetRequested;
  }

  public async login(email: string, password: string): Promise<LoginResult> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.repository.findUserByEmail(normalizedEmail);

    // Mensaje genérico para no filtrar existencia de correo (NFR-SEG-01 / RF-AUTH-01)
    if (!user) {
      throw new DomainError('CREDENCIALES_INVALIDAS', 401, 'Credenciales de acceso no válidas.');
    }

    if (user.status !== 'ACTIVO') {
      throw new DomainError('USUARIO_INACTIVO', 403, 'El usuario se encuentra inactivo en la plataforma.');
    }

    const now = new Date();
    if (user.lockedUntil && user.lockedUntil > now) {
      throw new DomainError(
        'DEMASIADOS_INTENTOS',
        429,
        'La cuenta se encuentra bloqueada temporalmente por exceso de intentos fallidos. Intente más tarde.'
      );
    }

    const isValidPassword = await CryptoUtil.verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      const attempts = user.failedAttempts + 1;
      const lockedUntil = attempts >= 5 ? new Date(now.getTime() + 15 * 60 * 1000) : null;
      await this.repository.incrementFailedAttempts(user.id, attempts, lockedUntil);

      throw new DomainError('CREDENCIALES_INVALIDAS', 401, 'Credenciales de acceso no válidas.');
    }

    // Éxito: resetear intentos y actualizar último login
    await this.repository.recordLoginSuccess(user.id);

    // Generar tokens
    const accessToken = CryptoUtil.signJwt({
      sub: user.id,
      role: user.role,
      clientId: user.clientId,
      technicianId: user.technicianId ?? null,
    });

    const { raw: rawRefreshToken, hash: refreshTokenHash } = CryptoUtil.generateRefreshToken();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 días (NFR-SEG-02)

    await this.repository.createRefreshToken(user.id, refreshTokenHash, expiresAt);

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: 900,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        clientId: user.clientId,
        mustChangePassword: user.mustChangePassword,
      },
    };
  }

  public async refresh(rawRefreshToken: string): Promise<RefreshResult> {
    if (!rawRefreshToken || rawRefreshToken.trim().length === 0) {
      throw new DomainError('REFRESH_INVALIDO', 401, 'Token de actualización no proporcionado.');
    }

    const hash = CryptoUtil.sha256(rawRefreshToken);
    const tokenRecord = await this.repository.findRefreshToken(hash);

    if (!tokenRecord) {
      throw new DomainError('REFRESH_INVALIDO', 401, 'Token de actualización no reconocido.');
    }

    // Detección de reuso de token revocado (NFR-SEG-02 / Ataque de repetición)
    if (tokenRecord.revokedAt) {
      await this.repository.revokeAllUserRefreshTokens(tokenRecord.userId);
      throw new DomainError(
        'REFRESH_INVALIDO',
        401,
        'Se detectó un intento de reutilización de sesión. Todas las sesiones activas han sido invalidadas por seguridad.'
      );
    }

    const now = new Date();
    if (tokenRecord.expiresAt < now) {
      throw new DomainError('REFRESH_INVALIDO', 401, 'El token de actualización ha expirado.');
    }

    const user = await this.repository.findUserById(tokenRecord.userId);
    if (!user || user.status !== 'ACTIVO') {
      throw new DomainError('USUARIO_INACTIVO', 403, 'El usuario no está activo.');
    }

    // Rotación: revocar el actual y crear uno nuevo en la misma operación
    await this.repository.revokeRefreshToken(hash);

    const newTokens = CryptoUtil.generateRefreshToken();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    await this.repository.createRefreshToken(user.id, newTokens.hash, expiresAt);

    const accessToken = CryptoUtil.signJwt({
      sub: user.id,
      role: user.role,
      clientId: user.clientId,
      technicianId: user.technicianId ?? null,
    });

    return {
      accessToken,
      refreshToken: newTokens.raw,
      expiresIn: 900,
    };
  }

  public async logout(rawRefreshToken?: string): Promise<void> {
    if (rawRefreshToken && rawRefreshToken.trim().length > 0) {
      const hash = CryptoUtil.sha256(rawRefreshToken);
      await this.repository.revokeRefreshToken(hash);
    }
  }

  public async getMe(userId: string): Promise<AuthUserRecord> {
    const user = await this.repository.findUserById(userId);
    if (!user) {
      throw new DomainError('RECURSO_NO_ENCONTRADO', 404, 'Usuario no encontrado.');
    }
    return user;
  }

  public async updateProfile(userId: string, input: UpdateProfileDto): Promise<AuthUserRecord> {
    const user = await this.repository.findUserById(userId);
    if (!user) {
      throw new DomainError('RECURSO_NO_ENCONTRADO', 404, 'Usuario no encontrado.');
    }
    if (user.status !== 'ACTIVO') {
      throw new DomainError('USUARIO_INACTIVO', 403, 'El usuario no está activo.');
    }
    return this.repository.updateProfile(userId, input);
  }

  public async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await this.repository.findUserById(userId);
    if (!user) {
      throw new DomainError('RECURSO_NO_ENCONTRADO', 404, 'Usuario no encontrado.');
    }
    if (user.status !== 'ACTIVO') {
      throw new DomainError('USUARIO_INACTIVO', 403, 'El usuario no está activo.');
    }

    const isValid = await CryptoUtil.verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new DomainError('CREDENCIALES_INVALIDAS', 401, 'La contraseña actual no es válida.');
    }

    const passwordHash = await CryptoUtil.hashPassword(newPassword);
    await this.repository.updatePassword(userId, passwordHash);
    await this.repository.revokeAllUserRefreshTokens(userId);
  }

  public async forgotPassword(email: string): Promise<void> {
    const user = await this.repository.findUserByEmail(email.trim().toLowerCase());
    if (!user || user.status !== 'ACTIVO') {
      return;
    }

    const { raw, hash } = CryptoUtil.generateRefreshToken();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await this.repository.createPasswordResetToken(user.id, hash, expiresAt);

    if (this.onPasswordResetRequested) {
      try {
        await this.onPasswordResetRequested(user.email, raw);
      } catch {
        // El envío de correo no debe revelar si el correo existe ni romper la respuesta 202.
      }
    }
  }

  public async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const hash = CryptoUtil.sha256(rawToken);
    const record = await this.repository.findPasswordResetToken(hash);
    if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now()) {
      throw new DomainError('TOKEN_INVALIDO', 400, 'El token de recuperación no es válido o expiró.');
    }

    const user = await this.repository.findUserById(record.userId);
    if (!user || user.status !== 'ACTIVO') {
      throw new DomainError('USUARIO_INACTIVO', 403, 'El usuario no está activo.');
    }

    const passwordHash = await CryptoUtil.hashPassword(newPassword);
    await this.repository.updatePassword(user.id, passwordHash);
    await this.repository.markPasswordResetTokenUsed(record.id);
    await this.repository.revokeAllUserRefreshTokens(user.id);
  }
}
