import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SlaEngine, DEFAULT_SLA_CONFIG } from '../../../src/domain/sla/sla-engine.ts';

describe('Suite de Aceptación Independiente de SLA con Almuerzo (TC-SLA / T-025)', () => {
  // Feriado de prueba: 2026-07-24 (Viernes)
  const holidays = new Set(['2026-07-24']);
  const slaEngine = new SlaEngine(DEFAULT_SLA_CONFIG, holidays);

  function local(year: number, month: number, day: number, hour: number, min: number = 0): Date {
    return new Date(Date.UTC(year, month - 1, day, hour + 5, min, 0));
  }

  it('TC-SLA-01: CRITICA (4 h) creada lunes 09:00 vence lunes a las 13:00 antes de almuerzo', () => {
    const start = local(2026, 7, 20, 9, 0);
    const dueAt = slaEngine.calculateDueAt(start, 'CRITICA');
    assert.strictEqual(dueAt.toISOString(), local(2026, 7, 20, 13, 0).toISOString());
  });

  it('TC-SLA-02: ALTA (8 h) creada lunes 09:00 consume 7h el lunes (almuerzo 13-14) y vence martes a las 09:00', () => {
    // 09:00 a 13:00 (4h) + 14:00 a 17:00 (3h) = 7 horas consumidas el lunes.
    // Queda 1 hora para el martes de 08:00 a 09:00.
    const start = local(2026, 7, 20, 9, 0);
    const dueAt = slaEngine.calculateDueAt(start, 'ALTA');
    assert.strictEqual(dueAt.toISOString(), local(2026, 7, 21, 9, 0).toISOString());
  });

  it('TC-SLA-03: solicitud creada durante almuerzo (13:30) inicia a las 14:00', () => {
    const duringLunch = local(2026, 7, 20, 13, 30);
    const dueAt = slaEngine.calculateDueAt(duringLunch, 'CRITICA'); // 4h
    // 14:00 a 17:00 (3h lunes) + 08:00 a 09:00 (1h martes)
    assert.strictEqual(dueAt.toISOString(), local(2026, 7, 21, 9, 0).toISOString());
  });

  it('TC-SLA-04: cruce de fin de semana (viernes 15:00 ALTA 8h)', () => {
    // Viernes: 15:00 a 17:00 (2h consumidas). Quedan 6h.
    // Sábado y domingo: descanso.
    // Lunes: 08:00 a 13:00 (5h consumidas). Queda 1h.
    // Lunes 13:00 a 14:00: almuerzo.
    // Lunes 14:00 a 15:00: 1h restante.
    // Vence lunes a las 15:00.
    const startFriday = local(2026, 7, 17, 15, 0);
    const dueAt = slaEngine.calculateDueAt(startFriday, 'ALTA');
    assert.strictEqual(dueAt.toISOString(), local(2026, 7, 20, 15, 0).toISOString());
  });

  it('TC-SLA-05: salto estricto de feriados configurados (2026-07-24)', () => {
    // Jueves 2026-07-23 15:00, CRITICA (4 horas).
    // Jueves: 15:00 a 17:00 (2h consumidas). Quedan 2h.
    // Viernes 24: Feriado (0h).
    // Sábado 25 y Domingo 26: Fin de semana.
    // Lunes 27: 08:00 + 2h = 10:00.
    const startThursday = local(2026, 7, 23, 15, 0);
    const dueAt = slaEngine.calculateDueAt(startThursday, 'CRITICA');
    assert.strictEqual(dueAt.toISOString(), local(2026, 7, 27, 10, 0).toISOString());
  });

  it('TC-SLA-06: pausa de SLA (slaPausedMinutes) extiende la fecha límite', () => {
    // Lunes 09:00 CRITICA (4h -> 13:00) + 60 min de pausa
    // 09:00 a 13:00 (4h) + almuerzo 13:00 a 14:00 + 1h de pausa = 15:00
    const start = local(2026, 7, 20, 9, 0);
    const dueAt = slaEngine.calculateDueAt(start, 'CRITICA', 60);
    assert.strictEqual(dueAt.toISOString(), local(2026, 7, 20, 15, 0).toISOString());
  });

  it('TC-SLA-07: recálculo por cambio de prioridad (MEDIA 24h a CRITICA 4h)', () => {
    const start = local(2026, 7, 20, 9, 0);
    const dueMedia = slaEngine.calculateDueAt(start, 'MEDIA');
    const dueCritica = slaEngine.calculateDueAt(start, 'CRITICA');
    assert.ok(dueCritica.getTime() < dueMedia.getTime());
    assert.strictEqual(dueCritica.toISOString(), local(2026, 7, 20, 13, 0).toISOString());
  });

  it('TC-SLA-08: detección de vencimiento (isOverdue)', () => {
    const dueAt = local(2026, 7, 20, 12, 0);
    const beforeNow = local(2026, 7, 20, 11, 0);
    assert.strictEqual(slaEngine.isOverdue(dueAt, 'EN_PROCESO', beforeNow), false);

    const afterNow = local(2026, 7, 20, 13, 0);
    assert.strictEqual(slaEngine.isOverdue(dueAt, 'EN_PROCESO', afterNow), true);
    assert.strictEqual(slaEngine.isOverdue(dueAt, 'RESUELTA', afterNow), false);
    assert.strictEqual(slaEngine.isOverdue(dueAt, 'CERRADA', afterNow), false);
  });
});
