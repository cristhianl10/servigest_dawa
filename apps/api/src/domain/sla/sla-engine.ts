import { type Priority, SLA_HOURS } from '@servigest/shared';
import type { RequestStatus } from '@servigest/shared';

export interface SlaCalendarConfig {
  startHour: number; // 8
  startMinute: number; // 0
  endHour: number; // 17
  endMinute: number; // 0
  lunchStartHour: number; // 13
  lunchStartMinute: number; // 0
  lunchEndHour: number; // 14
  lunchEndMinute: number; // 0
  timeZoneOffsetMinutes: number; // -300 for America/Guayaquil (UTC-5)
}

export const DEFAULT_SLA_CONFIG: SlaCalendarConfig = {
  startHour: 8,
  startMinute: 0,
  endHour: 17,
  endMinute: 0,
  lunchStartHour: 13,
  lunchStartMinute: 0,
  lunchEndHour: 14,
  lunchEndMinute: 0,
  timeZoneOffsetMinutes: -300, // UTC-5
};

export class SlaEngine {
  private readonly config: SlaCalendarConfig;
  private readonly holidays: Set<string>;

  constructor(
    config: SlaCalendarConfig = DEFAULT_SLA_CONFIG,
    holidays: Set<string> = new Set()
  ) {
    this.config = config;
    this.holidays = holidays;
  }

  private toLocalComponents(date: Date) {
    const utcMs = date.getTime();
    const localMs = utcMs + this.config.timeZoneOffsetMinutes * 60 * 1000;
    const localDate = new Date(localMs);

    const year = localDate.getUTCFullYear();
    const month = localDate.getUTCMonth();
    const day = localDate.getUTCDate();
    const dayOfWeek = localDate.getUTCDay();
    const hour = localDate.getUTCHours();
    const minute = localDate.getUTCMinutes();
    const second = localDate.getUTCSeconds();
    const ms = localDate.getUTCMilliseconds();

    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    return {
      year,
      month,
      day,
      dayOfWeek,
      hour,
      minute,
      second,
      ms,
      dateString,
      minutesFromMidnight: hour * 60 + minute + second / 60,
    };
  }

  private fromLocalComponents(
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
    second: number = 0,
    ms: number = 0
  ): Date {
    const localUtcMs = Date.UTC(year, month, day, hour, minute, second, ms);
    return new Date(localUtcMs - this.config.timeZoneOffsetMinutes * 60 * 1000);
  }

  public isBusinessDay(date: Date): boolean {
    const local = this.toLocalComponents(date);
    if (local.dayOfWeek === 0 || local.dayOfWeek === 6) return false;
    if (this.holidays.has(local.dateString)) return false;
    return true;
  }

  /**
   * Avanza al siguiente momento laboral disponible considerando horario, almuerzo (13-14), fines de semana y feriados
   */
  public nextBusinessMoment(date: Date): Date {
    let cursor = new Date(date);
    const workStartMin = this.config.startHour * 60 + this.config.startMinute; // 480 (08:00)
    const workEndMin = this.config.endHour * 60 + this.config.endMinute; // 1020 (17:00)
    const lunchStartMin = this.config.lunchStartHour * 60 + this.config.lunchStartMinute; // 780 (13:00)
    const lunchEndMin = this.config.lunchEndHour * 60 + this.config.lunchEndMinute; // 840 (14:00)

    while (true) {
      const local = this.toLocalComponents(cursor);
      const isBusiness = local.dayOfWeek !== 0 && local.dayOfWeek !== 6 && !this.holidays.has(local.dateString);

      if (!isBusiness) {
        cursor = this.fromLocalComponents(
          local.year,
          local.month,
          local.day + 1,
          this.config.startHour,
          this.config.startMinute,
          0,
          0
        );
        continue;
      }

      // Antes del inicio de jornada (antes de 08:00)
      if (local.minutesFromMidnight < workStartMin) {
        return this.fromLocalComponents(
          local.year,
          local.month,
          local.day,
          this.config.startHour,
          this.config.startMinute,
          0,
          0
        );
      }

      // Durante la hora de almuerzo (13:00 a 14:00)
      if (local.minutesFromMidnight >= lunchStartMin && local.minutesFromMidnight < lunchEndMin) {
        return this.fromLocalComponents(
          local.year,
          local.month,
          local.day,
          this.config.lunchEndHour,
          this.config.lunchEndMinute,
          0,
          0
        );
      }

      // Al o después del cierre de jornada (17:00 o posterior)
      if (local.minutesFromMidnight >= workEndMin) {
        cursor = this.fromLocalComponents(
          local.year,
          local.month,
          local.day + 1,
          this.config.startHour,
          this.config.startMinute,
          0,
          0
        );
        continue;
      }

      return cursor;
    }
  }

