import { NextFunction, Request, Response, Router } from 'express';
import multer from 'multer';
import { MAX_ATTACHMENT_SIZE_BYTES } from '@servigest/shared';
import { prisma } from '../../infrastructure/prisma/client.ts';
import { DomainError } from '../../domain/errors/domain-error.ts';
import { authenticate } from '../../presentation/middlewares/auth.ts';
import { AttachmentsController } from './attachments.controller.ts';
import { PrismaAttachmentRepository } from './attachments.repository.ts';
import { AttachmentsService, type IRequestAccessService } from './attachments.service.ts';
import { LocalAttachmentStorage } from './attachments.storage.ts';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_ATTACHMENT_SIZE_BYTES, files: 1 },
});

function parseUpload(req: Request, res: Response, next: NextFunction): void {
  upload.single('file')(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'El archivo supera el tamaño máximo de 10 MB.'
          : 'No fue posible procesar el archivo adjunto.';
      return next(new DomainError('ADJUNTO_INVALIDO', 422, message));
    }
    if (err) return next(err);
    next();
  });
}

export function createAttachmentsRouter(
  requests: IRequestAccessService,
  service?: AttachmentsService
): Router {
  const router = Router({ mergeParams: true });
  const controller = new AttachmentsController(
    service ??
      new AttachmentsService(
        new PrismaAttachmentRepository(prisma),
        requests,
        new LocalAttachmentStorage()
      )
  );

  router.use(authenticate);
  router.get('/', controller.list);
  router.post('/', parseUpload, controller.upload);
  router.get('/:attachmentId', controller.download);
  router.delete('/:attachmentId', controller.delete);

  return router;
}
