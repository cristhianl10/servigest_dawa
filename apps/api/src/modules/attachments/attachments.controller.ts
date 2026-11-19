import { NextFunction, Request, Response } from 'express';
import type { ActorContext } from '../../domain/state-machine/transitions.ts';
import type { AttachmentRecord } from './attachments.repository.ts';
import { AttachmentsService } from './attachments.service.ts';

function toOutput(attachment: AttachmentRecord) {
  return {
    id: attachment.id,
    requestId: attachment.requestId,
    uploadedBy: attachment.uploadedBy,
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    createdAt: attachment.createdAt,
  };
}

function contentDisposition(fileName: string): string {
  const fallback = fileName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export class AttachmentsController {
  constructor(private readonly service: AttachmentsService) {}

  public upload = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = res.locals.user as ActorContext;
      const attachment = await this.service.upload(req.params.id, req.file, actor);
      res
        .status(201)
        .location(`/api/solicitudes/${req.params.id}/adjuntos/${attachment.id}`)
        .json({ data: toOutput(attachment) });
    } catch (err) {
      next(err);
    }
  };

  public list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = res.locals.user as ActorContext;
      const attachments = await this.service.list(req.params.id, actor);
      res.status(200).json({ data: attachments.map(toOutput) });
    } catch (err) {
      next(err);
    }
  };

  public download = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = res.locals.user as ActorContext;
      const { attachment, content } = await this.service.download(
        req.params.id,
        req.params.attachmentId,
        actor
      );

      res.setHeader('Content-Type', attachment.mimeType);
      res.setHeader('Content-Length', String(content.length));
      res.setHeader('Content-Disposition', contentDisposition(attachment.fileName));
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.status(200).send(content);
    } catch (err) {
      next(err);
    }
  };

  public delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = res.locals.user as ActorContext;
      await this.service.delete(req.params.id, req.params.attachmentId, actor);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}

