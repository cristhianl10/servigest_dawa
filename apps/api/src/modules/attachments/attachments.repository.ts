import { PrismaClient } from '@prisma/client';

export interface AttachmentRecord {
  id: string;
  requestId: string;
  uploadedBy: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  createdAt: Date;
}

export interface CreateAttachmentInput {
  requestId: string;
  uploadedBy: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
}

export interface IAttachmentRepository {
  list(requestId: string): Promise<AttachmentRecord[]>;
  findById(id: string): Promise<AttachmentRecord | null>;
  create(input: CreateAttachmentInput): Promise<AttachmentRecord>;
  delete(id: string): Promise<void>;
}

export class PrismaAttachmentRepository implements IAttachmentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async list(requestId: string): Promise<AttachmentRecord[]> {
    const rows = await this.prisma.requestAttachment.findMany({
      where: { requestId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => ({ ...row }));
  }

  public async findById(id: string): Promise<AttachmentRecord | null> {
    const row = await this.prisma.requestAttachment.findUnique({ where: { id } });
    return row ? { ...row } : null;
  }

  public async create(input: CreateAttachmentInput): Promise<AttachmentRecord> {
    const row = await this.prisma.requestAttachment.create({ data: input });
    return { ...row };
  }

  public async delete(id: string): Promise<void> {
    await this.prisma.requestAttachment.delete({ where: { id } });
  }
}

export class InMemoryAttachmentRepository implements IAttachmentRepository {
  private attachments: AttachmentRecord[];

  constructor(seed: AttachmentRecord[] = []) {
    this.attachments = seed.map((item) => ({ ...item }));
  }

  public async list(requestId: string): Promise<AttachmentRecord[]> {
    return this.attachments
      .filter((item) => item.requestId === requestId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((item) => ({ ...item }));
  }

  public async findById(id: string): Promise<AttachmentRecord | null> {
    const attachment = this.attachments.find((item) => item.id === id);
    return attachment ? { ...attachment } : null;
  }

  public async create(input: CreateAttachmentInput): Promise<AttachmentRecord> {
    const attachment: AttachmentRecord = {
      id: `att-${this.attachments.length + 1}`,
      ...input,
      createdAt: new Date(),
    };
    this.attachments.push(attachment);
    return { ...attachment };
  }

  public async delete(id: string): Promise<void> {
    this.attachments = this.attachments.filter((item) => item.id !== id);
  }
}
