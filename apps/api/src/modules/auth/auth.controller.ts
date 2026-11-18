import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service.ts';
import {
  changePasswordDtoSchema,
  forgotPasswordDtoSchema,
  loginDtoSchema,
  resetPasswordDtoSchema,
  updateProfileDtoSchema,
} from '@servigest/shared';

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  public login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = loginDtoSchema.parse(req.body);
      const result = await this.authService.login(validated.email, validated.password);

      // Cookie segura para Refresh Token (NFR-SEG-02 / ADR-003)
      res.cookie('refresh_token', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api/auth',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
      });

      res.status(200).json({
        data: {
          accessToken: result.accessToken,
          expiresIn: result.expiresIn,
          user: result.user,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  public refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawToken = req.cookies?.refresh_token;
      const result = await this.authService.refresh(rawToken);

      // Rotación de cookie
      res.cookie('refresh_token', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api/auth',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({
        data: {
          accessToken: result.accessToken,
          expiresIn: result.expiresIn,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  public logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawToken = req.cookies?.refresh_token;
      await this.authService.logout(rawToken);

      res.clearCookie('refresh_token', { path: '/api/auth' });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  public me = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const currentUser = res.locals.user;
      const user = await this.authService.getMe(currentUser.id);
      res.status(200).json({ data: this.toProfile(user) });
    } catch (err) {
      next(err);
    }
  };

  public updateMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const currentUser = res.locals.user;
      const input = updateProfileDtoSchema.parse(req.body);
      const user = await this.authService.updateProfile(currentUser.id, input);
      res.status(200).json({ data: this.toProfile(user) });
    } catch (err) {
      next(err);
    }
  };

  public changePassword = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const currentUser = res.locals.user;
      const input = changePasswordDtoSchema.parse(req.body);
      await this.authService.changePassword(
        currentUser.id,
        input.currentPassword,
        input.newPassword
      );
      res.clearCookie('refresh_token', { path: '/api/auth' });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  public forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = forgotPasswordDtoSchema.parse(req.body);
      await this.authService.forgotPassword(input.email);
      res.status(202).json({
        data: { message: 'Si el correo existe, se enviaron instrucciones.' },
      });
    } catch (err) {
      next(err);
    }
  };

  public resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = resetPasswordDtoSchema.parse(req.body);
      await this.authService.resetPassword(input.token, input.newPassword);
      res.status(200).json({ data: { message: 'Contraseña actualizada correctamente.' } });
    } catch (err) {
      next(err);
    }
  };

  private toProfile(user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    phone?: string | null;
    clientId: string | null;
    mustChangePassword: boolean;
  }) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      phone: user.phone ?? null,
      clientId: user.clientId ?? null,
      mustChangePassword: user.mustChangePassword,
    };
  }
}
