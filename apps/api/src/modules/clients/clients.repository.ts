import { Prisma, type PrismaClient } from '@prisma/client';
import type {
  ClientListFilter,
  CreateAssetDto,
  CreateClientDto,
  CreateSiteDto,
  UpdateAssetDto,
  UpdateClientDto,
  UpdateSiteDto,
} from '@servigest/shared';
import type {
  AssetRecord,
  ClientListResult,
  ClientRecord,
  ClientSiteRecord,
  IClientRepository,
} from './clients.service.ts';

type PrismaClientLike = Pick<
  PrismaClient,
  'client' | 'clientSite' | 'asset' | 'serviceRequest'
>;

const ACTIVE_STATUSES = ['CERRADA', 'CANCELADA'];

function mapClient(client: {
  id: string;
  ruc: string;
  businessName: string;
  tradeName: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): ClientRecord {
  return {
    id: client.id,
    ruc: client.ruc,
    businessName: client.businessName,
    tradeName: client.tradeName,
    email: client.email,
    phone: client.phone,
    address: client.address,
    status: client.status === 'ACTIVO' ? 'ACTIVO' : 'INACTIVO',
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
  };
}

function mapSite(site: {
  id: string;
  clientId: string;
  name: string;
  address: string;
  city: string;
  contactName: string | null;
  contactPhone: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): ClientSiteRecord {
  return {
    id: site.id,
    clientId: site.clientId,
    name: site.name,
    address: site.address,
    city: site.city,
    contactName: site.contactName,
    contactPhone: site.contactPhone,
    status: site.status === 'ACTIVA' ? 'ACTIVA' : 'INACTIVA',
    createdAt: site.createdAt,
    updatedAt: site.updatedAt,
  };
}

function mapAsset(asset: {
  id: string;
  siteId: string;
  code: string;
  name: string;
  assetType: string | null;
  serialNumber: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): AssetRecord {
  return {
    id: asset.id,
    siteId: asset.siteId,
    code: asset.code,
    name: asset.name,
    assetType: asset.assetType,
    serialNumber: asset.serialNumber,
    status: asset.status === 'OPERATIVO' ? 'OPERATIVO' : 'FUERA_SERVICIO',
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
  };
}

export class PrismaClientRepository implements IClientRepository {
  constructor(private readonly client: PrismaClientLike) {}

  public async listClients(filter: ClientListFilter): Promise<ClientListResult> {
    const where: Prisma.ClientWhereInput = {
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.search
        ? {
            OR: [
              { ruc: { contains: filter.search } },
              { businessName: { contains: filter.search, mode: 'insensitive' } },
              { tradeName: { contains: filter.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.client.client.findMany({
        where,
        orderBy: { businessName: 'asc' },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.client.client.count({ where }),
    ]);

    return { items: rows.map(mapClient), total };
  }

  public async findClientById(id: string): Promise<ClientRecord | null> {
    const client = await this.client.client.findUnique({ where: { id } });
    return client ? mapClient(client) : null;
  }

  public async findClientByRuc(ruc: string): Promise<ClientRecord | null> {
    const client = await this.client.client.findUnique({ where: { ruc } });
    return client ? mapClient(client) : null;
  }

  public async createClient(input: CreateClientDto): Promise<ClientRecord> {
    const client = await this.client.client.create({
      data: {
        ruc: input.ruc,
        businessName: input.businessName,
        tradeName: input.tradeName ?? null,
        email: input.email,
        phone: input.phone ?? null,
        address: input.address ?? null,
      },
    });
    return mapClient(client);
  }

  public async updateClient(id: string, input: UpdateClientDto): Promise<ClientRecord> {
    const client = await this.client.client.update({
      where: { id },
      data: {
        ...(input.ruc !== undefined ? { ruc: input.ruc } : {}),
        ...(input.businessName !== undefined ? { businessName: input.businessName } : {}),
        ...(input.tradeName !== undefined ? { tradeName: input.tradeName } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.address !== undefined ? { address: input.address } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
    });
    return mapClient(client);
  }

  public async hasActiveRequestsByClient(clientId: string): Promise<boolean> {
    const count = await this.client.serviceRequest.count({
      where: { clientId, status: { code: { notIn: ACTIVE_STATUSES } } },
    });
    return count > 0;
  }

  public async hasActiveRequestsBySite(siteId: string): Promise<boolean> {
    const count = await this.client.serviceRequest.count({
      where: { siteId, status: { code: { notIn: ACTIVE_STATUSES } } },
    });
    return count > 0;
  }

  public async listSites(clientId: string): Promise<ClientSiteRecord[]> {
    const rows = await this.client.clientSite.findMany({
      where: { clientId },
      orderBy: { name: 'asc' },
    });
    return rows.map(mapSite);
  }

  public async findSiteById(id: string): Promise<ClientSiteRecord | null> {
    const site = await this.client.clientSite.findUnique({ where: { id } });
    return site ? mapSite(site) : null;
  }

  public async findSiteByName(clientId: string, name: string): Promise<ClientSiteRecord | null> {
    const site = await this.client.clientSite.findFirst({
      where: { clientId, name: { equals: name, mode: 'insensitive' } },
    });
    return site ? mapSite(site) : null;
  }

  public async createSite(clientId: string, input: CreateSiteDto): Promise<ClientSiteRecord> {
    const site = await this.client.clientSite.create({
      data: {
        clientId,
        name: input.name,
        address: input.address,
        city: input.city,
        contactName: input.contactName ?? null,
        contactPhone: input.contactPhone ?? null,
      },
    });
    return mapSite(site);
  }

  public async updateSite(id: string, input: UpdateSiteDto): Promise<ClientSiteRecord> {
    const site = await this.client.clientSite.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.address !== undefined ? { address: input.address } : {}),
        ...(input.city !== undefined ? { city: input.city } : {}),
        ...(input.contactName !== undefined ? { contactName: input.contactName } : {}),
        ...(input.contactPhone !== undefined ? { contactPhone: input.contactPhone } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
    });
    return mapSite(site);
  }

  public async listAssets(siteId: string): Promise<AssetRecord[]> {
    const rows = await this.client.asset.findMany({
      where: { siteId },
      orderBy: { code: 'asc' },
    });
    return rows.map(mapAsset);
  }

  public async findAssetById(id: string): Promise<AssetRecord | null> {
    const asset = await this.client.asset.findUnique({ where: { id } });
    return asset ? mapAsset(asset) : null;
  }

  public async findAssetByCode(siteId: string, code: string): Promise<AssetRecord | null> {
    const asset = await this.client.asset.findFirst({
      where: { siteId, code: { equals: code, mode: 'insensitive' } },
    });
    return asset ? mapAsset(asset) : null;
  }

  public async createAsset(siteId: string, input: CreateAssetDto): Promise<AssetRecord> {
    const asset = await this.client.asset.create({
      data: {
        siteId,
        code: input.code,
        name: input.name,
        assetType: input.assetType ?? null,
        serialNumber: input.serialNumber ?? null,
      },
    });
    return mapAsset(asset);
  }

  public async updateAsset(id: string, input: UpdateAssetDto): Promise<AssetRecord> {
    const asset = await this.client.asset.update({
      where: { id },
      data: {
        ...(input.code !== undefined ? { code: input.code } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.assetType !== undefined ? { assetType: input.assetType } : {}),
        ...(input.serialNumber !== undefined ? { serialNumber: input.serialNumber } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
    });
    return mapAsset(asset);
  }
}

export class InMemoryClientRepository implements IClientRepository {
  public readonly activeClientRequests = new Set<string>();
  public readonly activeSiteRequests = new Set<string>();

  private clients = new Map<string, ClientRecord>();
  private sites = new Map<string, ClientSiteRecord>();
  private assets = new Map<string, AssetRecord>();

  constructor(
    initial: {
      clients?: ClientRecord[];
      sites?: ClientSiteRecord[];
      assets?: AssetRecord[];
    } = {}
  ) {
    for (const client of initial.clients ?? []) this.clients.set(client.id, { ...client });
    for (const site of initial.sites ?? []) this.sites.set(site.id, { ...site });
    for (const asset of initial.assets ?? []) this.assets.set(asset.id, { ...asset });
  }

  public async listClients(filter: ClientListFilter): Promise<ClientListResult> {
    const search = filter.search?.toLowerCase();
    const rows = Array.from(this.clients.values())
      .filter((client) => !filter.status || client.status === filter.status)
      .filter(
        (client) =>
          !search ||
          client.ruc.includes(search) ||
          client.businessName.toLowerCase().includes(search) ||
          (client.tradeName ?? '').toLowerCase().includes(search)
      )
      .sort((a, b) => a.businessName.localeCompare(b.businessName));

    const start = (filter.page - 1) * filter.pageSize;
    return {
      items: rows.slice(start, start + filter.pageSize).map((client) => ({ ...client })),
      total: rows.length,
    };
  }

  public async findClientById(id: string): Promise<ClientRecord | null> {
    const client = this.clients.get(id);
    return client ? { ...client } : null;
  }

  public async findClientByRuc(ruc: string): Promise<ClientRecord | null> {
    for (const client of this.clients.values()) {
      if (client.ruc === ruc) return { ...client };
    }
    return null;
  }

  public async createClient(input: CreateClientDto): Promise<ClientRecord> {
    const now = new Date();
    const client: ClientRecord = {
      id: `cli-${now.getTime()}-${Math.random().toString(36).substring(2, 7)}`,
      ruc: input.ruc,
      businessName: input.businessName,
      tradeName: input.tradeName ?? null,
      email: input.email,
      phone: input.phone ?? null,
      address: input.address ?? null,
      status: 'ACTIVO',
      createdAt: now,
      updatedAt: now,
    };
    this.clients.set(client.id, client);
    return { ...client };
  }

  public async updateClient(id: string, input: UpdateClientDto): Promise<ClientRecord> {
    const client = this.clients.get(id);
    if (!client) throw new Error('CLIENTE_NO_ENCONTRADO');
    Object.assign(client, input, { updatedAt: new Date() });
    return { ...client };
  }

  public async hasActiveRequestsByClient(clientId: string): Promise<boolean> {
    return this.activeClientRequests.has(clientId);
  }

  public async hasActiveRequestsBySite(siteId: string): Promise<boolean> {
    return this.activeSiteRequests.has(siteId);
  }

  public async listSites(clientId: string): Promise<ClientSiteRecord[]> {
    return Array.from(this.sites.values())
      .filter((site) => site.clientId === clientId)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((site) => ({ ...site }));
  }

  public async findSiteById(id: string): Promise<ClientSiteRecord | null> {
    const site = this.sites.get(id);
    return site ? { ...site } : null;
  }

  public async findSiteByName(clientId: string, name: string): Promise<ClientSiteRecord | null> {
    for (const site of this.sites.values()) {
      if (site.clientId === clientId && site.name.toLowerCase() === name.toLowerCase()) {
        return { ...site };
      }
    }
    return null;
  }

  public async createSite(clientId: string, input: CreateSiteDto): Promise<ClientSiteRecord> {
    const now = new Date();
    const site: ClientSiteRecord = {
      id: `site-${now.getTime()}-${Math.random().toString(36).substring(2, 7)}`,
      clientId,
      name: input.name,
      address: input.address,
      city: input.city,
      contactName: input.contactName ?? null,
      contactPhone: input.contactPhone ?? null,
      status: 'ACTIVA',
      createdAt: now,
      updatedAt: now,
    };
    this.sites.set(site.id, site);
    return { ...site };
  }

  public async updateSite(id: string, input: UpdateSiteDto): Promise<ClientSiteRecord> {
    const site = this.sites.get(id);
    if (!site) throw new Error('SEDE_NO_ENCONTRADA');
    Object.assign(site, input, { updatedAt: new Date() });
    return { ...site };
  }

  public async listAssets(siteId: string): Promise<AssetRecord[]> {
    return Array.from(this.assets.values())
      .filter((asset) => asset.siteId === siteId)
      .sort((a, b) => a.code.localeCompare(b.code))
      .map((asset) => ({ ...asset }));
  }

  public async findAssetById(id: string): Promise<AssetRecord | null> {
    const asset = this.assets.get(id);
    return asset ? { ...asset } : null;
  }

  public async findAssetByCode(siteId: string, code: string): Promise<AssetRecord | null> {
    for (const asset of this.assets.values()) {
      if (asset.siteId === siteId && asset.code.toLowerCase() === code.toLowerCase()) {
        return { ...asset };
      }
    }
    return null;
  }

  public async createAsset(siteId: string, input: CreateAssetDto): Promise<AssetRecord> {
    const now = new Date();
    const asset: AssetRecord = {
      id: `asset-${now.getTime()}-${Math.random().toString(36).substring(2, 7)}`,
      siteId,
      code: input.code,
      name: input.name,
      assetType: input.assetType ?? null,
      serialNumber: input.serialNumber ?? null,
      status: 'OPERATIVO',
      createdAt: now,
      updatedAt: now,
    };
    this.assets.set(asset.id, asset);
    return { ...asset };
  }

  public async updateAsset(id: string, input: UpdateAssetDto): Promise<AssetRecord> {
    const asset = this.assets.get(id);
    if (!asset) throw new Error('EQUIPO_NO_ENCONTRADO');
    Object.assign(asset, input, { updatedAt: new Date() });
    return { ...asset };
  }
}
