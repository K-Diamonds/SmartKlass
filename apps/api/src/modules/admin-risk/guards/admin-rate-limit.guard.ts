import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type RateBucket = {
  count: number;
  resetAt: number;
};

@Injectable()
export class AdminRateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, RateBucket>();

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      ip?: string;
      headers?: Record<string, string | string[] | undefined>;
      user?: { id: string; impersonatorId?: string };
    }>();

    const maxRequests =
      this.configService.get<number>('adminRateLimit.maxRequests') ?? 120;
    const windowMs =
      this.configService.get<number>('adminRateLimit.windowMs') ?? 60_000;

    const actorId = request.user?.impersonatorId ?? request.user?.id ?? 'anon';
    const forwarded = request.headers?.['x-forwarded-for'];
    const forwardedIp = Array.isArray(forwarded)
      ? forwarded[0]
      : forwarded?.split(',')[0]?.trim();
    const ip = forwardedIp ?? request.ip ?? 'unknown';
    const key = `${actorId}:${ip}`;
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }

    if (bucket.count >= maxRequests) {
      throw new HttpException(
        'Admin rate limit exceeded. Try again shortly.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    bucket.count += 1;
    return true;
  }
}
