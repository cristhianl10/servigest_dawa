export const PRIORITIES = ['CRITICA', 'ALTA', 'MEDIA', 'BAJA'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const SLA_HOURS: Record<Priority, number> = {
  CRITICA: 4,
  ALTA: 8,
  MEDIA: 24,
  BAJA: 72,
};
