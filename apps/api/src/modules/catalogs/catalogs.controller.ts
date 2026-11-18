import { Request, Response, NextFunction } from 'express';
import {
  createHolidayDtoSchema,
  createServiceCategoryDtoSchema,
  createSpecialtyDtoSchema,
  updateParameterDtoSchema,
  updateServiceCategoryDtoSchema,
  updateSpecialtyDtoSchema,
} from '@servigest/shared';
import { z } from 'zod';
import { CatalogsService } from './catalogs.service.ts';

const idSchema = z.coerce.number().int().positive();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export class CatalogsController {
  constructor(private readonly service: CatalogsService) {}

  public listSpecialties = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      res.status(200).json({ data: await this.service.listSpecialties() });
    } catch (err) {
      next(err);
    }
  };

  public createSpecialty = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const input = createSpecialtyDtoSchema.parse(req.body);
      const specialty = await this.service.createSpecialty(input);
      res.status(201).location(`/api/especialidades/${specialty.id}`).json({ data: specialty });
    } catch (err) {
      next(err);
    }
  };

  public updateSpecialty = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = idSchema.parse(req.params.id);
      const input = updateSpecialtyDtoSchema.parse(req.body);
      res.status(200).json({ data: await this.service.updateSpecialty(id, input) });
    } catch (err) {
      next(err);
    }
  };

  public deactivateSpecialty = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = idSchema.parse(req.params.id);
      await this.service.deactivateSpecialty(id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  public listCategories = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      res.status(200).json({ data: await this.service.listCategories() });
    } catch (err) {
      next(err);
    }
  };

  public createCategory = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const input = createServiceCategoryDtoSchema.parse(req.body);
      const category = await this.service.createCategory(input);
      res
        .status(201)
        .location(`/api/categorias-servicio/${category.id}`)
        .json({ data: category });
    } catch (err) {
      next(err);
    }
  };

  public updateCategory = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = idSchema.parse(req.params.id);
      const input = updateServiceCategoryDtoSchema.parse(req.body);
      res.status(200).json({ data: await this.service.updateCategory(id, input) });
    } catch (err) {
      next(err);
    }
  };

  public deactivateCategory = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = idSchema.parse(req.params.id);
      await this.service.deactivateCategory(id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  public listStatuses = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      res.status(200).json({ data: await this.service.listStatuses() });
    } catch (err) {
      next(err);
    }
  };

  public listParameters = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      res.status(200).json({ data: await this.service.listParameters() });
    } catch (err) {
      next(err);
    }
  };

  public updateParameter = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const input = updateParameterDtoSchema.parse(req.body);
      const actor = res.locals.user as { id: string };
      res
        .status(200)
        .json({ data: await this.service.updateParameter(req.params.key, input, actor.id) });
    } catch (err) {
      next(err);
    }
  };

  public listHolidays = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      res.status(200).json({ data: await this.service.listHolidays() });
    } catch (err) {
      next(err);
    }
  };

  public createHoliday = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const input = createHolidayDtoSchema.parse(req.body);
      const holiday = await this.service.createHoliday(input);
      res.status(201).location(`/api/feriados/${holiday.date}`).json({ data: holiday });
    } catch (err) {
      next(err);
    }
  };

  public deleteHoliday = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const date = dateSchema.parse(req.params.date);
      await this.service.deleteHoliday(date);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}
