export const TRANSITION_ACTIONS = [
  'aprobar',
  'cancelar',
  'asignar',
  'iniciar',
  'solicitar_info',
  'reanudar',
  'resolver',
  'cerrar',
  'reabrir_trabajo',
  'reapertura',
] as const;

export type TransitionAction = (typeof TRANSITION_ACTIONS)[number];
