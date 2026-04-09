import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';

@Injectable()
export class SanitizeUserResponseInterceptor implements NestInterceptor {
  intercept(_: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data) => this.sanitize(data)));
  }

  private sanitize(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.sanitize(item));
    }

    if (value && typeof value === 'object') {
      const source = value as Record<string, unknown>;
      const result: Record<string, unknown> = {};
      for (const [key, child] of Object.entries(source)) {
        if (
          key === 'password' ||
          key === 'refreshTokenHash' ||
          key === 'accessToken' ||
          key === 'refreshToken'
        ) {
          continue;
        }
        result[key] = this.sanitize(child);
      }
      return result;
    }

    return value;
  }
}

