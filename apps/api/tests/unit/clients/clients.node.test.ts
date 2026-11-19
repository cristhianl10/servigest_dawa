import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ClientsService } from '../../../src/modules/clients/clients.service.ts';
import { ClientsController } from '../../../src/modules/clients/clients.controller.ts';
import { InMemoryClientRepository } from '../../../src/modules/clients/clients.repository.ts';
import { DomainError } from '../../../src/domain/errors/domain-error.ts';
import type { AssetRecord, ClientRecord, ClientSiteRecord } from '../../../src/modules/clients/clients.service.ts';

describe('Módulo de Clientes, Sedes y Equipos (TC-CLI)', () => {
  function createFixture() {
    const now = new Date('2026-11-01T10:00:00Z');
    const client: ClientRecord = {
      id: 'cli-1',
      ruc: '0992345678001',
      businessName: 'Banco de Guayaquil S.A.',
      tradeName: 'Banco Guayaquil',
      email: 'contacto@bancoguayaquil.com',
      phone: '042599999',
      address: 'Pichincha y P. Icaza',
      status: 'ACTIVO',
      createdAt: now,
      updatedAt: now,
    };
    const site: ClientSiteRecord = {
      id: 'site-1',
      clientId: 'cli-1',
      name: 'Matriz Centro',
      address: 'Pichincha 107',
      city: 'Guayaquil',
      contactName: 'Carlos Benites',
      contactPhone: '0991112233',
      status: 'ACTIVA',
      createdAt: now,
      updatedAt: now,
    };
    const asset: AssetRecord = {
      id: 'asset-1',
      siteId: 'site-1',
      code: 'SRV-01',
      name: 'Servidor Principal',
      assetType: 'Servidor',
      serialNumber: 'SN-001',
      status: 'OPERATIVO',
      createdAt: now,
      updatedAt: now,
    };

    const repository = new InMemoryClientRepository({
      clients: [client],
      sites: [site],
      assets: [asset],
    });
    const service = new ClientsService(repository);
    return { repository, service, client, site, asset };
  }

  it('TC-CLI-01: lista y busca clientes con paginación', async () => {
    const { service } = createFixture();

    const all = await service.listClients({ page: 1, pageSize: 20 });
    assert.strictEqual(all.total, 1);
    assert.strictEqual(all.items[0].ruc, '0992345678001');

    const search = await service.listClients({ page: 1, pageSize: 20, search: 'guayaquil' });
    assert.strictEqual(search.total, 1);

    const none = await service.listClients({ page: 1, pageSize: 20, status: 'INACTIVO' });
    assert.strictEqual(none.total, 0);
  });

  it('TC-CLI-02: rechaza RUC duplicado con 409 CLIENTE_DUPLICADO', async () => {
    const { service } = createFixture();

    await assert.rejects(
      async () =>
        service.createClient({
          ruc: '0992345678001',
          businessName: 'Otra Empresa',
          email: 'otra@empresa.ec',
        }),
      (err: any) => err instanceof DomainError && err.code === 'CLIENTE_DUPLICADO'
    );
  });

  it('TC-CLI-03: crea cliente, sede y equipo con unicidad', async () => {
    const { service } = createFixture();

    const client = await service.createClient({
      ruc: '0991234567001',
      businessName: 'Corporación Favorita C.A.',
      email: 'servicios@favorita.ec',
    });
    assert.strictEqual(client.status, 'ACTIVO');

    const site = await service.createSite(client.id, {
      name: 'Hipermercado Policentro',
      address: 'Av. Kennedy',
      city: 'Guayaquil',
    });
    assert.strictEqual(site.status, 'ACTIVA');

    await assert.rejects(
      async () =>
        service.createSite(client.id, {
          name: 'Hipermercado Policentro',
          address: 'Otra dirección',
          city: 'Guayaquil',
        }),
      (err: any) => err instanceof DomainError && err.code === 'ENTIDAD_EN_USO'
    );

    const asset = await service.createAsset(site.id, {
      code: 'UPS-01',
      name: 'UPS Principal',
      assetType: 'UPS',
    });
    assert.strictEqual(asset.siteId, site.id);

    await assert.rejects(
      async () =>
        service.createAsset(site.id, {
          code: 'UPS-01',
          name: 'UPS Duplicada',
        }),
      (err: any) => err instanceof DomainError && err.code === 'ENTIDAD_EN_USO'
    );
  });

  it('TC-CLI-04: bloquea baja de cliente o sede con solicitudes activas', async () => {
    const { service, repository } = createFixture();

    repository.activeClientRequests.add('cli-1');
    await assert.rejects(
      async () => service.deactivateClient('cli-1'),
      (err: any) => err instanceof DomainError && err.code === 'ENTIDAD_EN_USO'
    );

    repository.activeClientRequests.delete('cli-1');
    repository.activeSiteRequests.add('site-1');
    await assert.rejects(
      async () => service.deactivateSite('site-1'),
      (err: any) => err instanceof DomainError && err.code === 'ENTIDAD_EN_USO'
    );
  });

  it('TC-CLI-05: baja lógica de cliente y actualización de equipo', async () => {
    const { service } = createFixture();

    const updated = await service.updateAsset('asset-1', {
      status: 'FUERA_SERVICIO',
      name: 'Servidor Principal (revisión)',
    });
    assert.strictEqual(updated.status, 'FUERA_SERVICIO');

    await service.deactivateClient('cli-1');
    const client = await service.getClient('cli-1');
    assert.strictEqual(client.status, 'INACTIVO');
  });

  it('TC-CLI-07: CLIENTE solo accede a equipos de sus propias sedes', async () => {
    const { service } = createFixture();
    const controller = new ClientsController(service);

    const call = async (clientId: string) => {
      let error: unknown;
      let statusCode = 0;
      let payload: unknown;
      const res = {
        locals: { user: { id: 'user-1', role: 'CLIENTE', clientId } },
        status(code: number) {
          statusCode = code;
          return this;
        },
        json(body: unknown) {
          payload = body;
          return this;
        },
      };

      await controller.listAssets(
        { params: { id: 'site-1' } } as any,
        res as any,
        ((err?: unknown) => {
          error = err;
        }) as any
      );

      return { error, statusCode, payload };
    };

    const forbidden = await call('cli-otro');
    assert.ok(forbidden.error instanceof DomainError);
    assert.strictEqual((forbidden.error as DomainError).httpStatus, 404);

    const allowed = await call('cli-1');
    assert.strictEqual(allowed.error, undefined);
    assert.strictEqual(allowed.statusCode, 200);
    assert.strictEqual((allowed.payload as { data: unknown[] }).data.length, 1);
  });

  it('TC-CLI-06: detalle de cliente incluye sus sedes', async () => {
    const { service } = createFixture();

    const client = await service.getClient('cli-1');
    const sites = await service.listSites(client.id);
    assert.strictEqual(sites.length, 1);
    assert.strictEqual(sites[0].name, 'Matriz Centro');

    const assets = await service.listAssets(sites[0].id);
    assert.strictEqual(assets.length, 1);
  });
});
