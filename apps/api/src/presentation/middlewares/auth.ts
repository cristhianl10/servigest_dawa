import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@servigest/shared';
import { DomainError } from '../../domain/errors/domain-error';

export interface JwtPayloadCustom {
  sub: string;
  role: Role;
  clientId: string | null;
  technicianId?: string | null;
  jti?: string;
  iss?: string;
  aud?: string;
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return next(new DomainError('TOKEN_INVALIDO', 401, 'Cabecera Authorization no proporcionada.'));
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(new DomainError('TOKEN_INVALIDO', 401, 'Esquema de autenticación debe ser Bearer.'));
  }

  const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_servigest_2026_dawa_development_only';
  const issuer = process.env.JWT_ISSUER || 'servigest-api';
  const audience = process.env.JWT_AUDIENCE || 'servigest-web';

  try {
    const payload = jwt.verify(token, secret, {
      issuer,
      audience,
    }) as JwtPayloadCustom;

    res.locals.user = {
      id: payload.sub,
      role: payload.role,
      clientId: payload.clientId,
      technicianId: payload.technicianId ?? null,
    };

    next();
  } catch (_err) {
    next(new DomainError('TOKEN_INVALIDO', 401, 'El token es inválido o ha expirado.'));
  }
}

export const authorize = (...roles: Role[]) => {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const user = res.locals.user;
    if (!user || !roles.includes(user.role)) {
      return next(new DomainError('SIN_PERMISO', 403, 'No tiene permisos para acceder a este recurso.'));
    }
    next();
  };
};
