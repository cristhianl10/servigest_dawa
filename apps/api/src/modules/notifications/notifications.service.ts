import type { NotificationListFilter } from '@servigest/shared';
import { DomainError } from '../../domain/errors/domain-error.ts';
import type {
  INotificationRepository,
  NotificationListResult,
  NotificationRecord,
} from './notifications.repository.ts';

export class NotificationsService {
  constructor(private readonly repository: INotificationRepository) {}

  public list(userId: string, filter: NotificationListFilter): Promise<NotificationListResult> {
    return this.repository.list(userId, filter);
  }

  public async markRead(
    userId: string,
    notificationId: string,
    now: Date = new Date()
  ): Promise<NotificationRecord> {
    const notification = await this.repository.findById(notificationId);
    if (!notification || notification.userId !== userId) {
      throw new DomainError(
        'RECURSO_NO_ENCONTRADO',
        404,
        'La notificación no existe.'
      );
    }

    if (notification.readAt) {
      return notification;
    }

    return this.repository.markRead(notification.id, now);
  }

  public async markAllRead(userId: string, now: Date = new Date()): Promise<number> {
    return this.repository.markAllRead(userId, now);
  }
}
