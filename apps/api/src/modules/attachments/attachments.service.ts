import { randomUUID } from 'node:crypto';
import path from 'node:path';
import {
  ALLOWED_ATTACHMENT_MIME_TYPES,
  MAX_ATTACHMENT_SIZE_BYTES,
  type RequestStatus,
} from '@servigest/shared';
import type { ActorContext } from '../../domain/state-machine/transitions.ts';
import { DomainError } from '../../domain/errors/domain-error.ts';
import type {
  AttachmentRecord,
  CreateAttachmentInput,
  IAttachmentRepository,
} from './attachments.repository.ts';
import type { IAttachmentStorage } from './attachments.storage.ts';

export interface RequestAccessRecord {
  id: string;
  clientId: string;
  status: RequestStatus;
  assignedTechnicianId?: string | null;
}

export interface IRequestAccessService {
  getRequestById(requestId: string, actor: ActorContext): Promise<RequestAccessRecord>;
}

export interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const EXTENSIONS: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

function detectMimeType(buffer: Buffer): string | null {
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString('ascii') === '%PDF-') {
    return 'application/pdf';
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }

  return null;
}

function sanitizeFileName(fileName: string, extension: string): string {
  const base = path
    .basename(fileName)
    .replace(/[\u0000-\u001f\u007f"\\/]/g, '_')
    .trim()
    .slice(0, 250);
  return base || `adjunto.${extension}`;
}

export class AttachmentsService {
  constructor(
    private readonly repository: IAttachmentRepository,
    private readonly requests: IRequestAccessService,
    private readonly storage: IAttachmentStorage
  ) {}

  public async upload(
    requestId: string,
    file: UploadedFile | undefined,
    actor: ActorContext
  ): Promise<AttachmentRecord> {
    const request = await this.requests.getRequestById(requestId, actor);
    this.assertMutable(request.status);

    if (!file || !file.buffer || file.size <= 0) {
      throw new DomainError(
        'ADJUNTO_INVALIDO',
        422,
        'Debe adjuntar un archivo válido.'
      );
    }

    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      throw new DomainError(
        'ADJUNTO_INVALIDO',
        422,
        'El archivo supera el tamaño máximo de 10 MB.'
      );
    }

    if (
      !ALLOWED_ATTACHMENT_MIME_TYPES.includes(
        file.mimetype as (typeof ALLOWED_ATTACHMENT_MIME_TYPES)[number]
      )
    ) {
      throw new DomainError(
        'ADJUNTO_INVALIDO',
        422,
        'Tipo de archivo no permitido. Use PDF, PNG, JPEG o WebP.'
      );
    }

    const detected = detectMimeType(file.buffer);
    if (!detected || detected !== file.mimetype) {
      throw new DomainError(
        'ADJUNTO_INVALIDO',
        422,
        'El contenido del archivo no coincide con su tipo declarado.'
      );
    }

    const extension = EXTENSIONS[detected];
    const storageKey = `requests/${request.id}/${randomUUID()}.${extension}`;
    const fileName = sanitizeFileName(file.originalname, extension);

    await this.storage.save(storageKey, file.buffer);

    const input: CreateAttachmentInput = {
      requestId: request.id,
      uploadedBy: actor.id,
      fileName,
      mimeType: detected,
      sizeBytes: file.size,
      storageKey,
    };

    try {
      return await this.repository.create(input);
    } catch (err) {
      await this.storage.delete(storageKey);
      throw err;
    }
  }

  public async list(requestId: string, actor: ActorContext): Promise<AttachmentRecord[]> {
    await this.requests.getRequestById(requestId, actor);
    return this.repository.list(requestId);
  }

  public async download(
    requestId: string,
    attachmentId: string,
    actor: ActorContext
  ): Promise<{ attachment: AttachmentRecord; content: Buffer }> {
    await this.requests.getRequestById(requestId, actor);
    const attachment = await this.findAttachment(requestId, attachmentId);
    const content = await this.storage.read(attachment.storageKey);
    return { attachment, content };
  }

  public async delete(
    requestId: string,
    attachmentId: string,
    actor: ActorContext
  ): Promise<void> {
    const request = await this.requests.getRequestById(requestId, actor);
    const attachment = await this.findAttachment(requestId, attachmentId);

    const isManager = actor.role === 'ADMIN' || actor.role === 'COORDINADOR';
    if (!isManager && attachment.uploadedBy !== actor.id) {
      throw new DomainError(
        'SIN_PERMISO',
        403,
        'Solo el autor o un coordinador puede eliminar el adjunto.'
      );
    }

    this.assertMutable(request.status);
    await this.repository.delete(attachment.id);
    await this.storage.delete(attachment.storageKey);
  }

  private async findAttachment(
    requestId: string,
    attachmentId: string
  ): Promise<AttachmentRecord> {
    const attachment = await this.repository.findById(attachmentId);
    if (!attachment || attachment.requestId !== requestId) {
      throw new DomainError('RECURSO_NO_ENCONTRADO', 404, 'Adjunto no encontrado.');
    }
    return attachment;
  }

  private assertMutable(status: RequestStatus): void {
    if (status === 'CERRADA' || status === 'CANCELADA') {
      throw new DomainError(
        'SOLICITUD_CERRADA',
        409,
        'No se pueden modificar adjuntos de una solicitud cerrada.'
      );
    }
  }
}
