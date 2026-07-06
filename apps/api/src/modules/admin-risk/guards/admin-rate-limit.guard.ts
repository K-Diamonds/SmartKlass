import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  RATE_LIMIT_STORE,
  type RateLimitStore,
} from '../rate-limit/rate-limit.store';

@Injectable()
export class AdminRateLimitGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    @Inject(RATE_LIMIT_STORE) private readonly store: RateLimitStore,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
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

    const result = await this.store.consume(key, maxRequests, windowMs);

    if (!result.allowed) {
      throw new HttpException(
        'Admin rate limit exceeded. Try again shortly.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
