import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../common/database/prisma.service';
import { MetricsService } from '../../common/observability/metrics.service';
import { OutboxService } from '../../common/outbox/outbox.service';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;

  const prismaMock = {
    $queryRaw: jest.fn().mockResolvedValue([{ '1': 1 }]),
  };

  const outboxMock = {
    getPendingCount: jest.fn().mockResolvedValue(0),
    getFailedCount: jest.fn().mockResolvedValue(0),
  };

  const metricsMock = {
    snapshot: jest.fn().mockReturnValue({ counters: {}, histograms: {} }),
    toPrometheus: jest.fn().mockReturnValue('# metrics\n'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        HealthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: OutboxService, useValue: outboxMock },
        { provide: MetricsService, useValue: metricsMock },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('returns ok health status', async () => {
    const result = await controller.getHealth();

    expect(result.status).toBe('ok');
    expect(result.service).toBe('SmartKlass');
    expect(result.checks.database).toBe('ok');
  });
});
