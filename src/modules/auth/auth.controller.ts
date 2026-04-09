import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { ApiResponseEnvelopeInterceptor } from '../../common/interceptors/api-response-envelope.interceptor';
import { SanitizeUserResponseInterceptor } from '../../common/interceptors/sanitize-user-response.interceptor';
import { TrimBodyPipe } from '../../common/pipes/trim-body.pipe';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  async showLogin(@Req() req: Request, @Res() res: Response): Promise<void> {
    console.log('[AUTH][STEP 1] GET / requested');
    const hasSession = await this.hasValidSession(req, res);
    if (hasSession) {
      console.log(
        '[AUTH][STEP 2] Active session found, redirecting to /dashboard',
      );
      res.redirect(302, '/dashboard');
      return;
    }
    console.log('[AUTH][STEP 2] No active session, rendering login page');
    res.status(200).send(this.renderLoginPage());
  }

  @Get('login')
  showLoginAlias(@Res() res: Response): void {
    res.status(404).send(`
      <html>
        <head>
          <title>404 - Page Not Found</title>
          <style>
            body {
              margin: 0;
              min-height: 100vh;
              display: grid;
              place-items: center;
              font-family: Inter, Arial, sans-serif;
              background: #0f172a;
              color: #e2e8f0;
              padding: 20px;
            }
            .card {
              width: 100%;
              max-width: 520px;
              border: 1px solid rgba(239, 68, 68, 0.4);
              background: rgba(15, 23, 42, 0.75);
              border-radius: 14px;
              padding: 24px;
            }
            h1 { margin: 0 0 8px; color: #fca5a5; }
            p { margin: 0 0 14px; color: #cbd5e1; }
            a { color: #7dd3fc; text-decoration: none; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>404 - Page Not Found</h1>
            <p>The page <code>/login</code> does not exist in this app.</p>
            <a href="/">Go to Login Page</a>
          </div>
        </body>
      </html>
    `);
  }

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async login(
    @Body(TrimBodyPipe) body: LoginDto,
    @Res() res: Response,
  ): Promise<void> {
    console.log('res', res);
    console.log('[AUTH][STEP 3] POST /login received');
    const email = body.email.trim();
    const password = body.password;

    const user = await this.authService.validateUserCredentials(
      email,
      password,
    );
    if (!user) {
      console.log('[AUTH][STEP 5] Login failed: invalid credentials');
      res
        .status(401)
        .send(this.renderLoginPage('Invalid email or password.', email));
      return;
    }

    const userRole = await this.authService.getUserRoleName(user);
    const canLoginBackend = await this.authService.isBackendRole(userRole);
    if (!canLoginBackend) {
      res
        .status(403)
        .send(
          this.renderLoginPage(
            'This account does not have backend access. Please use frontend login.',
            email,
          ),
        );
      return;
    }

    const tokens = await this.authService.generateTokens(user);
    console.log('[AUTH][STEP 6] Tokens generated, setting cookies');
    this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    console.log('[AUTH][STEP 7] Login success, redirecting to /dashboard');
    res.redirect(303, '/dashboard');
  }

  @Post('app/login')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseInterceptors(
    SanitizeUserResponseInterceptor,
    ApiResponseEnvelopeInterceptor,
  )
  async appLogin(
    @Body(TrimBodyPipe) body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<unknown> {
    const email = body.email.trim();
    const password = body.password;
    const user = await this.authService.validateUserCredentials(email, password);
    if (!user) {
      res.status(401);
      return { message: 'Invalid email or password' };
    }

    const tokens = await this.authService.generateTokens(user);
    this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    return {
      message: 'App login success',
      user: {
        id: user.id,
        email: user.email,
        role: await this.authService.getUserRoleName(user),
      },
      // Intentionally included to show sanitize interceptor behavior.
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  @Post('refresh')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @UseInterceptors(ApiResponseEnvelopeInterceptor)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<unknown> {
    console.log('[AUTH][STEP R1] POST /refresh received');
    const refreshToken = this.getCookieValue(req, 'refreshToken');
    if (!refreshToken) {
      console.log('[AUTH][STEP R2] Refresh failed: no refresh token cookie');
      res.status(401);
      return { message: 'Unauthorized' };
    }

    const tokens = await this.authService.refreshTokens(refreshToken);
    if (!tokens) {
      console.log('[AUTH][STEP R2] Refresh failed: token invalid or expired');
      this.clearAuthCookies(res);
      res.status(401);
      return { message: 'Unauthorized' };
    }

    console.log('[AUTH][STEP R3] Refresh success, rotating cookies');
    this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    return { message: 'Token refreshed' };
  }

  @Get('logout')
  async logout(@Req() req: Request, @Res() res: Response): Promise<void> {
    console.log('[AUTH][STEP L1] GET /logout received');
    const refreshToken = this.getCookieValue(req, 'refreshToken');
    if (refreshToken) {
      const userId =
        await this.authService.getUserIdFromRefreshToken(refreshToken);
      if (userId) {
        console.log(
          `[AUTH][STEP L2] Clearing refresh token hash for userId=${userId}`,
        );
        await this.authService.clearRefreshToken(userId);
      }
    }

    console.log('[AUTH][STEP L3] Clearing auth cookies and redirecting to /');
    this.clearAuthCookies(res);
    res.redirect(302, '/');
  }

  private renderLoginPage(errorMessage?: string, email = ''): string {
    const safeEmail = this.escapeHtml(email);
    const errorBlock = errorMessage
      ? `<div class="error-box">${this.escapeHtml(errorMessage)}</div>`
      : '';

    return `
      <html>
        <head>
          <title>Admin Login</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              min-height: 100vh;
              display: grid;
              place-items: center;
              font-family: Inter, Arial, sans-serif;
              background:
                radial-gradient(circle at 10% 20%, rgba(56, 189, 248, 0.32), transparent 35%),
                radial-gradient(circle at 85% 15%, rgba(96, 165, 250, 0.25), transparent 30%),
                linear-gradient(135deg, #0b1220, #111827 60%, #0f172a);
              color: #e2e8f0;
              padding: 20px;
            }
            .card {
              width: 100%;
              max-width: 430px;
              border: 1px solid rgba(148, 163, 184, 0.25);
              background: rgba(15, 23, 42, 0.7);
              backdrop-filter: blur(12px);
              border-radius: 18px;
              padding: 28px 26px;
              box-shadow: 0 25px 50px rgba(2, 6, 23, 0.45);
            }
            .badge {
              display: inline-block;
              margin-bottom: 12px;
              padding: 6px 10px;
              border-radius: 999px;
              font-size: 12px;
              letter-spacing: 0.4px;
              color: #bae6fd;
              background: rgba(14, 116, 144, 0.32);
              border: 1px solid rgba(56, 189, 248, 0.35);
            }
            h1 {
              margin: 0 0 6px;
              font-size: 28px;
              color: #f8fafc;
            }
            .subtitle {
              margin: 0 0 22px;
              color: #94a3b8;
              font-size: 14px;
            }
            label {
              display: block;
              margin-bottom: 6px;
              font-size: 14px;
              color: #cbd5e1;
            }
            input {
              width: 100%;
              height: 44px;
              padding: 0 13px;
              margin-bottom: 15px;
              border-radius: 10px;
              border: 1px solid rgba(148, 163, 184, 0.35);
              background: rgba(15, 23, 42, 0.55);
              color: #f8fafc;
              outline: none;
              font-size: 14px;
            }
            input::placeholder { color: #64748b; }
            input:focus {
              border-color: #38bdf8;
              box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.18);
            }
            button {
              width: 100%;
              height: 44px;
              border: none;
              border-radius: 10px;
              font-size: 14px;
              font-weight: 700;
              color: #0f172a;
              background: linear-gradient(90deg, #38bdf8, #22d3ee);
              cursor: pointer;
              transition: transform 0.15s ease, box-shadow 0.15s ease;
            }
            button:hover {
              transform: translateY(-1px);
              box-shadow: 0 10px 20px rgba(34, 211, 238, 0.28);
            }
            .footer-note {
              margin-top: 12px;
              font-size: 12px;
              color: #64748b;
              text-align: center;
            }
            .error-box {
              margin-bottom: 14px;
              padding: 10px 12px;
              border-radius: 10px;
              color: #fecaca;
              background: rgba(127, 29, 29, 0.35);
              border: 1px solid rgba(239, 68, 68, 0.45);
              font-size: 13px;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <span class="badge">Secure Access</span>
            <h1>Admin Login</h1>
            <p class="subtitle">Sign in to access the admin panel</p>
            ${errorBlock}
            <form method="post" action="/login">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value="${safeEmail}"
                placeholder="admin@example.com"
                autocomplete="email"
                required
              />
              <label>Password</label>
              <input
                type="password"
                name="password"
                placeholder="Enter password"
                autocomplete="current-password"
                minlength="6"
                required
              />
              <button type="submit">Login</button>
            </form>
            <p class="footer-note">NestJS + PostgreSQL demo authentication</p>
          </div>
        </body>
      </html>
    `;
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  private async hasValidSession(req: Request, res: Response): Promise<boolean> {
    console.log('[AUTH][SESSION] Checking session from cookies');
    const accessToken = this.getCookieValue(req, 'accessToken');
    if (accessToken) {
      const accessPayload =
        await this.authService.verifyAccessToken(accessToken);
      if (accessPayload) {
        const canLoginBackend = await this.authService.isBackendRole(
          accessPayload.role,
        );
        if (canLoginBackend) {
          console.log('[AUTH][SESSION] Access token valid for admin panel');
          return true;
        }
        console.log('[AUTH][SESSION] Access token valid but role is not admin');
      }
      console.log('[AUTH][SESSION] Access token invalid/expired');
    }

    // Keep login-page session check lightweight.
    // Refresh flow remains in JwtAuthGuard (protected routes) and POST /refresh.
    const refreshToken = this.getCookieValue(req, 'refreshToken');
    if (refreshToken) {
      console.log(
        '[AUTH][SESSION] Refresh token exists, defer refresh to guard/refresh endpoint',
      );
    } else {
      console.log('[AUTH][SESSION] No refresh token cookie');
    }
    this.clearAuthCookies(res);
    return false;
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

  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ): void {
    const isProd = (process.env.NODE_ENV ?? '').toLowerCase() === 'production';
    const sameSite = isProd ? 'strict' : 'lax';

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite,
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  private clearAuthCookies(res: Response): void {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
  }
}
