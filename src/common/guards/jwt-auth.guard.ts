import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService, type JwtPayload } from '../../modules/auth/auth.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    console.log('[GUARD][STEP G1] JwtAuthGuard check started');
    const http = context.switchToHttp();
    const request = http.getRequest<Request & { user?: JwtPayload }>();
    const response = http.getResponse<Response>();

    const accessToken = this.getCookieValue(request, 'accessToken');
    if (accessToken) {
      const accessPayload =
        await this.authService.verifyAccessToken(accessToken);
      if (accessPayload) {
        console.log('[GUARD][STEP G2] Access token valid, allowing request');
        request.user = accessPayload;
        return true;
      }
      console.log('[GUARD][STEP G2] Access token invalid/expired');
    }

    const refreshToken = this.getCookieValue(request, 'refreshToken');
    if (!refreshToken) {
      console.log('[GUARD][STEP G3] No refresh token, redirecting to /');
      response.redirect(302, '/');
      return false;
    }

    const tokens = await this.authService.refreshTokens(refreshToken);
    if (!tokens) {
      console.log('[GUARD][STEP G3] Refresh failed, clearing cookies');
      response.clearCookie('accessToken');
      response.clearCookie('refreshToken');
      response.redirect(302, '/');
      return false;
    }

    response.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });
    response.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    const refreshedPayload = await this.authService.verifyAccessToken(
      tokens.accessToken,
    );
    if (refreshedPayload) {
      console.log('[GUARD][STEP G4] Refresh success, request allowed');
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
