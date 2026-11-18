import { Router } from 'express';
import { prisma } from '../../infrastructure/prisma/client.ts';
import { authenticate, authorize } from '../../presentation/middlewares/auth.ts';
import { TechniciansController } from './technicians.controller.ts';
import { PrismaTechnicianRepository } from './technicians.repository.ts';
import { TechniciansService } from './technicians.service.ts';

export function createTechniciansRouter(techniciansService?: TechniciansService): Router {
  const router = Router();
  const service =
    techniciansService ?? new TechniciansService(new PrismaTechnicianRepository(prisma));
  const controller = new TechniciansController(service);

  router.use(authenticate);

  router.get('/', authorize('ADMIN', 'COORDINADOR', 'TECNICO'), controller.list);
  router.post('/', authorize('ADMIN'), controller.create);
  router.get('/:id', authorize('ADMIN', 'COORDINADOR', 'TECNICO'), controller.getById);
  router.patch('/:id', authorize('ADMIN'), controller.update);
  router.delete('/:id', authorize('ADMIN'), controller.deactivate);
  router.get('/:id/carga', authorize('ADMIN', 'COORDINADOR', 'TECNICO'), controller.load);
  router.put(
    '/:id/especialidades',
    authorize('ADMIN'),
    controller.replaceSpecialties
  );

  return router;
}

export const techniciansRouter = createTechniciansRouter();
