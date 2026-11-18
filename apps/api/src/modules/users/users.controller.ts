import { Request, Response, NextFunction } from 'express';
import { createUserDtoSchema, updateUserDtoSchema, userListFilterSchema } from '@servigest/shared';
import type { UserRecord } from './users.service.ts';
import { UsersService } from './users.service.ts';

export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  public list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filter = userListFilterSchema.parse(req.query);
      const result = await this.usersService.list(filter);
      const totalPages = Math.ceil(result.total / filter.pageSize);

      res.status(200).json({
        data: result.items.map(this.toOutput),
        meta: {
          page: filter.page,
          pageSize: filter.pageSize,
          total: result.total,
          totalPages,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  public getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.usersService.getById(req.params.id);
      res.status(200).json({ data: this.toOutput(user) });
    } catch (err) {
      next(err);
    }
  };

  public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = createUserDtoSchema.parse(req.body);
      const user = await this.usersService.create(input);
      res.status(201).location(`/api/usuarios/${user.id}`).json({ data: this.toOutput(user) });
    } catch (err) {
      next(err);
    }
  };

  public update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = updateUserDtoSchema.parse(req.body);
      const user = await this.usersService.update(req.params.id, input);
      res.status(200).json({ data: this.toOutput(user) });
    } catch (err) {
      next(err);
    }
  };

  public deactivate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.usersService.deactivate(req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  public roles = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json({ data: this.usersService.listRoles() });
    } catch (err) {
      next(err);
    }
  };

  private toOutput(user: UserRecord) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone ?? null,
      role: user.role,
      clientId: user.clientId,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
      lastLoginAt: user.lastLoginAt ?? null,
      createdAt: user.createdAt,
    };
  }
}
