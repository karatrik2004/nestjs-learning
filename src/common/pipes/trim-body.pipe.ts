import { Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class TrimBodyPipe implements PipeTransform<
  Record<string, unknown>,
  Record<string, unknown>
> {
  transform(value: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, raw] of Object.entries(value ?? {})) {
      result[key] = typeof raw === 'string' ? raw.trim() : raw;
    }
    return result;
  }
}
