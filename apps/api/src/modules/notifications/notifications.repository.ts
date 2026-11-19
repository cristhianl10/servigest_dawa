import { PrismaClient } from '@prisma/client';
import type { NotificationListFilter, NotificationType } from '@servigest/shared';

export interface NotificationRecord {
  id: string;
  userId: string;
  requestId: string | null;
  type: NotificationType;
  title: string;
  body: string;
  readAt: Date | null;
  createdAt: Date;
}

export interface NotificationListResult {
  items: NotificationRecord[];
  total: number;
  unreadCount: number;
}

export interface INotificationRepository {
  list(userId: string, filter: NotificationListFilter): Promise<NotificationListResult>;
  findById(id: string): Promise<NotificationRecord | null>;
  markRead(id: string, readAt: Date): Promise<NotificationRecord>;
  markAllRead(userId: string, readAt: Date): Promise<number>;
}

function toRecord(row: {
  id: string;
  userId: string;
  requestId: string | null;
  type: string;
  title: string;
  body: string;
  readAt: Date | null;
  createdAt: Date;
}): NotificationRecord {
  return {
    id: row.id,
    userId: row.userId,
    requestId: row.requestId,
    type: row.type as NotificationType,
    title: row.title,
    body: row.body,
    readAt: row.readAt,
    createdAt: row.createdAt,
  };
}

export class PrismaNotificationRepository implements INotificationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async list(
    userId: string,
    filter: NotificationListFilter
  ): Promise<NotificationListResult> {
    const where = {
      userId,
      ...(filter.unread ? { readAt: null } : {}),
    };

    const [rows, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);

    return { items: rows.map(toRecord), total, unreadCount };
  }

  public async findById(id: string): Promise<NotificationRecord | null> {
    const row = await this.prisma.notification.findUnique({ where: { id } });
    return row ? toRecord(row) : null;
  }

  public async markRead(id: string, readAt: Date): Promise<NotificationRecord> {
    const row = await this.prisma.notification.update({
      where: { id },
      data: { readAt },
    });
    return toRecord(row);
  }

  public async markAllRead(userId: string, readAt: Date): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt },
    });
    return result.count;
  }
}

export interface SeedNotification {
  id: string;
  userId: string;
  requestId?: string | null;
  type: NotificationType;
  title: string;
  body: string;
  readAt?: Date | null;
  createdAt: Date;
}

export class InMemoryNotificationRepository implements INotificationRepository {
  private notifications: NotificationRecord[];

  constructor(seed: SeedNotification[] = []) {
    this.notifications = seed.map((item) => ({
      id: item.id,
      userId: item.userId,
      requestId: item.requestId ?? null,
      type: item.type,
      title: item.title,
      body: item.body,
      readAt: item.readAt ?? null,
      createdAt: item.createdAt,
    }));
  }

  public async list(
    userId: string,
    filter: NotificationListFilter
  ): Promise<NotificationListResult> {
    const own = this.notifications.filter((item) => item.userId === userId);
    const filtered = filter.unread ? own.filter((item) => item.readAt === null) : own;
    const sorted = [...filtered].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
    const start = (filter.page - 1) * filter.pageSize;

    return {
      items: sorted.slice(start, start + filter.pageSize),
      total: sorted.length,
      unreadCount: own.filter((item) => item.readAt === null).length,
    };
  }

  public async findById(id: string): Promise<NotificationRecord | null> {
    return this.notifications.find((item) => item.id === id) ?? null;
  }

  public async markRead(id: string, readAt: Date): Promise<NotificationRecord> {
    const notification = this.notifications.find((item) => item.id === id);
    if (!notification) {
      throw new Error(`Notification ${id} not found`);
    }
    notification.readAt = readAt;
    return notification;
  }

  public async markAllRead(userId: string, readAt: Date): Promise<number> {
    let count = 0;
    for (const item of this.notifications) {
      if (item.userId === userId && item.readAt === null) {
        item.readAt = readAt;
        count++;
      }
    }
    return count;
  }
}
