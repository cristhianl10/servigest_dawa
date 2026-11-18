import { Router } from 'express';
import { AuthController } from './auth.controller.ts';
import { AuthService } from './auth.service.ts';
import { InMemoryAuthRepository } from './auth.repository.ts';
import { authenticate } from '../../presentation/middlewares/auth.ts';

export function createAuthRouter(authService?: AuthService): Router {
  const router = Router();
  const service = authService ?? new AuthService(new InMemoryAuthRepository());
  const controller = new AuthController(service);

  router.post('/login', controller.login);
  router.post('/refresh', controller.refresh);
  router.post('/logout', controller.logout);
  router.get('/me', authenticate, controller.me);

  return router;
}

export const authRouter = createAuthRouter();
