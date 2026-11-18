import { Router } from 'express';
import { prisma } from '../../infrastructure/prisma/client.ts';
import { authenticate, authorize } from '../../presentation/middlewares/auth.ts';
import { CatalogsController } from './catalogs.controller.ts';
import { PrismaCatalogRepository } from './catalogs.repository.ts';
import { CatalogsService } from './catalogs.service.ts';

function buildController(service?: CatalogsService): CatalogsController {
  return new CatalogsController(service ?? new CatalogsService(new PrismaCatalogRepository(prisma)));
}

export function createSpecialtiesRouter(service?: CatalogsService): Router {
  const router = Router();
  const controller = buildController(service);

  router.use(authenticate);
  router.get('/', controller.listSpecialties);
  router.post('/', authorize('ADMIN'), controller.createSpecialty);
  router.patch('/:id', authorize('ADMIN'), controller.updateSpecialty);
  router.delete('/:id', authorize('ADMIN'), controller.deactivateSpecialty);

  return router;
}

export function createServiceCategoriesRouter(service?: CatalogsService): Router {
  const router = Router();
  const controller = buildController(service);

  router.use(authenticate);
  router.get('/', controller.listCategories);
  router.post('/', authorize('ADMIN'), controller.createCategory);
  router.patch('/:id', authorize('ADMIN'), controller.updateCategory);
  router.delete('/:id', authorize('ADMIN'), controller.deactivateCategory);

  return router;
}

export function createStatusesRouter(service?: CatalogsService): Router {
  const router = Router();
  const controller = buildController(service);

  router.use(authenticate);
  router.get('/', controller.listStatuses);

  return router;
}

export function createParametersRouter(service?: CatalogsService): Router {
  const router = Router();
  const controller = buildController(service);

  router.use(authenticate);
  router.get('/', controller.listParameters);
  router.put('/:key', authorize('ADMIN'), controller.updateParameter);

  return router;
}

export function createHolidaysRouter(service?: CatalogsService): Router {
  const router = Router();
  const controller = buildController(service);

  router.use(authenticate);
  router.get('/', controller.listHolidays);
  router.post('/', authorize('ADMIN'), controller.createHoliday);
  router.delete('/:date', authorize('ADMIN'), controller.deleteHoliday);

  return router;
}

export const specialtiesRouter = createSpecialtiesRouter();
export const serviceCategoriesRouter = createServiceCategoriesRouter();
export const statusesRouter = createStatusesRouter();
export const parametersRouter = createParametersRouter();
export const holidaysRouter = createHolidaysRouter();
