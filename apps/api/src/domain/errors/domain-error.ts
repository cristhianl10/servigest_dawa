import type { ErrorCode, ApiErrorDetail } from '@servigest/shared';

export class DomainError extends Error {
  public readonly code: ErrorCode | string;
  public readonly httpStatus: number;
  public readonly details?: ApiErrorDetail[];

  constructor(
    code: ErrorCode | string,
    httpStatus: number = 400,
    message?: string,
    details?: ApiErrorDetail[]
  ) {
    super(message ?? code);
    this.name = 'DomainError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details;
    Object.setPrototypeOf(this, DomainError.prototype);
  }
}
