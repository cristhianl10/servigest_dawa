import { Router } from 'express';
import { prisma } from '../../infrastructure/prisma/client.ts';
import { authenticate, authorize } from '../../presentation/middlewares/auth.ts';
import { ClientsController } from './clients.controller.ts';
import { PrismaClientRepository } from './clients.repository.ts';
import { ClientsService } from './clients.service.ts';

function buildController(service?: ClientsService): ClientsController {
  return new ClientsController(service ?? new ClientsService(new PrismaClientRepository(prisma)));
}

export function createClientsRouter(service?: ClientsService): Router {
  const router = Router();
  const controller = buildController(service);

  router.use(authenticate);

  router.get('/', authorize('ADMIN', 'COORDINADOR'), controller.list);
  router.post('/', authorize('ADMIN'), controller.create);
  router.get('/:id', authorize('ADMIN', 'COORDINADOR'), controller.getById);
  router.patch('/:id', authorize('ADMIN'), controller.update);
  router.delete('/:id', authorize('ADMIN'), controller.deactivate);
  router.get('/:id/sedes', authorize('ADMIN', 'COORDINADOR'), controller.listSites);
  router.post('/:id/sedes', authorize('ADMIN'), controller.createSite);

  return router;
}

export function createSitesRouter(service?: ClientsService): Router {
  const router = Router();
  const controller = buildController(service);

  router.use(authenticate);

  router.patch('/:id', authorize('ADMIN'), controller.updateSite);
  router.delete('/:id', authorize('ADMIN'), controller.deactivateSite);
  router.get('/:id/equipos', authorize('ADMIN', 'COORDINADOR'), controller.listAssets);
  router.post('/:id/equipos', authorize('ADMIN'), controller.createAsset);

  return router;
}

export function createAssetsRouter(service?: ClientsService): Router {
  const router = Router();
  const controller = buildController(service);

  router.use(authenticate);
  router.patch('/:id', authorize('ADMIN'), controller.updateAsset);

  return router;
}

export const clientsRouter = createClientsRouter();
export const sitesRouter = createSitesRouter();
export const assetsRouter = createAssetsRouter();
