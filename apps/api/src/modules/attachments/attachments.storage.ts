import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

export interface IAttachmentStorage {
  save(storageKey: string, content: Buffer): Promise<void>;
  read(storageKey: string): Promise<Buffer>;
  delete(storageKey: string): Promise<void>;
}

export class LocalAttachmentStorage implements IAttachmentStorage {
  private readonly root: string;

  constructor(root: string = process.env.STORAGE_LOCAL_PATH || './storage') {
    this.root = path.resolve(root);
  }

  public async save(storageKey: string, content: Buffer): Promise<void> {
    const target = this.resolve(storageKey);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content);
  }

  public read(storageKey: string): Promise<Buffer> {
    return readFile(this.resolve(storageKey));
  }

  public async delete(storageKey: string): Promise<void> {
    try {
      await unlink(this.resolve(storageKey));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
  }

  private resolve(storageKey: string): string {
    const target = path.resolve(this.root, storageKey);
    if (target !== this.root && !target.startsWith(`${this.root}${path.sep}`)) {
      throw new Error('Ruta de almacenamiento inválida.');
    }
    return target;
  }
}

export class InMemoryAttachmentStorage implements IAttachmentStorage {
  public readonly files = new Map<string, Buffer>();

  public async save(storageKey: string, content: Buffer): Promise<void> {
    this.files.set(storageKey, Buffer.from(content));
  }

  public async read(storageKey: string): Promise<Buffer> {
    const content = this.files.get(storageKey);
    if (!content) throw new Error(`Archivo no encontrado: ${storageKey}`);
    return content;
  }

  public async delete(storageKey: string): Promise<void> {
    this.files.delete(storageKey);
  }
}
