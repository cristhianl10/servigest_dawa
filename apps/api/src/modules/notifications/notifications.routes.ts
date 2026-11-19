import { Router } from 'express';
import { prisma } from '../../infrastructure/prisma/client.ts';
import { authenticate } from '../../presentation/middlewares/auth.ts';
import { NotificationsController } from './notifications.controller.ts';
import { PrismaNotificationRepository } from './notifications.repository.ts';
import { NotificationsService } from './notifications.service.ts';

export function createNotificationsRouter(service?: NotificationsService): Router {
  const router = Router();
  const controller = new NotificationsController(
    service ?? new NotificationsService(new PrismaNotificationRepository(prisma))
  );

  router.use(authenticate);
  router.get('/stream', controller.stream);
  router.get('/', controller.list);
  router.patch('/:id/leida', controller.markRead);
  router.post('/leer-todas', controller.markAllRead);

  return router;
}

export const notificationsRouter = createNotificationsRouter();
