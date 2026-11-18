import { Request, Response, NextFunction } from 'express';
import {
  createTechnicianDtoSchema,
  replaceTechnicianSpecialtiesDtoSchema,
  technicianListFilterSchema,
  updateTechnicianDtoSchema,
} from '@servigest/shared';
import type { ActorLike, TechnicianRecord } from './technicians.service.ts';
import { TechniciansService } from './technicians.service.ts';

function toOutput(technician: TechnicianRecord) {
  return {
    id: technician.id,
    userId: technician.userId,
    employeeCode: technician.employeeCode,
    availability: technician.availability,
    maxConcurrentLoad: technician.maxConcurrentLoad,
    activeLoad: technician.activeLoad,
    user: technician.user,
    specialties: technician.specialties,
    createdAt: technician.createdAt,
    updatedAt: technician.updatedAt,
  };
}

export class TechniciansController {
  constructor(private readonly service: TechniciansService) {}

  public list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filter = technicianListFilterSchema.parse(req.query);
      const actor = res.locals.user as ActorLike;
      const result = await this.service.list(filter, actor);
      res.status(200).json({
        data: result.items.map(toOutput),
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
      const technician = await this.service.getById(
        req.params.id,
        res.locals.user as ActorLike
      );
      res.status(200).json({ data: toOutput(technician) });
    } catch (err) {
      next(err);
    }
  };

  public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = createTechnicianDtoSchema.parse(req.body);
      const technician = await this.service.create(input);
      res
        .status(201)
        .location(`/api/tecnicos/${technician.id}`)
        .json({ data: toOutput(technician) });
    } catch (err) {
      next(err);
    }
  };

  public update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = updateTechnicianDtoSchema.parse(req.body);
      const technician = await this.service.update(req.params.id, input);
      res.status(200).json({ data: toOutput(technician) });
    } catch (err) {
      next(err);
    }
  };

  public replaceSpecialties = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const input = replaceTechnicianSpecialtiesDtoSchema.parse(req.body);
      const technician = await this.service.replaceSpecialties(
        req.params.id,
        input.specialties
      );
      res.status(200).json({ data: toOutput(technician) });
    } catch (err) {
      next(err);
    }
  };

  public deactivate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.deactivate(req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  public load = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const load = await this.service.getLoad(req.params.id, res.locals.user as ActorLike);
      res.status(200).json({ data: load });
    } catch (err) {
      next(err);
    }
  };
}
