import { z } from 'zod';
import { ROLES } from './roles.ts';
import { passwordSchema } from './auth.ts';

export const userStatusSchema = z.enum(['ACTIVO', 'INACTIVO']);

export const roleSchema = z.enum(ROLES);

export const createUserDtoSchema = z
  .object({
    email: z.string().email('Correo electrónico no válido'),
    fullName: z.string().min(3, 'Mínimo 3 caracteres').max(120, 'Máximo 120 caracteres'),
    phone: z.string().max(20, 'Máximo 20 caracteres').nullable().optional(),
    role: roleSchema,
    clientId: z.string().uuid('Identificador de cliente no válido').nullable().optional(),
    temporaryPassword: passwordSchema,
  })
  .refine((data) => data.role !== 'CLIENTE' || Boolean(data.clientId), {
    message: 'Un usuario CLIENTE requiere clientId',
    path: ['clientId'],
  })
  .refine((data) => data.role === 'CLIENTE' || !data.clientId, {
    message: 'Solo los usuarios CLIENTE pueden tener clientId',
    path: ['clientId'],
  });

export type CreateUserDto = z.infer<typeof createUserDtoSchema>;

export const updateUserDtoSchema = z
  .object({
    fullName: z.string().min(3, 'Mínimo 3 caracteres').max(120, 'Máximo 120 caracteres').optional(),
    phone: z.string().max(20, 'Máximo 20 caracteres').nullable().optional(),
    role: roleSchema.optional(),
    clientId: z.string().uuid('Identificador de cliente no válido').nullable().optional(),
    status: userStatusSchema.optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'Debe enviar al menos un campo para actualizar',
  });

export type UpdateUserDto = z.infer<typeof updateUserDtoSchema>;

export const userListFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  role: roleSchema.optional(),
  status: userStatusSchema.optional(),
  search: z.string().trim().max(120).optional(),
});

export type UserListFilter = z.infer<typeof userListFilterSchema>;

export const updateProfileDtoSchema = z
  .object({
    fullName: z.string().min(3, 'Mínimo 3 caracteres').max(120, 'Máximo 120 caracteres').optional(),
    phone: z.string().max(20, 'Máximo 20 caracteres').nullable().optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'Debe enviar al menos un campo para actualizar',
  });

export type UpdateProfileDto = z.infer<typeof updateProfileDtoSchema>;

export interface RoleRecord {
  id: number;
  code: (typeof ROLES)[number];
  name: string;
}
