import { NextFunction, Request, Response } from 'express';
import { dashboardQuerySchema } from '@servigest/shared';
import type { DashboardActor } from './dashboard.service.ts';
import { DashboardService } from './dashboard.service.ts';

export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  public overview = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const query = dashboardQuerySchema.parse(req.query);
      const data = await this.service.getOverview(query);
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  };

  public technicianLoad = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const data = await this.service.getTechnicianLoad();
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  };

  public evolution = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const query = dashboardQuerySchema.parse(req.query);
      const data = await this.service.getEvolution(query);
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  };

  public mySummary = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const query = dashboardQuerySchema.parse(req.query);
      const actor = res.locals.user as DashboardActor;
      const data = await this.service.getMySummary(actor, query);
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  };
}
