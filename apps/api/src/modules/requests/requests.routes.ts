import { Router } from 'express';
import { RequestsController } from './requests.controller.ts';
import { RequestsService } from './requests.service.ts';
import { PrismaRequestsRepository } from './requests.repository.ts';
import { prisma } from '../../infrastructure/prisma/client.ts';
import { authenticate, authorize } from '../../presentation/middlewares/auth.ts';
import { createAttachmentsRouter } from '../attachments/attachments.routes.ts';

export function createRequestsRouter(service?: RequestsService): Router {
  const router = Router();
  const requestsService = service ?? new RequestsService(new PrismaRequestsRepository(prisma));
  const controller = new RequestsController(requestsService);

  // Crear solicitud
  router.post(
    '/',
    authenticate,
    authorize('CLIENTE', 'COORDINADOR', 'ADMIN'),
    controller.create
  );

  // Listar solicitudes
  router.get('/', authenticate, controller.list);

  // Detalle de solicitud
  router.get('/:id', authenticate, controller.getById);

  // Edición controlada con bloqueo optimista
  router.patch('/:id', authenticate, controller.update);

  // Transición de estado
  router.patch('/:id/estado', authenticate, controller.transition);

  // Asignación de técnico
  router.post(
    '/:id/asignaciones',
    authenticate,
    authorize('ADMIN', 'COORDINADOR'),
    controller.assign
  );

  // Reapertura auditada de una solicitud cerrada
  router.post(
    '/:id/reabrir',
    authenticate,
    authorize('ADMIN', 'COORDINADOR'),
    controller.reopen
  );

  // Historial inmutable
  router.get('/:id/historial', authenticate, controller.getHistory);

  // Adjuntos de la solicitud
  router.use('/:id/adjuntos', createAttachmentsRouter(requestsService));

  return router;
}

export const requestsRouter = createRequestsRouter();
