import express, { Express } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { requestIdMiddleware } from './presentation/middlewares/request-id';
import { httpLogger } from './infrastructure/logging/http-logger.ts';
import { errorHandlerMiddleware } from './presentation/middlewares/error-handler';
import { healthRouter } from './presentation/routes/health.routes.ts';
import { openapiRouter } from './presentation/routes/docs.routes.ts';
import { notificationsRouter } from './modules/notifications/notifications.routes.ts';
import { dashboardRouter } from './modules/dashboard/dashboard.routes.ts';
import { authRouter } from './modules/auth/auth.routes.ts';
import { requestsRouter } from './modules/requests/requests.routes.ts';
import { rolesRouter, usersRouter } from './modules/users/users.routes.ts';
import { assetsRouter, clientsRouter, sitesRouter } from './modules/clients/clients.routes.ts';
import { techniciansRouter } from './modules/technicians/technicians.routes.ts';
import {
  holidaysRouter,
  parametersRouter,
  serviceCategoriesRouter,
  specialtiesRouter,
  statusesRouter,
} from './modules/catalogs/catalogs.routes.ts';

export function createApp(): Express {
  const app = express();

  // Configuración de CORS
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
  app.use(
    cors({
      origin: corsOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'Last-Event-ID'],
    })
  );

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(requestIdMiddleware);
  app.use(httpLogger);

  // Registro de Rutas
  app.use('/api/health', healthRouter);
  app.use('/api', openapiRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/usuarios', usersRouter);
  app.use('/api/roles', rolesRouter);
  app.use('/api/clientes', clientsRouter);
  app.use('/api/sedes', sitesRouter);
  app.use('/api/equipos', assetsRouter);
  app.use('/api/tecnicos', techniciansRouter);
  app.use('/api/especialidades', specialtiesRouter);
  app.use('/api/categorias-servicio', serviceCategoriesRouter);
  app.use('/api/estados', statusesRouter);
  app.use('/api/parametros', parametersRouter);
  app.use('/api/feriados', holidaysRouter);
  app.use('/api/solicitudes', requestsRouter);
  app.use('/api/notificaciones', notificationsRouter);
  app.use('/api/dashboard', dashboardRouter);

  // Middleware de Errores centralizado
  app.use(errorHandlerMiddleware);

  return app;
}
