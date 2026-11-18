export const REQUEST_STATUSES = [
  'REGISTRADA',
  'APROBADA',
  'ASIGNADA',
  'EN_PROCESO',
  'PENDIENTE_INFO',
  'RESUELTA',
  'CERRADA',
  'CANCELADA',
] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const TERMINAL_STATUSES: readonly RequestStatus[] = ['CERRADA', 'CANCELADA'];
