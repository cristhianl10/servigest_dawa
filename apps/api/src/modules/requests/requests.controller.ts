import { Request, Response, NextFunction } from 'express';
import { RequestsService } from './requests.service.ts';
import {
  createRequestDtoSchema,
  editRequestDtoSchema,
  transitionDtoSchema,
  reopenRequestDtoSchema,
  assignTechnicianDtoSchema,
  requestListFilterSchema,
} from '@servigest/shared';

export class RequestsController {
  private readonly service: RequestsService;

  constructor(service: RequestsService) {
    this.service = service;
  }

  public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = createRequestDtoSchema.parse(req.body);
      const actor = res.locals.user;
      const request = await this.service.createRequest(validated, actor);

      res.status(201).json({
        data: request,
      });
    } catch (err) {
      next(err);
    }
  };

  public list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validatedFilter = requestListFilterSchema.parse(req.query);
      const actor = res.locals.user;
      const result = await this.service.listRequests(actor, validatedFilter);

      res.status(200).json({
        data: result.data,
        meta: {
          page: validatedFilter.page,
          pageSize: validatedFilter.pageSize,
          total: result.total,
          totalPages: Math.ceil(result.total / validatedFilter.pageSize) || 1,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  public update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = editRequestDtoSchema.parse(req.body);
      const actor = res.locals.user;
      const request = await this.service.editRequest(req.params.id, validated, actor);

      res.status(200).json({
        data: request,
      });
    } catch (err) {
      next(err);
    }
  };

  public reopen = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = reopenRequestDtoSchema.parse(req.body);
      const actor = res.locals.user;
      const request = await this.service.reopenRequest(req.params.id, validated, actor);

      res.status(200).json({
        data: request,
      });
    } catch (err) {
      next(err);
    }
  };

  public getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = res.locals.user;
      const request = await this.service.getRequestById(req.params.id, actor);

      res.status(200).json({
        data: request,
      });
    } catch (err) {
      next(err);
    }
  };

  public transition = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = transitionDtoSchema.parse(req.body);
      const actor = res.locals.user;
      const updated = await this.service.transitionStatus(req.params.id, validated, actor);

      res.status(200).json({
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  };

  public assign = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = assignTechnicianDtoSchema.parse(req.body);
      const actor = res.locals.user;
      const assignment = await this.service.assignTechnician(req.params.id, validated, actor);

      res.status(201).json({
        data: assignment,
      });
    } catch (err) {
      next(err);
    }
  };

  public getHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = res.locals.user;
      const history = await this.service.getHistory(req.params.id, actor);

      res.status(200).json({
        data: history,
      });
    } catch (err) {
      next(err);
    }
  };
}
