import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, _: Response, next: NextFunction): void {
    const now = new Date().toISOString();
    this.logger.log(`${now} ${req.method} ${req.originalUrl}`);
    next();
  }
}
