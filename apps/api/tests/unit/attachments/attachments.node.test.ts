import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AttachmentsService } from '../../../src/modules/attachments/attachments.service.ts';
import {
  InMemoryAttachmentRepository,
  type AttachmentRecord,
} from '../../../src/modules/attachments/attachments.repository.ts';
import { InMemoryAttachmentStorage } from '../../../src/modules/attachments/attachments.storage.ts';
import { DomainError } from '../../../src/domain/errors/domain-error.ts';
import type { ActorContext } from '../../../src/domain/state-machine/transitions.ts';
import type { RequestStatus } from '@servigest/shared';

const CLIENT_ACTOR: ActorContext = { id: 'usr-client', role: 'CLIENTE', clientId: 'cli-1' };
const OTHER_CLIENT: ActorContext = { id: 'usr-other', role: 'CLIENTE', clientId: 'cli-2' };
const COORDINATOR: ActorContext = { id: 'usr-coord', role: 'COORDINADOR' };

function pdf(extra = 'contenido'): Buffer {
  return Buffer.from(`%PDF-1.7\n${extra}\n%%EOF`);
}

function uploadedPdf(overrides: Partial<{ originalname: string; mimetype: string }> = {}) {
  const buffer = pdf();
  return {
    originalname: 'evidencia.pdf',
    mimetype: 'application/pdf',
    size: buffer.length,
    buffer,
    ...overrides,
  };
}

