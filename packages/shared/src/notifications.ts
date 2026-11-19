import { z } from 'zod';

export const NOTIFICATION_TYPES = [
  'SOLICITUD_REGISTRADA',
  'ASIGNACION',
  'CAMBIO_ESTADO',
  'INFO_REQUERIDA',
  'CIERRE',
  'REAPERTURA',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const notificationEventSchema = z.object({
  id: z.string(),
  type: z.enum(NOTIFICATION_TYPES),
  title: z.string(),
  body: z.string(),
  requestId: z.string().nullable().optional(),
  createdAt: z.string(),
});

export type NotificationEvent = z.infer<typeof notificationEventSchema>;

export const notificationListFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  unread: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((value) => value === true || value === 'true')
    .optional(),
});

export type NotificationListFilter = z.infer<typeof notificationListFilterSchema>;
