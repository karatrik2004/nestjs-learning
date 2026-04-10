import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthCookieService } from '../../modules/auth/auth-cookie.service';
import { AuthService, type JwtPayload } from '../../modules/auth/auth.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly authService: AuthService,
    private readonly authCookies: AuthCookieService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    this.logger.debug('JwtAuthGuard check started');
    const http = context.switchToHttp();
    const request = http.getRequest<Request & { user?: JwtPayload }>();
    const response = http.getResponse<Response>();

    const accessToken = this.getCookieValue(request, 'accessToken');
    if (accessToken) {
      const accessPayload =
        await this.authService.verifyAccessToken(accessToken);
      if (accessPayload) {
        this.logger.debug('Access token valid, allowing request');
        request.user = accessPayload;
        return true;
      }
      this.logger.debug('Access token invalid/expired');
    }

    const refreshToken = this.getCookieValue(request, 'refreshToken');
    if (!refreshToken) {
      this.logger.debug('No refresh token, redirecting to /');
      response.redirect(302, '/');
      return false;
    }

    const tokens = await this.authService.refreshTokens(refreshToken);
    if (!tokens) {
      this.logger.debug('Refresh failed, clearing cookies');
      this.authCookies.clearAuthCookies(response);
      response.redirect(302, '/');
      return false;
    }

    this.authCookies.setAuthCookies(
      response,
      tokens.accessToken,
      tokens.refreshToken,
    );
    const refreshedPayload = await this.authService.verifyAccessToken(
      tokens.accessToken,
    );
    if (refreshedPayload) {
      this.logger.debug('Refresh success, request allowed');
      request.user = refreshedPayload;
    }

    return true;
  }

  private getCookieValue(req: Request, name: string): string | null {
    const cookieHeader = req.headers.cookie ?? '';
    const parts = cookieHeader.split(';');
    for (const rawPart of parts) {
      const part = rawPart.trim();
      if (part.startsWith(`${name}=`)) {
        const value = part.slice(name.length + 1);
        return decodeURIComponent(value);
      }
    }
    return null;
  }
}
