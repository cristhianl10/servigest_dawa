import type {
  ClientListFilter,
  CreateAssetDto,
  CreateClientDto,
  CreateSiteDto,
  UpdateAssetDto,
  UpdateClientDto,
  UpdateSiteDto,
} from '@servigest/shared';
import { DomainError } from '../../domain/errors/domain-error.ts';

export interface ClientRecord {
  id: string;
  ruc: string;
  businessName: string;
  tradeName: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  status: 'ACTIVO' | 'INACTIVO';
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientSiteRecord {
  id: string;
  clientId: string;
  name: string;
  address: string;
  city: string;
  contactName: string | null;
  contactPhone: string | null;
  status: 'ACTIVA' | 'INACTIVA';
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetRecord {
  id: string;
  siteId: string;
  code: string;
  name: string;
  assetType: string | null;
  serialNumber: string | null;
  status: 'OPERATIVO' | 'FUERA_SERVICIO';
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientListResult {
  items: ClientRecord[];
  total: number;
}

export interface IClientRepository {
  listClients(filter: ClientListFilter): Promise<ClientListResult>;
  findClientById(id: string): Promise<ClientRecord | null>;
  findClientByRuc(ruc: string): Promise<ClientRecord | null>;
  createClient(input: CreateClientDto): Promise<ClientRecord>;
  updateClient(id: string, input: UpdateClientDto): Promise<ClientRecord>;
  hasActiveRequestsByClient(clientId: string): Promise<boolean>;
  hasActiveRequestsBySite(siteId: string): Promise<boolean>;

  listSites(clientId: string): Promise<ClientSiteRecord[]>;
  findSiteById(id: string): Promise<ClientSiteRecord | null>;
  findSiteByName(clientId: string, name: string): Promise<ClientSiteRecord | null>;
  createSite(clientId: string, input: CreateSiteDto): Promise<ClientSiteRecord>;
  updateSite(id: string, input: UpdateSiteDto): Promise<ClientSiteRecord>;

  listAssets(siteId: string): Promise<AssetRecord[]>;
  findAssetById(id: string): Promise<AssetRecord | null>;
  findAssetByCode(siteId: string, code: string): Promise<AssetRecord | null>;
  createAsset(siteId: string, input: CreateAssetDto): Promise<AssetRecord>;
  updateAsset(id: string, input: UpdateAssetDto): Promise<AssetRecord>;
}

export class ClientsService {
  constructor(private readonly repository: IClientRepository) {}

  public async listClients(filter: ClientListFilter): Promise<ClientListResult> {
    return this.repository.listClients(filter);
  }

  public async getClient(id: string): Promise<ClientRecord> {
    const client = await this.repository.findClientById(id);
    if (!client) {
      throw new DomainError('RECURSO_NO_ENCONTRADO', 404, 'Cliente no encontrado.');
    }
    return client;
  }

  public async createClient(input: CreateClientDto): Promise<ClientRecord> {
    const existing = await this.repository.findClientByRuc(input.ruc);
    if (existing) {
      throw new DomainError('CLIENTE_DUPLICADO', 409, 'El RUC ya se encuentra registrado.');
    }
    return this.repository.createClient({
      ...input,
      email: input.email.trim().toLowerCase(),
      businessName: input.businessName.trim(),
    });
  }

  public async updateClient(id: string, input: UpdateClientDto): Promise<ClientRecord> {
    await this.getClient(id);

    if (input.ruc) {
      const existing = await this.repository.findClientByRuc(input.ruc);
      if (existing && existing.id !== id) {
        throw new DomainError('CLIENTE_DUPLICADO', 409, 'El RUC ya se encuentra registrado.');
      }
    }

    return this.repository.updateClient(id, {
      ...input,
      ...(input.email !== undefined ? { email: input.email.trim().toLowerCase() } : {}),
      ...(input.businessName !== undefined ? { businessName: input.businessName.trim() } : {}),
    });
  }

  public async deactivateClient(id: string): Promise<void> {
    const client = await this.getClient(id);
    if (client.status === 'INACTIVO') return;

    if (await this.repository.hasActiveRequestsByClient(id)) {
      throw new DomainError(
        'ENTIDAD_EN_USO',
        409,
        'El cliente tiene solicitudes activas y no puede darse de baja.'
      );
    }

    await this.repository.updateClient(id, { status: 'INACTIVO' });
  }

  public async listSites(clientId: string): Promise<ClientSiteRecord[]> {
    await this.getClient(clientId);
    return this.repository.listSites(clientId);
  }


  public async createSite(clientId: string, input: CreateSiteDto): Promise<ClientSiteRecord> {
    await this.getClient(clientId);

    const duplicated = await this.repository.findSiteByName(clientId, input.name.trim());
    if (duplicated) {
      throw new DomainError(
        'ENTIDAD_EN_USO',
        409,
        'Ya existe una sede con ese nombre para el cliente.'
      );
    }

    return this.repository.createSite(clientId, { ...input, name: input.name.trim() });
  }

  public async updateSite(id: string, input: UpdateSiteDto): Promise<ClientSiteRecord> {
    const site = await this.repository.findSiteById(id);
    if (!site) {
      throw new DomainError('RECURSO_NO_ENCONTRADO', 404, 'Sede no encontrada.');
    }

    if (input.name) {
      const duplicated = await this.repository.findSiteByName(site.clientId, input.name.trim());
      if (duplicated && duplicated.id !== id) {
        throw new DomainError(
          'ENTIDAD_EN_USO',
          409,
          'Ya existe una sede con ese nombre para el cliente.'
        );
      }
    }

    return this.repository.updateSite(id, {
      ...input,
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
    });
  }

  public async deactivateSite(id: string): Promise<void> {
    const site = await this.repository.findSiteById(id);
    if (!site) {
      throw new DomainError('RECURSO_NO_ENCONTRADO', 404, 'Sede no encontrada.');
    }
    if (site.status === 'INACTIVA') return;

    if (await this.repository.hasActiveRequestsBySite(id)) {
      throw new DomainError(
        'ENTIDAD_EN_USO',
        409,
        'La sede tiene solicitudes activas y no puede darse de baja.'
      );
    }

    await this.repository.updateSite(id, { status: 'INACTIVA' });
  }

  public async listAssets(siteId: string): Promise<AssetRecord[]> {
    await this.getSite(siteId);
    return this.repository.listAssets(siteId);
  }

  public async createAsset(siteId: string, input: CreateAssetDto): Promise<AssetRecord> {
    await this.getSite(siteId);

    const duplicated = await this.repository.findAssetByCode(siteId, input.code.trim());
    if (duplicated) {
      throw new DomainError(
        'ENTIDAD_EN_USO',
        409,
        'Ya existe un equipo con ese código en la sede.'
      );
    }

    return this.repository.createAsset(siteId, {
      ...input,
      code: input.code.trim(),
      name: input.name.trim(),
    });
  }

  public async updateAsset(id: string, input: UpdateAssetDto): Promise<AssetRecord> {
    const asset = await this.repository.findAssetById(id);
    if (!asset) {
      throw new DomainError('RECURSO_NO_ENCONTRADO', 404, 'Equipo no encontrado.');
    }

    if (input.code) {
      const duplicated = await this.repository.findAssetByCode(asset.siteId, input.code.trim());
      if (duplicated && duplicated.id !== id) {
        throw new DomainError(
          'ENTIDAD_EN_USO',
          409,
          'Ya existe un equipo con ese código en la sede.'
        );
      }
    }

    return this.repository.updateAsset(id, {
      ...input,
      ...(input.code !== undefined ? { code: input.code.trim() } : {}),
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
    });
  }

  public async getSite(id: string): Promise<ClientSiteRecord> {
    const site = await this.repository.findSiteById(id);
    if (!site) {
      throw new DomainError('RECURSO_NO_ENCONTRADO', 404, 'Sede no encontrada.');
    }
    return site;
  }
}
