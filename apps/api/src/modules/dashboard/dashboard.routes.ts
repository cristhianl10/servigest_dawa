import { Router } from 'express';
import { prisma } from '../../infrastructure/prisma/client.ts';
import { authenticate, authorize } from '../../presentation/middlewares/auth.ts';
import { DashboardController } from './dashboard.controller.ts';
import { PrismaDashboardRepository } from './dashboard.repository.ts';
import { DashboardService } from './dashboard.service.ts';

export function createDashboardRouter(service?: DashboardService): Router {
  const router = Router();
  const controller = new DashboardController(
    service ?? new DashboardService(new PrismaDashboardRepository(prisma))
  );

  router.use(authenticate);
  router.get('/indicadores', authorize('ADMIN', 'COORDINADOR'), controller.overview);
  router.get('/carga-tecnicos', authorize('ADMIN', 'COORDINADOR'), controller.technicianLoad);
  router.get('/evolucion', authorize('ADMIN', 'COORDINADOR'), controller.evolution);
  router.get('/mi-resumen', authorize('TECNICO', 'CLIENTE'), controller.mySummary);

  return router;
}

export const dashboardRouter = createDashboardRouter();
