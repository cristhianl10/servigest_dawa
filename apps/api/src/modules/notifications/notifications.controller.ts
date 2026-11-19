import { NextFunction, Request, Response } from 'express';
import { notificationListFilterSchema } from '@servigest/shared';
import { sseHub } from '../../infrastructure/sse/sse-hub.ts';
import type { NotificationRecord } from './notifications.repository.ts';
import { NotificationsService } from './notifications.service.ts';

function toOutput(notification: NotificationRecord) {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    requestId: notification.requestId,
    read: notification.readAt !== null,
    readAt: notification.readAt,
    createdAt: notification.createdAt,
  };
}

export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  public list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filter = notificationListFilterSchema.parse(req.query);
      const result = await this.service.list(res.locals.user.id, filter);
      res.status(200).json({
        data: result.items.map(toOutput),
        meta: {
          page: filter.page,
          pageSize: filter.pageSize,
          total: result.total,
          totalPages: Math.ceil(result.total / filter.pageSize),
          unreadCount: result.unreadCount,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  public markRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const notification = await this.service.markRead(
        res.locals.user.id,
        req.params.id
      );
      res.status(200).json({ data: toOutput(notification) });
    } catch (err) {
      next(err);
    }
  };

  public markAllRead = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      await this.service.markAllRead(res.locals.user.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  public stream = (req: Request, res: Response): void => {
    const lastEventId =
      req.header('Last-Event-ID') || (req.query.lastEventId as string | undefined);
    sseHub.registerClient(res.locals.user.id, res, lastEventId);
  };
}
