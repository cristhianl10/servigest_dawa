import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { ApiErrorResponse } from '@servigest/shared';
import { DomainError } from '../../domain/errors/domain-error.ts';

export function translateKnownError(err: unknown): DomainError | null {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return new DomainError(
        'ENTIDAD_EN_USO',
        409,
        'Ya existe un registro con los mismos datos únicos.'
      );
    }
    if (err.code === 'P2003') {
      return new DomainError(
        'ENTIDAD_EN_USO',
        409,
        'La entidad está referenciada por otros registros.'
      );
    }
    if (err.code === 'P2025') {
      return new DomainError('RECURSO_NO_ENCONTRADO', 404, 'El recurso no existe.');
    }
  }

  if (
    err instanceof SyntaxError &&
    'body' in err &&
    (err as SyntaxError & { type?: string }).type === 'entity.parse.failed'
  ) {
    return new DomainError('VALIDACION_FALLIDA', 422, 'El cuerpo JSON no es válido.');
  }

  return null;
}

export function errorHandlerMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = (res.locals.requestId as string) || (req.header('X-Request-Id') ?? 'unknown');

  // 1. Error de Dominio conocido
  if (err instanceof DomainError) {
    const response: ApiErrorResponse = {
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        requestId,
      },
    };
    res.status(err.httpStatus).json(response);
    return;
  }

  // 2. Errores conocidos de Prisma o del parser de JSON
  const translated = translateKnownError(err);
  if (translated) {
    const response: ApiErrorResponse = {
      error: {
        code: translated.code,
        message: translated.message,
        requestId,
      },
    };
    res.status(translated.httpStatus).json(response);
    return;
  }

  // 3. Error de Validación Zod
  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({
      field: e.path.join('.'),
      issue: e.message,
    }));
    const response: ApiErrorResponse = {
      error: {
        code: 'VALIDACION_FALLIDA',
        message: 'La solicitud contiene campos inválidos.',
        details,
        requestId,
      },
    };
    res.status(422).json(response);
    return;
  }

  // 4. Error Inesperado / 500
  console.error(`[Error 500][RequestId: ${requestId}]`, err);
  const response: ApiErrorResponse = {
    error: {
      code: 'ERROR_INTERNO',
      message: 'Ocurrió un error interno en el servidor.',
      requestId,
    },
  };
  res.status(500).json(response);
}
