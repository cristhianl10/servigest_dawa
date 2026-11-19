import { Router, Request, Response } from 'express';
import { prisma } from '../../infrastructure/prisma/client.ts';

export type DatabaseStatus = 'UP' | 'DOWN';

export interface DatabaseProbe {
  $queryRaw(query: TemplateStringsArray, ...values: unknown[]): Promise<unknown>;
}

export interface HealthPayload {
  status: 'UP' | 'DOWN';
  db: DatabaseStatus;
  uptime: number;
  version: string;
  service: string;
  timestamp: string;
}

export async function checkDatabase(
  probe: DatabaseProbe,
  timeoutMs = 2000
): Promise<DatabaseStatus> {
  let timer: NodeJS.Timeout | undefined;

  const timeout = new Promise<DatabaseStatus>((resolve) => {
    timer = setTimeout(() => resolve('DOWN'), timeoutMs);
    timer.unref?.();
  });

  const query = probe
    .$queryRaw`SELECT 1`
    .then(() => 'UP' as DatabaseStatus)
    .catch(() => 'DOWN' as DatabaseStatus);

  try {
    return await Promise.race([query, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function buildHealthPayload(
  db: DatabaseStatus,
  uptime: number = process.uptime(),
  timestamp: Date = new Date()
): HealthPayload {
  return {
    status: db === 'UP' ? 'UP' : 'DOWN',
    db,
    uptime,
    version: '1.0.0',
    service: 'servigest-api',
    timestamp: timestamp.toISOString(),
  };
}

export function createHealthRouter(
  check: () => Promise<DatabaseStatus> = () => checkDatabase(prisma)
): Router {
  const router = Router();

  router.get('/', async (_req: Request, res: Response) => {
    const db = await check().catch(() => 'DOWN' as DatabaseStatus);
    const payload = buildHealthPayload(db);
    res.status(db === 'UP' ? 200 : 503).json(payload);
  });

  return router;
}


export const healthRouter = createHealthRouter();
