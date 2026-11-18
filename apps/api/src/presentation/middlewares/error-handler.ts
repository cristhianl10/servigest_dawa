import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ApiErrorResponse } from '@servigest/shared';
import { DomainError } from '../../domain/errors/domain-error';

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

  // 2. Error de Validación Zod
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

  // 3. Error Inesperado / 500
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
