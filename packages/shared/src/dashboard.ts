import { z } from 'zod';

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha esperado: YYYY-MM-DD')
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

export const dashboardGranularitySchema = z.enum(['day', 'week']);

export const dashboardQuerySchema = z
  .object({
    from: isoDateSchema,
    to: isoDateSchema,
    granularity: dashboardGranularitySchema.default('day'),
    clientId: z.string().uuid('clientId inválido').optional(),
    categoryId: z.coerce.number().int().positive().optional(),
  })
  .superRefine((value, ctx) => {
    const from = value.from.getTime();
    const to = value.to.getTime();

    if (from > to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['from'],
        message: 'La fecha inicial no puede ser posterior a la final',
      });
      return;
    }

    const days = Math.floor((to - from) / 86_400_000) + 1;
    if (days > 366) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['to'],
        message: 'El rango máximo permitido es de 366 días',
      });
    }
  });

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
export type DashboardGranularity = z.infer<typeof dashboardGranularitySchema>;

export const dashboardOverviewSchema = z.object({
  range: z.object({ from: z.string(), to: z.string() }),
  byStatus: z.array(z.object({ status: z.string(), count: z.number() })),
  byPriority: z.array(z.object({ priority: z.string(), count: z.number() })),
  technicianLoad: z.array(
    z.object({
      technicianId: z.string(),
      fullName: z.string(),
      active: z.number(),
      capacity: z.number(),
    })
  ),
  avgResolutionHours: z.number(),
  slaCompliance: z.object({
    within: z.number(),
    total: z.number(),
    percentage: z.number(),
  }),
  overdue: z.number(),
  evolution: z.array(
    z.object({ date: z.string(), created: z.number(), resolved: z.number() })
  ),
});

export type DashboardOverview = z.infer<typeof dashboardOverviewSchema>;

export const dashboardEvolutionSchema = z.object({
  range: z.object({ from: z.string(), to: z.string() }),
  granularity: dashboardGranularitySchema,
  evolution: z.array(
    z.object({ date: z.string(), created: z.number(), resolved: z.number() })
  ),
});

export type DashboardEvolution = z.infer<typeof dashboardEvolutionSchema>;

export const technicianLoadListSchema = z.array(
  z.object({
    technicianId: z.string(),
    fullName: z.string(),
    active: z.number(),
    capacity: z.number(),
    available: z.number(),
  })
);

export type TechnicianLoadItem = z.infer<typeof technicianLoadListSchema>[number];

export const mySummarySchema = z.object({
  range: z.object({ from: z.string(), to: z.string() }),
  total: z.number(),
  byStatus: z.array(z.object({ status: z.string(), count: z.number() })),
  byPriority: z.array(z.object({ priority: z.string(), count: z.number() })),
  overdue: z.number(),
  avgResolutionHours: z.number(),
  slaCompliance: z.object({
    within: z.number(),
    total: z.number(),
    percentage: z.number(),
  }),
});

export type MySummary = z.infer<typeof mySummarySchema>;