  /**
   * Calcula la fecha límite sumando horas laborales hábiles y pausas
   */
  public calculateDueAt(
    createdAt: Date,
    priority: Priority,
    slaPausedMinutes: number = 0,
    customSlaHours?: number
  ): Date {
    const hours = customSlaHours ?? SLA_HOURS[priority];
    let remainingMinutes = hours * 60 + Math.max(0, slaPausedMinutes);
    let cursor = this.nextBusinessMoment(createdAt);

    const workEndMin = this.config.endHour * 60 + this.config.endMinute; // 1020 (17:00)
    const lunchStartMin = this.config.lunchStartHour * 60 + this.config.lunchStartMinute; // 780 (13:00)

    while (remainingMinutes > 0) {
      cursor = this.nextBusinessMoment(cursor);
      const local = this.toLocalComponents(cursor);

      // Si estamos en la mañana (08:00 a 13:00)
      let availableChunk = 0;
      if (local.minutesFromMidnight < lunchStartMin) {
        availableChunk = lunchStartMin - local.minutesFromMidnight;
      } else {
        // En la tarde (14:00 a 17:00)
        availableChunk = workEndMin - local.minutesFromMidnight;
      }

      const consumeMinutes = Math.min(remainingMinutes, availableChunk);
      remainingMinutes -= consumeMinutes;

      const newMinFromMidnight = local.minutesFromMidnight + consumeMinutes;
      const newHour = Math.floor(newMinFromMidnight / 60);
      const newMin = Math.floor(newMinFromMidnight % 60);
      const newSec = Math.round((newMinFromMidnight % 1) * 60);

      cursor = this.fromLocalComponents(
        local.year,
        local.month,
        local.day,
        newHour,
        newMin,
        newSec,
        local.ms
      );
    }

    return cursor;
  }

  public calculateBusinessMinutesBetween(start: Date, end: Date): number {
    if (end <= start) return 0;
    let cursor = this.nextBusinessMoment(start);
    let totalMinutes = 0;

    const workEndMin = this.config.endHour * 60 + this.config.endMinute;
    const lunchStartMin = this.config.lunchStartHour * 60 + this.config.lunchStartMinute;

    while (cursor < end) {
      cursor = this.nextBusinessMoment(cursor);
      if (cursor >= end) break;

      const local = this.toLocalComponents(cursor);
      let availableChunk = 0;
      if (local.minutesFromMidnight < lunchStartMin) {
        availableChunk = lunchStartMin - local.minutesFromMidnight;
      } else {
        availableChunk = workEndMin - local.minutesFromMidnight;
      }

      const minutesToEnd = (end.getTime() - cursor.getTime()) / (60 * 1000);
      const consume = Math.min(availableChunk, minutesToEnd);
      totalMinutes += consume;

      cursor = new Date(cursor.getTime() + consume * 60 * 1000);
    }

    return Math.round(totalMinutes);
  }

  public isOverdue(dueAt: Date, status: RequestStatus, now: Date = new Date()): boolean {
    if (['RESUELTA', 'CERRADA', 'CANCELADA'].includes(status)) {
      return false;
    }
    return now.getTime() > dueAt.getTime();
  }
}
