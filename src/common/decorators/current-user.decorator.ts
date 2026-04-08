import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { JwtPayload } from '../../modules/auth/auth.service';

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): JwtPayload | null => {
    const req = ctx.switchToHttp().getRequest<{ user?: JwtPayload }>();
    return req.user ?? null;
  },
);
