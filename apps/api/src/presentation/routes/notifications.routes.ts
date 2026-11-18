import { Router, Request, Response } from 'express';
import { authenticate } from '../middlewares/auth';
import { sseHub } from '../../infrastructure/sse/sse-hub';

export const notificationsRouter = Router();

// Stream SSE en tiempo real
notificationsRouter.get('/stream', authenticate, (req: Request, res: Response) => {
  const user = res.locals.user;
  const lastEventId = req.header('Last-Event-ID') || (req.query.lastEventId as string);

  sseHub.registerClient(user.id, res, lastEventId);
});