describe('Módulo de Adjuntos (TC-ADJ)', () => {
  function createFixture(status: RequestStatus = 'EN_PROCESO') {
    const requests: Record<string, { id: string; clientId: string; status: RequestStatus; assignedTechnicianId: string | null }> = {
      'req-1': {
        id: 'req-1',
        clientId: 'cli-1',
        status,
        assignedTechnicianId: 'tec-1',
      },
    };

    const requestAccess = {
      async getRequestById(requestId: string, actor: ActorContext) {
        const request = requests[requestId];
        if (!request) {
          throw new DomainError('RECURSO_NO_ENCONTRADO', 404, 'Solicitud no encontrada.');
        }
        if (actor.role === 'CLIENTE' && request.clientId !== actor.clientId) {
          throw new DomainError('RECURSO_NO_ENCONTRADO', 404, 'Solicitud no encontrada.');
        }
        return request;
      },
    };

    const repository = new InMemoryAttachmentRepository();
    const storage = new InMemoryAttachmentStorage();
    const service = new AttachmentsService(repository, requestAccess, storage);
    return { service, repository, storage, requests };
  }

  it('TC-ADJ-01: sube un PDF válido con clave aleatoria y metadatos', async () => {
    const { service, storage } = createFixture();
    const file = uploadedPdf();

    const attachment = await service.upload('req-1', file, CLIENT_ACTOR);
    assert.strictEqual(attachment.requestId, 'req-1');
    assert.strictEqual(attachment.uploadedBy, 'usr-client');
    assert.strictEqual(attachment.mimeType, 'application/pdf');
    assert.strictEqual(attachment.sizeBytes, file.size);
    assert.match(attachment.storageKey, /^requests\/req-1\/[0-9a-f-]+\.pdf$/);
    assert.strictEqual(storage.files.get(attachment.storageKey)?.toString(), file.buffer.toString());
  });

  it('TC-ADJ-02: sanea el nombre del archivo y conserva el original saneado', async () => {
    const { service } = createFixture();
    const attachment = await service.upload(
      'req-1',
      uploadedPdf({ originalname: '../../factura\\rara.pdf' }),
      CLIENT_ACTOR
    );

    assert.strictEqual(attachment.fileName, 'factura_rara.pdf');
  });

  it('TC-ADJ-03: rechaza MIME no permitido, contenido falso o archivo vacío', async () => {
    const { service } = createFixture();

    await assert.rejects(
      async () =>
        service.upload(
          'req-1',
          uploadedPdf({ mimetype: 'text/plain', originalname: 'nota.txt' }),
          CLIENT_ACTOR
        ),
      (err: any) => err instanceof DomainError && err.code === 'ADJUNTO_INVALIDO'
    );

    await assert.rejects(
      async () =>
        service.upload(
          'req-1',
          uploadedPdf({ mimetype: 'image/png', originalname: 'falsa.png' }),
          CLIENT_ACTOR
        ),
      (err: any) => err instanceof DomainError && err.code === 'ADJUNTO_INVALIDO'
    );

    await assert.rejects(
      async () =>
        service.upload(
          'req-1',
          { originalname: 'vacio.pdf', mimetype: 'application/pdf', size: 0, buffer: Buffer.alloc(0) },
          CLIENT_ACTOR
        ),
      (err: any) => err instanceof DomainError && err.code === 'ADJUNTO_INVALIDO'
    );
  });

  it('TC-ADJ-04: rechaza archivos mayores a 10 MB', async () => {
    const { service, storage } = createFixture();
    const buffer = pdf();

    await assert.rejects(
      async () =>
        service.upload(
          'req-1',
          {
            originalname: 'grande.pdf',
            mimetype: 'application/pdf',
            size: 10 * 1024 * 1024 + 1,
            buffer,
          },
          CLIENT_ACTOR
        ),
      (err: any) => err instanceof DomainError && err.code === 'ADJUNTO_INVALIDO'
    );
    assert.strictEqual(storage.files.size, 0);
  });

  it('TC-ADJ-05: no permite adjuntar a solicitudes cerradas o canceladas', async () => {
    for (const status of ['CERRADA', 'CANCELADA'] as const) {
      const { service, storage } = createFixture(status);

      await assert.rejects(
        async () => service.upload('req-1', uploadedPdf(), CLIENT_ACTOR),
        (err: any) => err instanceof DomainError && err.code === 'SOLICITUD_CERRADA'
      );
      assert.strictEqual(storage.files.size, 0);
    }
  });

  it('TC-ADJ-06: lista y descarga solo con acceso a la solicitud', async () => {
    const { service } = createFixture();
    const file = uploadedPdf();
    const attachment = await service.upload('req-1', file, CLIENT_ACTOR);

    const list = await service.list('req-1', CLIENT_ACTOR);
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].id, attachment.id);

    const download = await service.download('req-1', attachment.id, CLIENT_ACTOR);
    assert.strictEqual(download.content.toString(), file.buffer.toString());

    await assert.rejects(
      async () => service.list('req-1', OTHER_CLIENT),
      (err: any) => err instanceof DomainError && err.code === 'RECURSO_NO_ENCONTRADO'
    );

    await assert.rejects(
      async () => service.download('req-1', 'no-existe', CLIENT_ACTOR),
      (err: any) => err instanceof DomainError && err.code === 'RECURSO_NO_ENCONTRADO'
    );
  });

  it('TC-ADJ-07: solo el autor o un coordinador elimina un adjunto', async () => {
    const { service, storage } = createFixture();
    const attachment = await service.upload('req-1', uploadedPdf(), CLIENT_ACTOR);

    await assert.rejects(
      async () => service.delete('req-1', attachment.id, OTHER_CLIENT),
      (err: any) => err instanceof DomainError && err.code === 'RECURSO_NO_ENCONTRADO'
    );

    const sameClientOtherUser: ActorContext = {
      id: 'usr-another',
      role: 'CLIENTE',
      clientId: 'cli-1',
    };
    await assert.rejects(
      async () => service.delete('req-1', attachment.id, sameClientOtherUser),
      (err: any) => err instanceof DomainError && err.code === 'SIN_PERMISO'
    );

    await service.delete('req-1', attachment.id, COORDINATOR);
    assert.strictEqual((await service.list('req-1', CLIENT_ACTOR)).length, 0);
    assert.strictEqual(storage.files.size, 0);
  });

  it('TC-ADJ-08: bloquea eliminación cuando la solicitud ya está cerrada', async () => {
    const { service, requests } = createFixture();
    const attachment = await service.upload('req-1', uploadedPdf(), CLIENT_ACTOR);
    requests['req-1'].status = 'CERRADA';

    await assert.rejects(
      async () => service.delete('req-1', attachment.id, COORDINATOR),
      (err: any) => err instanceof DomainError && err.code === 'SOLICITUD_CERRADA'
    );
  });

  it('TC-ADJ-09: no permite descargar un adjunto de otra solicitud', async () => {
    const { service, repository } = createFixture();
    const foreign: AttachmentRecord = {
      id: 'att-foreign',
      requestId: 'req-2',
      uploadedBy: 'usr-x',
      fileName: 'otro.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 10,
      storageKey: 'requests/req-2/x.pdf',
      createdAt: new Date(),
    };
    await repository.create(foreign);

    await assert.rejects(
      async () => service.download('req-1', 'att-foreign', CLIENT_ACTOR),
      (err: any) => err instanceof DomainError && err.code === 'RECURSO_NO_ENCONTRADO'
    );
  });
});
