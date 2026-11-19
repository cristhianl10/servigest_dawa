import pino from 'pino';

const isTest = process.env.NODE_ENV === 'test' || process.env.LOG_SILENT === 'true';

export const logger = pino({
  level: isTest ? 'silent' : process.env.LOG_LEVEL || 'info',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      'password',
      'newPassword',
      'currentPassword',
      'temporaryPassword',
      'token',
      'refreshToken',
    ],
    censor: '[REDACTED]',
  },
});
