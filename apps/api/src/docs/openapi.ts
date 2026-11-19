const errorResponse = {
  description: 'Error de la API',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: { type: 'array', items: { type: 'object' } },
              requestId: { type: 'string' },
            },
            required: ['code', 'message', 'requestId'],
          },
        },
      },
    },
  },
};

const envelope = (description: string) => ({
  description,
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          data: { type: 'object' },
          meta: { type: 'object' },
        },
      },
    },
  },
});

interface OperationOptions {
  tag: string;
  summary: string;
  auth?: boolean;
  roles?: string[];
  params?: string[];
  body?: boolean;
  multipart?: boolean;
  responses?: Record<string, unknown>;
}

function operation({
  tag,
  summary,
  auth = true,
  roles,
  params = [],
  body = false,
  multipart = false,
  responses,
}: OperationOptions) {
  const resolvedResponses: Record<string, unknown> = responses ?? {
    '200': envelope('Operación exitosa'),
    '401': errorResponse,
    ...(roles ? { '403': errorResponse } : {}),
    '404': errorResponse,
    '422': errorResponse,
  };

  return {
    tags: [tag],
    summary,
    description: roles ? `${summary} Roles permitidos: ${roles.join(', ')}.` : summary,
    security: auth ? [{ bearerAuth: [] }] : [],
    parameters: params.map((name) => ({
      name,
      in: 'path',
      required: true,
      schema: { type: 'string' },
    })),
    ...(body
      ? {
          requestBody: {
            required: true,
            content: {
              [multipart ? 'multipart/form-data' : 'application/json']: {
                schema: multipart
                  ? {
                      type: 'object',
                      required: ['file'],
                      properties: {
                        file: { type: 'string', format: 'binary' },
                      },
                    }
                  : { type: 'object', additionalProperties: true },
              },
            },
          },
        }
      : {}),
    responses: resolvedResponses,
  };
}

const noContent = { '204': { description: 'Operación exitosa sin contenido' } };

