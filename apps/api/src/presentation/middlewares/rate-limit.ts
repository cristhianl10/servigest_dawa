import { Request, Response, NextFunction } from 'express';
import { DomainError } from '../../domain/errors/domain-error.ts';

interface Bucket {
  count: number;
  resetAt: number;
}

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const buckets = new Map<string, Bucket>();

function keyFor(req: Request): string {
  const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase() : 'anonimo';
  return `${req.ip ?? 'desconocida'}:${email}`;
}

function cleanup(now: number): void {
  if (buckets.size < 1000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function loginRateLimiter(req: Request, _res: Response, next: NextFunction): void {
  const now = Date.now();
  cleanup(now);

  const key = keyFor(req);
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    next();
    return;
  }

  if (current.count >= MAX_ATTEMPTS) {
    const retryAfterSeconds = Math.ceil((current.resetAt - now) / 1000);
    next(
      new DomainError(
        'DEMASIADOS_INTENTOS',
        429,
        'Se superó el límite de intentos de inicio de sesión. Intente más tarde.',
        [{ field: 'retryAfterSeconds', issue: String(retryAfterSeconds) }]
      )
    );
    return;
  }

  current.count += 1;
  next();
}

export function resetLoginRateLimit(req: Request): void {
  buckets.delete(keyFor(req));
}
