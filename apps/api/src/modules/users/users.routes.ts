import { Router } from 'express';
import { prisma } from '../../infrastructure/prisma/client.ts';
import { authenticate, authorize } from '../../presentation/middlewares/auth.ts';
import { UsersController } from './users.controller.ts';
import { PrismaUsersRepository } from './users.repository.ts';
import { UsersService } from './users.service.ts';

export function createUsersRouter(usersService?: UsersService): Router {
  const router = Router();
  const service =
    usersService ?? new UsersService(new PrismaUsersRepository(prisma));
  const controller = new UsersController(service);

  router.use(authenticate);

  router.get('/', authorize('ADMIN'), controller.list);
  router.post('/', authorize('ADMIN'), controller.create);
  router.get('/:id', authorize('ADMIN'), controller.getById);
  router.patch('/:id', authorize('ADMIN'), controller.update);
  router.delete('/:id', authorize('ADMIN'), controller.deactivate);

  return router;
}

export function createRolesRouter(usersService?: UsersService): Router {
  const router = Router();
  const service =
    usersService ?? new UsersService(new PrismaUsersRepository(prisma));
  const controller = new UsersController(service);

  router.get('/', authenticate, controller.roles);

  return router;
}

export const usersRouter = createUsersRouter();
export const rolesRouter = createRolesRouter();
