import type { NotificationEvent } from '@servigest/shared';

export interface SseWritable {
  write(chunk: string): boolean;
  writableEnded?: boolean;
  setHeader?(name: string, value: string): void;
  flushHeaders?(): void;
  on?(event: string, listener: () => void): void;
}

export interface SseClient {
  userId: string;
  res: SseWritable;
  lastEventId?: string;
}

export class SseHub {
  private static instance: SseHub;
  private clients: Map<string, Set<SseWritable>> = new Map();
  private eventHistory: Map<string, NotificationEvent> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private currentEventCounter: number = 1000;

  private constructor() {
    this.startHeartbeat();
  }

  public static getInstance(): SseHub {
    if (!SseHub.instance) {
      SseHub.instance = new SseHub();
    }
    return SseHub.instance;
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      for (const [_, connectionSet] of this.clients.entries()) {
        for (const res of connectionSet) {
          if (!res.writableEnded) {
            res.write(': ping\n\n');
          }
        }
      }
    }, 25000);
    this.heartbeatInterval.unref?.();
  }

  public registerClient(userId: string, res: SseWritable, lastEventId?: string): void {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    const userClients = this.clients.get(userId)!;
    userClients.add(res);

    res.setHeader?.('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader?.('Cache-Control', 'no-cache, no-transform');
    res.setHeader?.('Connection', 'keep-alive');
    res.setHeader?.('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    res.write('event: ready\ndata: {"status":"connected"}\n\n');

    if (lastEventId) {
      this.replayEventsAfter(userId, lastEventId, res);
    }

    res.on?.('close', () => {
      this.removeClient(userId, res);
    });
  }

  public removeClient(userId: string, res: SseWritable): void {
    const userClients = this.clients.get(userId);
    if (userClients) {
      userClients.delete(res);
      if (userClients.size === 0) {
        this.clients.delete(userId);
      }
    }
  }

  public publishToUsers(userIds: string[], event: NotificationEvent): void {
    this.currentEventCounter++;
    const sseEventId = String(this.currentEventCounter);

    this.eventHistory.set(sseEventId, event);
    if (this.eventHistory.size > 200) {
      const oldestKey = this.eventHistory.keys().next().value;
      if (oldestKey) this.eventHistory.delete(oldestKey);
    }

    const payload = `id: ${sseEventId}\nevent: notification\ndata: ${JSON.stringify(event)}\n\n`;

    for (const userId of userIds) {
      const userConnections = this.clients.get(userId);
      if (userConnections) {
        for (const res of userConnections) {
          if (!res.writableEnded) {
            res.write(payload);
          }
        }
      }
    }
  }

  private replayEventsAfter(_userId: string, lastEventId: string, res: SseWritable): void {
    const lastIdNum = parseInt(lastEventId, 10);
    if (isNaN(lastIdNum)) return;

    for (const [idStr, event] of this.eventHistory.entries()) {
      const idNum = parseInt(idStr, 10);
      if (idNum > lastIdNum) {
        res.write(`id: ${idStr}\nevent: notification\ndata: ${JSON.stringify(event)}\n\n`);
      }
    }
  }

  public getActiveConnectionsCount(): number {
    let total = 0;
    for (const set of this.clients.values()) {
      total += set.size;
    }
    return total;
  }

  public destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.clients.clear();
  }
}

export const sseHub = SseHub.getInstance();
