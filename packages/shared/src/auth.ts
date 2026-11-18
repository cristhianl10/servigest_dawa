import { z } from 'zod';
import { ROLES } from './roles.ts';

export const passwordSchema = z
  .string()
  .min(10, 'Mínimo 10 caracteres')
  .max(72, 'Máximo 72 caracteres')
  .regex(/[A-Z]/, 'Debe incluir al menos una letra mayúscula')
  .regex(/[a-z]/, 'Debe incluir al menos una letra minúscula')
  .regex(/[0-9]/, 'Debe incluir al menos un número')
  .regex(/[^A-Za-z0-9]/, 'Debe incluir al menos un símbolo especial');

export const loginDtoSchema = z.object({
  email: z.string().email('Correo electrónico no válido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

export type LoginDto = z.infer<typeof loginDtoSchema>;

export const forgotPasswordDtoSchema = z.object({
  email: z.string().email('Correo electrónico no válido'),
});

export type ForgotPasswordDto = z.infer<typeof forgotPasswordDtoSchema>;

export const resetPasswordDtoSchema = z.object({
  token: z.string().min(1, 'El token es obligatorio'),
  newPassword: passwordSchema,
});

export type ResetPasswordDto = z.infer<typeof resetPasswordDtoSchema>;

export const changePasswordDtoSchema = z.object({
  currentPassword: z.string().min(1, 'La contraseña actual es obligatoria'),
  newPassword: passwordSchema,
});

export type ChangePasswordDto = z.infer<typeof changePasswordDtoSchema>;

export const authUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  fullName: z.string(),
  role: z.enum(ROLES),
  clientId: z.string().nullable(),
  mustChangePassword: z.boolean(),
});

export type AuthUser = z.infer<typeof authUserSchema>;

export const authResponseSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.number(),
  user: authUserSchema,
});

export type AuthResponse = z.infer<typeof authResponseSchema>;
