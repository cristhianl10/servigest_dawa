import { Request, Response, Router } from 'express';
import { openApiDocument } from '../../docs/openapi.ts';

export const openapiRouter = Router();

openapiRouter.get('/openapi.json', (_req: Request, res: Response) => {
  res.status(200).json(openApiDocument);
});

openapiRouter.get('/docs', (_req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({ error: { code: 'RECURSO_NO_ENCONTRADO', message: 'No disponible.' } });
    return;
  }

  res.status(200).type('html').send(`<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>ServiGest Ecuador API</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: '/api/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        displayRequestDuration: true,
      });
    </script>
  </body>
</html>`);
});
