import { Router } from 'express';
import { AuthController } from './auth.controller.ts';
import { AuthService } from './auth.service.ts';
import { PrismaAuthRepository } from './auth.repository.ts';
import { prisma } from '../../infrastructure/prisma/client.ts';
import { authenticate } from '../../presentation/middlewares/auth.ts';
import { loginRateLimiter } from '../../presentation/middlewares/rate-limit.ts';

export function createAuthRouter(authService?: AuthService): Router {
  const router = Router();
  const service = authService ?? new AuthService(new PrismaAuthRepository(prisma));
  const controller = new AuthController(service);

  router.post('/login', loginRateLimiter, controller.login);
  router.post('/refresh', controller.refresh);
  router.post('/logout', controller.logout);
  router.post('/forgot-password', controller.forgotPassword);
  router.post('/reset-password', controller.resetPassword);
  router.get('/me', authenticate, controller.me);
  router.patch('/me', authenticate, controller.updateMe);
  router.patch('/me/password', authenticate, controller.changePassword);

  return router;
}

export const authRouter = createAuthRouter();
