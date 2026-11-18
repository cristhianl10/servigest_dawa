import express, { Express } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { requestIdMiddleware } from './presentation/middlewares/request-id';
import { errorHandlerMiddleware } from './presentation/middlewares/error-handler';
import { healthRouter } from './presentation/routes/health.routes.ts';
import { notificationsRouter } from './presentation/routes/notifications.routes.ts';
import { authRouter } from './modules/auth/auth.routes.ts';
import { requestsRouter } from './modules/requests/requests.routes.ts';

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

  // Registro de Rutas
  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/solicitudes', requestsRouter);
  app.use('/api/notificaciones', notificationsRouter);

  // Middleware de Errores centralizado
  app.use(errorHandlerMiddleware);

  return app;
}
