import { z } from 'zod';
import { PRIORITIES } from './priorities.ts';

export const clientStatusSchema = z.enum(['ACTIVO', 'INACTIVO']);
export const siteStatusSchema = z.enum(['ACTIVA', 'INACTIVA']);
export const assetStatusSchema = z.enum(['OPERATIVO', 'FUERA_SERVICIO']);
export const technicianAvailabilitySchema = z.enum(['DISPONIBLE', 'NO_DISPONIBLE']);
export const catalogStatusSchema = z.enum(['ACTIVA', 'INACTIVA']);
export const specialtyLevelSchema = z.enum(['BASICO', 'INTERMEDIO', 'AVANZADO']);

const paginationSchema = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
};

const rucSchema = z
  .string()
  .regex(/^\d{13}$/, 'El RUC debe tener 13 dígitos numéricos');

export const createClientDtoSchema = z.object({
  ruc: rucSchema,
  businessName: z.string().min(3).max(160),
  tradeName: z.string().max(160).nullable().optional(),
  email: z.string().email('Correo electrónico no válido'),
  phone: z.string().max(20).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
});
export type CreateClientDto = z.infer<typeof createClientDtoSchema>;

export const updateClientDtoSchema = z
  .object({
    ruc: rucSchema.optional(),
    businessName: z.string().min(3).max(160).optional(),
    tradeName: z.string().max(160).nullable().optional(),
    email: z.string().email('Correo electrónico no válido').optional(),
    phone: z.string().max(20).nullable().optional(),
    address: z.string().max(500).nullable().optional(),
    status: clientStatusSchema.optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'Debe enviar al menos un campo para actualizar',
  });
export type UpdateClientDto = z.infer<typeof updateClientDtoSchema>;

export const clientListFilterSchema = z.object({
  ...paginationSchema,
  search: z.string().trim().max(160).optional(),
  status: clientStatusSchema.optional(),
});
export type ClientListFilter = z.infer<typeof clientListFilterSchema>;

export const createSiteDtoSchema = z.object({
  name: z.string().min(2).max(120),
  address: z.string().min(5).max(500),
  city: z.string().max(80).default('Guayaquil'),
  contactName: z.string().max(120).nullable().optional(),
  contactPhone: z.string().max(20).nullable().optional(),
});
export type CreateSiteDto = z.infer<typeof createSiteDtoSchema>;

export const updateSiteDtoSchema = z
  .object({
    name: z.string().min(2).max(120).optional(),
    address: z.string().min(5).max(500).optional(),
    city: z.string().max(80).optional(),
    contactName: z.string().max(120).nullable().optional(),
    contactPhone: z.string().max(20).nullable().optional(),
    status: siteStatusSchema.optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'Debe enviar al menos un campo para actualizar',
  });
export type UpdateSiteDto = z.infer<typeof updateSiteDtoSchema>;

export const createAssetDtoSchema = z.object({
  code: z.string().min(2).max(40),
  name: z.string().min(2).max(120),
  assetType: z.string().max(60).nullable().optional(),
  serialNumber: z.string().max(80).nullable().optional(),
});
export type CreateAssetDto = z.infer<typeof createAssetDtoSchema>;

export const updateAssetDtoSchema = z
  .object({
    code: z.string().min(2).max(40).optional(),
    name: z.string().min(2).max(120).optional(),
    assetType: z.string().max(60).nullable().optional(),
    serialNumber: z.string().max(80).nullable().optional(),
    status: assetStatusSchema.optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'Debe enviar al menos un campo para actualizar',
  });
export type UpdateAssetDto = z.infer<typeof updateAssetDtoSchema>;

export const technicianSpecialtyDtoSchema = z.object({
  specialtyId: z.number().int().positive(),
  level: specialtyLevelSchema.default('INTERMEDIO'),
});
export type TechnicianSpecialtyDto = z.infer<typeof technicianSpecialtyDtoSchema>;

export const createTechnicianDtoSchema = z.object({
  userId: z.string().uuid('Identificador de usuario no válido'),
  employeeCode: z.string().min(2).max(20),
  maxConcurrentLoad: z.number().int().positive().max(50).default(5),
  availability: technicianAvailabilitySchema.default('DISPONIBLE'),
  specialties: z.array(technicianSpecialtyDtoSchema).min(1, 'Debe registrar al menos una especialidad'),
});
export type CreateTechnicianDto = z.infer<typeof createTechnicianDtoSchema>;

export const updateTechnicianDtoSchema = z
  .object({
    employeeCode: z.string().min(2).max(20).optional(),
    maxConcurrentLoad: z.number().int().positive().max(50).optional(),
    availability: technicianAvailabilitySchema.optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'Debe enviar al menos un campo para actualizar',
  });
export type UpdateTechnicianDto = z.infer<typeof updateTechnicianDtoSchema>;

export const replaceTechnicianSpecialtiesDtoSchema = z.object({
  specialties: z.array(technicianSpecialtyDtoSchema).min(1, 'Debe registrar al menos una especialidad'),
});
export type ReplaceTechnicianSpecialtiesDto = z.infer<
  typeof replaceTechnicianSpecialtiesDtoSchema
>;

export const technicianListFilterSchema = z.object({
  ...paginationSchema,
  specialtyId: z.coerce.number().int().positive().optional(),
  availability: technicianAvailabilitySchema.optional(),
  status: z.enum(['ACTIVO', 'INACTIVO']).optional(),
  search: z.string().trim().max(120).optional(),
});
export type TechnicianListFilter = z.infer<typeof technicianListFilterSchema>;

export const createSpecialtyDtoSchema = z.object({
  code: z.string().min(2).max(30),
  name: z.string().min(3).max(100),
  description: z.string().max(500).nullable().optional(),
});
export type CreateSpecialtyDto = z.infer<typeof createSpecialtyDtoSchema>;

export const updateSpecialtyDtoSchema = z
  .object({
    code: z.string().min(2).max(30).optional(),
    name: z.string().min(3).max(100).optional(),
    description: z.string().max(500).nullable().optional(),
    status: catalogStatusSchema.optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'Debe enviar al menos un campo para actualizar',
  });
export type UpdateSpecialtyDto = z.infer<typeof updateSpecialtyDtoSchema>;

export const createServiceCategoryDtoSchema = z.object({
  code: z.string().min(2).max(30),
  name: z.string().min(3).max(120),
  specialtyId: z.number().int().positive(),
  defaultPriority: z.enum(PRIORITIES).default('MEDIA'),
});
export type CreateServiceCategoryDto = z.infer<typeof createServiceCategoryDtoSchema>;

export const updateServiceCategoryDtoSchema = z
  .object({
    code: z.string().min(2).max(30).optional(),
    name: z.string().min(3).max(120).optional(),
    specialtyId: z.number().int().positive().optional(),
    defaultPriority: z.enum(PRIORITIES).optional(),
    status: catalogStatusSchema.optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'Debe enviar al menos un campo para actualizar',
  });
export type UpdateServiceCategoryDto = z.infer<typeof updateServiceCategoryDtoSchema>;

export const updateParameterDtoSchema = z.object({
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.unknown()),
    z.record(z.unknown()),
  ]),
  description: z.string().max(300).nullable().optional(),
});
export type UpdateParameterDto = z.infer<typeof updateParameterDtoSchema>;

export const createHolidayDtoSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado YYYY-MM-DD'),
  name: z.string().min(3).max(120),
});
export type CreateHolidayDto = z.infer<typeof createHolidayDtoSchema>;
