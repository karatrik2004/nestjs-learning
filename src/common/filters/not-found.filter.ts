import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  NotFoundException,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch(NotFoundException)
export class NotFoundFilter implements ExceptionFilter {
  catch(_: NotFoundException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const requestedPath = this.escapeHtml(
      request.originalUrl || request.url || '',
    );

    response.status(404).send(`
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
              max-width: 560px;
              border: 1px solid rgba(239, 68, 68, 0.45);
              background: rgba(15, 23, 42, 0.8);
              border-radius: 14px;
              padding: 24px;
            }
            h1 { margin: 0 0 8px; color: #fca5a5; }
            p { margin: 0 0 12px; color: #cbd5e1; }
            code { color: #7dd3fc; }
            a { color: #7dd3fc; text-decoration: none; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>404 - Page Not Found</h1>
            <p>The requested URL was not found:</p>
            <p><code>${requestedPath}</code></p>
            <a href="/">Go to Home</a>
          </div>
        </body>
      </html>
    `);
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
}
