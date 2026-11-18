export const ROLES = ['ADMIN', 'COORDINADOR', 'TECNICO', 'CLIENTE'] as const;
export type Role = (typeof ROLES)[number];
