import { z } from 'zod';
import { PRIORITIES } from './priorities.ts';
import { TRANSITION_ACTIONS } from './actions.ts';
import { REQUEST_STATUSES } from './statuses.ts';

export const createRequestDtoSchema = z.object({
  siteId: z.string().uuid('ID de sede debe ser un UUID válido'),
  assetId: z.string().uuid('ID de equipo debe ser un UUID válido').nullable().optional(),
  categoryId: z.number().int().positive('ID de categoría inválido'),
  priority: z.enum(PRIORITIES),
  description: z
    .string()
    .min(20, 'La descripción debe tener al menos 20 caracteres')
    .max(2000, 'La descripción no puede exceder 2000 caracteres'),
});

export type CreateRequestDto = z.infer<typeof createRequestDtoSchema>;

export const editRequestDtoSchema = z.object({
  description: z.string().min(20).max(2000).optional(),
  priority: z.enum(PRIORITIES).optional(),
  assetId: z.string().uuid().nullable().optional(),
  categoryId: z.number().int().positive().optional(),
  version: z.number().int().positive('La versión es requerida para control de concurrencia'),
});

export type EditRequestDto = z.infer<typeof editRequestDtoSchema>;

export const transitionDtoSchema = z.object({
  action: z.enum(TRANSITION_ACTIONS),
  comment: z.string().min(10, 'El comentario debe tener al menos 10 caracteres').optional(),
  reason: z.string().min(10, 'El motivo debe tener al menos 10 caracteres').optional(),
  resolution: z.string().min(30, 'La resolución debe tener al menos 30 caracteres').optional(),
  version: z.number().int().positive('La versión es requerida para control de concurrencia'),
});

export type TransitionDto = z.infer<typeof transitionDtoSchema>;

export const assignTechnicianDtoSchema = z.object({
  technicianId: z.string().uuid('ID de técnico debe ser un UUID válido'),
  reason: z.string().min(10, 'El motivo de reasignación debe tener al menos 10 caracteres').nullable().optional(),
  version: z.number().int().positive('La versión es requerida'),
});

export type AssignTechnicianDto = z.infer<typeof assignTechnicianDtoSchema>;

export const reopenRequestDtoSchema = z.object({
  reason: z.string().min(20, 'El motivo de reapertura debe tener al menos 20 caracteres'),
  version: z.number().int().positive('La versión es requerida'),
});

export type ReopenRequestDto = z.infer<typeof reopenRequestDtoSchema>;

export const requestListFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.union([z.enum(REQUEST_STATUSES), z.array(z.enum(REQUEST_STATUSES))]).optional(),
  priority: z.enum(PRIORITIES).optional(),
  clientId: z.string().uuid().optional(),
  technicianId: z.string().uuid().optional(),
  categoryId: z.coerce.number().int().optional(),
  overdue: z.coerce.boolean().optional(),
  search: z.string().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha YYYY-MM-DD').optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha YYYY-MM-DD').optional(),
  sort: z.enum(['createdAt', '-createdAt', 'dueAt', '-dueAt', 'priority', '-priority', 'status', '-status']).optional(),
});

export type RequestListFilter = z.infer<typeof requestListFilterSchema>;
