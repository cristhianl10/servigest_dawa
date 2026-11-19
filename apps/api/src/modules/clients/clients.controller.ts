import { Request, Response, NextFunction } from 'express';
import {
  clientListFilterSchema,
  createAssetDtoSchema,
  createClientDtoSchema,
  createSiteDtoSchema,
  updateAssetDtoSchema,
  updateClientDtoSchema,
  updateSiteDtoSchema,
} from '@servigest/shared';
import { DomainError } from '../../domain/errors/domain-error.ts';
import type { AssetRecord, ClientRecord, ClientSiteRecord } from './clients.service.ts';
import { ClientsService } from './clients.service.ts';

function toClient(client: ClientRecord) {
  return {
    id: client.id,
    ruc: client.ruc,
    businessName: client.businessName,
    tradeName: client.tradeName,
    email: client.email,
    phone: client.phone,
    address: client.address,
    status: client.status,
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
  };
}

function toSite(site: ClientSiteRecord) {
  return {
    id: site.id,
    clientId: site.clientId,
    name: site.name,
    address: site.address,
    city: site.city,
    contactName: site.contactName,
    contactPhone: site.contactPhone,
    status: site.status,
    createdAt: site.createdAt,
    updatedAt: site.updatedAt,
  };
}

function toAsset(asset: AssetRecord) {
  return {
    id: asset.id,
    siteId: asset.siteId,
    code: asset.code,
    name: asset.name,
    assetType: asset.assetType,
    serialNumber: asset.serialNumber,
    status: asset.status,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
  };
}

export class ClientsController {
  constructor(private readonly service: ClientsService) {}

  public list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filter = clientListFilterSchema.parse(req.query);
      const result = await this.service.listClients(filter);
      res.status(200).json({
        data: result.items.map(toClient),
        meta: {
          page: filter.page,
          pageSize: filter.pageSize,
          total: result.total,
          totalPages: Math.ceil(result.total / filter.pageSize),
        },
      });
    } catch (err) {
      next(err);
    }
  };

  public getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      this.assertClientAccess(res, req.params.id);
      const client = await this.service.getClient(req.params.id);
      const sites = await this.service.listSites(client.id);
      res.status(200).json({ data: { ...toClient(client), sites: sites.map(toSite) } });
    } catch (err) {
      next(err);
    }
  };

  public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = createClientDtoSchema.parse(req.body);
      const client = await this.service.createClient(input);
      res.status(201).location(`/api/clientes/${client.id}`).json({ data: toClient(client) });
    } catch (err) {
      next(err);
    }
  };

  public update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = updateClientDtoSchema.parse(req.body);
      const client = await this.service.updateClient(req.params.id, input);
      res.status(200).json({ data: toClient(client) });
    } catch (err) {
      next(err);
    }
  };

  public deactivate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.deactivateClient(req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  public listSites = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      this.assertClientAccess(res, req.params.id);
      const sites = await this.service.listSites(req.params.id);
      res.status(200).json({ data: sites.map(toSite) });
    } catch (err) {
      next(err);
    }
  };

  public createSite = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = createSiteDtoSchema.parse(req.body);
      const site = await this.service.createSite(req.params.id, input);
      res.status(201).location(`/api/sedes/${site.id}`).json({ data: toSite(site) });
    } catch (err) {
      next(err);
    }
  };

  public updateSite = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = updateSiteDtoSchema.parse(req.body);
      const site = await this.service.updateSite(req.params.id, input);
      res.status(200).json({ data: toSite(site) });
    } catch (err) {
      next(err);
    }
  };

  public deactivateSite = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.deactivateSite(req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  public listAssets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const site = await this.service.getSite(req.params.id);
      this.assertClientAccess(res, site.clientId);
      const assets = await this.service.listAssets(req.params.id);
      res.status(200).json({ data: assets.map(toAsset) });
    } catch (err) {
      next(err);
    }
  };

  public createAsset = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = createAssetDtoSchema.parse(req.body);
      const asset = await this.service.createAsset(req.params.id, input);
      res.status(201).location(`/api/equipos/${asset.id}`).json({ data: toAsset(asset) });
    } catch (err) {
      next(err);
    }
  };

  public updateAsset = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = updateAssetDtoSchema.parse(req.body);
      const asset = await this.service.updateAsset(req.params.id, input);
      res.status(200).json({ data: toAsset(asset) });
    } catch (err) {
      next(err);
    }
  };

  private assertClientAccess(res: Response, clientId: string): void {
    const user = res.locals.user;
    if (user?.role === 'CLIENTE' && user.clientId !== clientId) {
      throw new DomainError('RECURSO_NO_ENCONTRADO', 404, 'Cliente no encontrado.');
    }
  }
}
