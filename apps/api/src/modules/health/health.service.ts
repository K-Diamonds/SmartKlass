import { Injectable } from '@nestjs/common';
import { API_VERSION, APP_NAME } from '@smartklass/shared';
import { PrismaService } from '../../common/database/prisma.service';
import { HealthCheckDto } from './dto/health-check.dto';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthCheckDto> {
    const databaseStatus = await this.checkDatabase();

    return {
      status: databaseStatus === 'ok' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      service: APP_NAME,
      version: API_VERSION,
      checks: {
        database: databaseStatus,
      },
    };
  }

  private async checkDatabase(): Promise<'ok' | 'down'> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'ok';
    } catch {
      return 'down';
    }
  }
}
