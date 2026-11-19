import { z } from 'zod';

export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
] as const;

export type AllowedAttachmentMimeType = (typeof ALLOWED_ATTACHMENT_MIME_TYPES)[number];

export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;

export const attachmentSchema = z.object({
  id: z.string(),
  requestId: z.string(),
  uploadedBy: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  createdAt: z.string(),
});

export type Attachment = z.infer<typeof attachmentSchema>;
