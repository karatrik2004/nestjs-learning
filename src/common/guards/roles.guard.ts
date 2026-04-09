import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../../modules/auth/auth.service';
import {
  BACKEND_ACCESS_POLICY,
  ROLES_KEY,
} from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: { role?: string } }>();
    const currentRole = request.user?.role;
    if (!currentRole) {
      return false;
    }

    const normalizedCurrentRole = this.normalize(currentRole);

    for (const requiredRole of requiredRoles) {
      if (requiredRole === BACKEND_ACCESS_POLICY) {
        const canAccessBackend =
          await this.authService.isBackendRole(currentRole);
        if (canAccessBackend) {
          return true;
        }
        continue;
      }

      if (this.normalize(requiredRole) === normalizedCurrentRole) {
        return true;
      }
    }

    return false;
  }

  private normalize(value: string): string {
    return value.trim().toLowerCase().replaceAll('_', ' ').replace(/\s+/g, ' ');
  }
}