export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'ServiGest Ecuador API',
    version: '1.0.0',
    description:
      'API de gestión de solicitudes de servicio técnico. Todos los endpoints salvo login y recuperación requieren JWT Bearer.',
  },
  servers: [{ url: '/api', description: 'API local' }],
  tags: [
    { name: 'Autenticación', description: 'Login, sesión y recuperación de contraseña' },
    { name: 'Usuarios', description: 'Usuarios y roles' },
    { name: 'Clientes', description: 'Clientes, sedes y equipos' },
    { name: 'Técnicos', description: 'Técnicos, especialidades y carga' },
    { name: 'Catálogos', description: 'Especialidades, categorías, estados, parámetros y feriados' },
    { name: 'Solicitudes', description: 'Registro, seguimiento, transiciones y adjuntos' },
    { name: 'Notificaciones', description: 'Bandeja y stream SSE' },
    { name: 'Dashboard', description: 'Indicadores y reportes' },
    { name: 'Salud', description: 'Estado del servicio' },
  ],
  paths: {
    '/health': {
      get: operation({
        tag: 'Salud',
        summary: 'Estado del servicio y de la base de datos',
        auth: false,
      }),
    },
    '/auth/login': {
      post: operation({ tag: 'Autenticación', summary: 'Inicia sesión', auth: false, body: true }),
    },
    '/auth/refresh': {
      post: operation({ tag: 'Autenticación', summary: 'Renueva el access token', auth: false }),
    },
    '/auth/logout': {
      post: operation({ tag: 'Autenticación', summary: 'Cierra la sesión y revoca el refresh token' }),
    },
    '/auth/forgot-password': {
      post: operation({
        tag: 'Autenticación',
        summary: 'Solicita recuperación de contraseña',
        auth: false,
        body: true,
      }),
    },
    '/auth/reset-password': {
      post: operation({
        tag: 'Autenticación',
        summary: 'Restablece la contraseña con token',
        auth: false,
        body: true,
      }),
    },
    '/auth/me': {
      get: operation({ tag: 'Autenticación', summary: 'Obtiene el perfil autenticado' }),
      patch: operation({ tag: 'Autenticación', summary: 'Actualiza el perfil propio', body: true }),
    },
    '/auth/me/password': {
      patch: operation({ tag: 'Autenticación', summary: 'Cambia la contraseña propia', body: true }),
    },
    '/usuarios': {
      get: operation({ tag: 'Usuarios', summary: 'Lista usuarios paginados', roles: ['ADMIN', 'COORDINADOR'] }),
      post: operation({ tag: 'Usuarios', summary: 'Crea un usuario', roles: ['ADMIN'], body: true }),
    },
    '/usuarios/{id}': {
      get: operation({ tag: 'Usuarios', summary: 'Obtiene un usuario', roles: ['ADMIN', 'COORDINADOR'], params: ['id'] }),
      patch: operation({ tag: 'Usuarios', summary: 'Actualiza un usuario', roles: ['ADMIN'], params: ['id'], body: true }),
      delete: operation({ tag: 'Usuarios', summary: 'Desactiva un usuario', roles: ['ADMIN'], params: ['id'], responses: noContent }),
    },
    '/roles': {
      get: operation({ tag: 'Usuarios', summary: 'Lista el catálogo de roles', roles: ['ADMIN', 'COORDINADOR'] }),
    },
    '/clientes': {
      get: operation({ tag: 'Clientes', summary: 'Lista clientes', roles: ['ADMIN', 'COORDINADOR'] }),
      post: operation({ tag: 'Clientes', summary: 'Crea un cliente', roles: ['ADMIN'], body: true }),
    },
    '/clientes/{id}': {
      get: operation({ tag: 'Clientes', summary: 'Obtiene un cliente con sus sedes', roles: ['ADMIN', 'COORDINADOR'], params: ['id'] }),
      patch: operation({ tag: 'Clientes', summary: 'Actualiza un cliente', roles: ['ADMIN'], params: ['id'], body: true }),
      delete: operation({ tag: 'Clientes', summary: 'Desactiva un cliente', roles: ['ADMIN'], params: ['id'], responses: noContent }),
    },
    '/sedes': {
      get: operation({ tag: 'Clientes', summary: 'Lista sedes de un cliente', roles: ['ADMIN', 'COORDINADOR', 'CLIENTE'] }),
      post: operation({ tag: 'Clientes', summary: 'Crea una sede', roles: ['ADMIN'], body: true }),
    },
    '/sedes/{id}': {
      get: operation({ tag: 'Clientes', summary: 'Obtiene una sede', roles: ['ADMIN', 'COORDINADOR', 'CLIENTE'], params: ['id'] }),
      patch: operation({ tag: 'Clientes', summary: 'Actualiza una sede', roles: ['ADMIN'], params: ['id'], body: true }),
      delete: operation({ tag: 'Clientes', summary: 'Desactiva una sede', roles: ['ADMIN'], params: ['id'], responses: noContent }),
    },
    '/equipos': {
      get: operation({ tag: 'Clientes', summary: 'Lista equipos de una sede', roles: ['ADMIN', 'COORDINADOR', 'CLIENTE'] }),
      post: operation({ tag: 'Clientes', summary: 'Crea un equipo', roles: ['ADMIN'], body: true }),
    },
    '/equipos/{id}': {
      get: operation({ tag: 'Clientes', summary: 'Obtiene un equipo', roles: ['ADMIN', 'COORDINADOR', 'CLIENTE'], params: ['id'] }),
      patch: operation({ tag: 'Clientes', summary: 'Actualiza un equipo', roles: ['ADMIN'], params: ['id'], body: true }),
      delete: operation({ tag: 'Clientes', summary: 'Desactiva un equipo', roles: ['ADMIN'], params: ['id'], responses: noContent }),
    },
    '/tecnicos': {
      get: operation({ tag: 'Técnicos', summary: 'Lista técnicos con filtros', roles: ['ADMIN', 'COORDINADOR', 'TECNICO'] }),
      post: operation({ tag: 'Técnicos', summary: 'Crea un técnico', roles: ['ADMIN'], body: true }),
    },
    '/tecnicos/{id}': {
      get: operation({ tag: 'Técnicos', summary: 'Obtiene un técnico', roles: ['ADMIN', 'COORDINADOR', 'TECNICO'], params: ['id'] }),
      patch: operation({ tag: 'Técnicos', summary: 'Actualiza un técnico', roles: ['ADMIN'], params: ['id'], body: true }),
      delete: operation({ tag: 'Técnicos', summary: 'Desactiva un técnico', roles: ['ADMIN'], params: ['id'], responses: noContent }),
    },
    '/tecnicos/{id}/carga': {
      get: operation({ tag: 'Técnicos', summary: 'Consulta la carga vigente', roles: ['ADMIN', 'COORDINADOR', 'TECNICO'], params: ['id'] }),
    },
    '/tecnicos/{id}/especialidades': {
      put: operation({ tag: 'Técnicos', summary: 'Reemplaza especialidades', roles: ['ADMIN'], params: ['id'], body: true }),
    },
    '/especialidades': {
      get: operation({ tag: 'Catálogos', summary: 'Lista especialidades' }),
      post: operation({ tag: 'Catálogos', summary: 'Crea una especialidad', roles: ['ADMIN'], body: true }),
    },
    '/especialidades/{id}': {
      patch: operation({ tag: 'Catálogos', summary: 'Actualiza una especialidad', roles: ['ADMIN'], params: ['id'], body: true }),
      delete: operation({ tag: 'Catálogos', summary: 'Desactiva una especialidad', roles: ['ADMIN'], params: ['id'], responses: noContent }),
    },
    '/categorias-servicio': {
      get: operation({ tag: 'Catálogos', summary: 'Lista categorías de servicio' }),
      post: operation({ tag: 'Catálogos', summary: 'Crea una categoría', roles: ['ADMIN'], body: true }),
    },
    '/categorias-servicio/{id}': {
      patch: operation({ tag: 'Catálogos', summary: 'Actualiza una categoría', roles: ['ADMIN'], params: ['id'], body: true }),
      delete: operation({ tag: 'Catálogos', summary: 'Desactiva una categoría', roles: ['ADMIN'], params: ['id'], responses: noContent }),
    },
    '/estados': {
      get: operation({ tag: 'Catálogos', summary: 'Lista estados de solicitud' }),
    },
    '/parametros': {
      get: operation({ tag: 'Catálogos', summary: 'Lista parámetros del sistema' }),
    },
    '/parametros/{key}': {
      put: operation({ tag: 'Catálogos', summary: 'Actualiza un parámetro auditado', roles: ['ADMIN'], params: ['key'], body: true }),
    },
    '/feriados': {
      get: operation({ tag: 'Catálogos', summary: 'Lista feriados' }),
      post: operation({ tag: 'Catálogos', summary: 'Registra un feriado', roles: ['ADMIN'], body: true }),
    },
    '/feriados/{date}': {
      delete: operation({ tag: 'Catálogos', summary: 'Elimina un feriado', roles: ['ADMIN'], params: ['date'], responses: noContent }),
    },
    '/solicitudes': {
      get: operation({ tag: 'Solicitudes', summary: 'Lista solicitudes según el rol' }),
      post: operation({ tag: 'Solicitudes', summary: 'Registra una solicitud', roles: ['CLIENTE', 'COORDINADOR', 'ADMIN'], body: true }),
    },
    '/solicitudes/{id}': {
      get: operation({ tag: 'Solicitudes', summary: 'Obtiene el detalle de una solicitud', params: ['id'] }),
      patch: operation({ tag: 'Solicitudes', summary: 'Edita una solicitud con bloqueo optimista', params: ['id'], body: true }),
    },
    '/solicitudes/{id}/estado': {
      patch: operation({ tag: 'Solicitudes', summary: 'Ejecuta una transición de estado', params: ['id'], body: true }),
    },
    '/solicitudes/{id}/asignaciones': {
      post: operation({ tag: 'Solicitudes', summary: 'Asigna o reasigna un técnico', roles: ['ADMIN', 'COORDINADOR'], params: ['id'], body: true }),
    },
    '/solicitudes/{id}/reabrir': {
      post: operation({ tag: 'Solicitudes', summary: 'Reabre una solicitud cerrada', roles: ['ADMIN', 'COORDINADOR'], params: ['id'], body: true }),
    },
    '/solicitudes/{id}/historial': {
      get: operation({ tag: 'Solicitudes', summary: 'Lista el historial inmutable', params: ['id'] }),
    },
    '/solicitudes/{id}/adjuntos': {
      get: operation({ tag: 'Solicitudes', summary: 'Lista metadatos de adjuntos', params: ['id'] }),
      post: operation({ tag: 'Solicitudes', summary: 'Sube un adjunto de hasta 10 MB', params: ['id'], body: true, multipart: true }),
    },
    '/solicitudes/{id}/adjuntos/{attachmentId}': {
      get: operation({ tag: 'Solicitudes', summary: 'Descarga un adjunto autorizado', params: ['id', 'attachmentId'] }),
      delete: operation({ tag: 'Solicitudes', summary: 'Elimina un adjunto autorizado', params: ['id', 'attachmentId'], responses: noContent }),
    },
    '/notificaciones': {
      get: operation({ tag: 'Notificaciones', summary: 'Lista notificaciones propias', responses: { '200': envelope('Notificaciones paginadas'), '401': errorResponse } }),
    },
    '/notificaciones/{id}/leida': {
      patch: operation({ tag: 'Notificaciones', summary: 'Marca una notificación como leída', params: ['id'] }),
    },
    '/notificaciones/leer-todas': {
      post: operation({ tag: 'Notificaciones', summary: 'Marca todas las notificaciones como leídas', responses: noContent }),
    },
    '/notificaciones/stream': {
      get: operation({
        tag: 'Notificaciones',
        summary: 'Stream SSE de notificaciones en tiempo real',
        responses: { '200': { description: 'Stream text/event-stream' }, '401': errorResponse },
      }),
    },
    '/dashboard/indicadores': {
      get: operation({ tag: 'Dashboard', summary: 'Indicadores del rango', roles: ['ADMIN', 'COORDINADOR'] }),
    },
    '/dashboard/carga-tecnicos': {
      get: operation({ tag: 'Dashboard', summary: 'Carga y capacidad por técnico', roles: ['ADMIN', 'COORDINADOR'] }),
    },
    '/dashboard/evolucion': {
      get: operation({ tag: 'Dashboard', summary: 'Evolución temporal de creadas y resueltas', roles: ['ADMIN', 'COORDINADOR'] }),
    },
    '/dashboard/mi-resumen': {
      get: operation({ tag: 'Dashboard', summary: 'Resumen propio del técnico o cliente', roles: ['TECNICO', 'CLIENTE'] }),
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: { type: 'array', items: { type: 'object' } },
              requestId: { type: 'string' },
            },
          },
        },
      },
    },
  },
};
