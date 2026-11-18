import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

export interface JwtSignOptions {
  expiresInSeconds?: number;
  issuer?: string;
  audience?: string;
}

export interface JwtVerifyOptions {
  issuer?: string;
  audience?: string;
}

export class CryptoUtil {
  private static readonly JWT_SECRET =
    process.env.JWT_SECRET || 'super_secret_jwt_key_servigest_2026_dawa_development_only';
  private static readonly JWT_ISSUER = process.env.JWT_ISSUER || 'servigest-api';
  private static readonly JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'servigest-web';

  public static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  public static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  public static sha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  public static generateRefreshToken(): { raw: string; hash: string } {
    const raw = crypto.randomBytes(48).toString('base64url');
    const hash = this.sha256(raw);
    return { raw, hash };
  }

  public static signJwt(payload: Record<string, unknown>, options: JwtSignOptions = {}): string {
    const expiresIn = options.expiresInSeconds ?? 900; // 15 minutos por defecto
    const issuer = options.issuer ?? this.JWT_ISSUER;
    const audience = options.audience ?? this.JWT_AUDIENCE;

    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const fullPayload = {
      ...payload,
      iat: now,
      exp: now + expiresIn,
      iss: issuer,
      aud: audience,
    };
    const payloadB64 = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');

    const signature = crypto
      .createHmac('sha256', this.JWT_SECRET)
      .update(`${header}.${payloadB64}`)
      .digest('base64url');

    return `${header}.${payloadB64}.${signature}`;
  }

  public static verifyJwt<T = Record<string, unknown>>(
    token: string,
    options: JwtVerifyOptions = {}
  ): T {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('TOKEN_MALFORMADO');
    }

    const [headerB64, payloadB64, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', this.JWT_SECRET)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');

    if (
      signature.length !== expectedSig.length ||
      !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))
    ) {
      throw new Error('FIRMA_INVALIDA');
    }

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8')) as T & {
      exp?: number;
      iss?: string;
      aud?: string;
    };

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      throw new Error('TOKEN_EXPIRADO');
    }

    const issuer = options.issuer ?? this.JWT_ISSUER;
    if (issuer && payload.iss !== issuer) {
      throw new Error('EMISOR_INVALIDO');
    }

    const audience = options.audience ?? this.JWT_AUDIENCE;
    if (audience && payload.aud !== audience) {
      throw new Error('AUDIENCIA_INVALIDA');
    }

    return payload as T;
  }
}
