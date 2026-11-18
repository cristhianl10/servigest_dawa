import { describe, it, expect } from 'vitest';
import { SlaEngine, DEFAULT_SLA_CONFIG } from '../../../src/domain/sla/sla-engine';

describe('Suite de Aceptación Independiente de SLA (TC-SLA / T-025)', () => {
  // Feriado de prueba: 2026-07-24 (Viernes de Fundación de Guayaquil o similar)
  const holidays = new Set(['2026-07-24']);
  const slaEngine = new SlaEngine(DEFAULT_SLA_CONFIG, holidays);

  // Helper para crear fechas en hora local de Guayaquil (UTC-5)
  // Ej: localToUtc(2026, 7, 20, 9, 0) => 2026-07-20 09:00:00 Guayaquil (14:00 UTC)
  function local(year: number, month: number, day: number, hour: number, min: number = 0): Date {
    return new Date(Date.UTC(year, month - 1, day, hour + 5, min, 0));
  }

  it('TC-SLA-01: cálculo básico de 4 horas para prioridad CRITICA dentro del mismo día laboral', () => {
    // Lunes 2026-07-20 09:00 local (día laborable ordinario)
    const start = local(2026, 7, 20, 9, 0);
    const dueAt = slaEngine.calculateDueAt(start, 'CRITICA');

    // 09:00 + 4h laborables = 13:00 del mismo lunes
    expect(dueAt.toISOString()).toBe(local(2026, 7, 20, 13, 0).toISOString());
  });

  it('TC-SLA-02: solicitud creada fuera de jornada laboral avanza a las 08:00 del siguiente día hábil', () => {
    // Lunes 2026-07-20 06:30 local (antes de las 08:00)
    const earlyStart = local(2026, 7, 20, 6, 30);
    const dueAt = slaEngine.calculateDueAt(earlyStart, 'CRITICA');

    // Comienza a contar a las 08:00 + 4 horas = 12:00
    expect(dueAt.toISOString()).toBe(local(2026, 7, 20, 12, 0).toISOString());
  });

  it('TC-SLA-03: cruce de fin de semana (viernes por la tarde pasa al lunes)', () => {
    // Viernes 2026-07-17 15:00 local (quedan 2 horas laborables hasta las 17:00)
    // Prioridad ALTA = 8 horas laborables
    const startFriday = local(2026, 7, 17, 15, 0);
    const dueAt = slaEngine.calculateDueAt(startFriday, 'ALTA');

    // Viernes consume 2 horas (15:00 a 17:00). Quedan 6 horas.
    // Salta sábado 18 y domingo 19.
    // Lunes 2026-07-20: 08:00-13:00 (5h), almuerzo 13:00-14:00, 14:00-15:00 (1h) = 15:00
    expect(dueAt.toISOString()).toBe(local(2026, 7, 20, 15, 0).toISOString());
  });

  it('TC-SLA-04: salto estricto de feriados configurados', () => {
    // Jueves 2026-07-23 15:00 local (quedan 2 horas hasta las 17:00).
    // Viernes 2026-07-24 es FERIADO en nuestra configuración.
    // Prioridad CRITICA = 4 horas laborables.
    const startThursday = local(2026, 7, 23, 15, 0);
    const dueAt = slaEngine.calculateDueAt(startThursday, 'CRITICA');

    // Jueves consume 2 horas (15:00 a 17:00). Quedan 2 horas.
    // Viernes 24 es feriado (0 horas consumidas).
    // Sábado 25 y Domingo 26 son fin de semana.
    // Lunes 2026-07-27 arranca a las 08:00 + 2 horas restantes = 10:00
    expect(dueAt.toISOString()).toBe(local(2026, 7, 27, 10, 0).toISOString());
  });

  it('TC-SLA-05: pausa de SLA (slaPausedMinutes) extiende proporcionalmente la fecha límite', () => {
    // Lunes 2026-07-20 09:00, CRITICA (4 horas = 240 minutos).
    // Si hubo una pausa acumulada de 60 minutos:
    const start = local(2026, 7, 20, 9, 0);
    const dueAt = slaEngine.calculateDueAt(start, 'CRITICA', 60);

    // 09:00 + 4 horas = 13:00; la pausa de 1 hora se consume tras el almuerzo = 15:00
    expect(dueAt.toISOString()).toBe(local(2026, 7, 20, 15, 0).toISOString());
  });

  it('TC-SLA-06: recálculo por cambio de prioridad (ej. MEDIA 24h a CRITICA 4h)', () => {
    const start = local(2026, 7, 20, 9, 0);
    const dueMedia = slaEngine.calculateDueAt(start, 'MEDIA');
    const dueCritica = slaEngine.calculateDueAt(start, 'CRITICA');

    // La fecha límite para crítica debe ser anterior a la de media
    expect(dueCritica.getTime()).toBeLessThan(dueMedia.getTime());
    expect(dueCritica.toISOString()).toBe(local(2026, 7, 20, 13, 0).toISOString());
  });

  it('TC-SLA-07: detección de vencimiento (isOverdue)', () => {
    const dueAt = local(2026, 7, 20, 12, 0);

    // Antes de vencer:
    const beforeNow = local(2026, 7, 20, 11, 0);
    expect(slaEngine.isOverdue(dueAt, 'EN_PROCESO', beforeNow)).toBe(false);

    // Después de vencer y solicitud sigue abierta:
    const afterNow = local(2026, 7, 20, 13, 0);
    expect(slaEngine.isOverdue(dueAt, 'EN_PROCESO', afterNow)).toBe(true);

    // Después de vencer pero solicitud ya fue RESUELTA o CERRADA:
    expect(slaEngine.isOverdue(dueAt, 'RESUELTA', afterNow)).toBe(false);
    expect(slaEngine.isOverdue(dueAt, 'CERRADA', afterNow)).toBe(false);
  });
});
