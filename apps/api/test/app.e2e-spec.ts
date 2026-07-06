import { INestApplication, RequestMethod, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/common/database/prisma.service';
import { GlobalExceptionFilter } from './../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from './../src/common/interceptors/response.interceptor';

describe('SmartKlass API (e2e)', () => {
  let app: INestApplication<App>;

  const prismaMock: Partial<PrismaService> = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $queryRaw: jest.fn().mockResolvedValue([{ '1': 1 }]),
    course: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    } as PrismaService['course'],
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication({ rawBody: true });
    app.setGlobalPrefix('api/v1', {
      exclude: [{ path: '', method: RequestMethod.GET }],
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET / returns API metadata', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect(
        (response: {
          body: {
            success: boolean;
            data: { name: string; api: string; health: string };
          };
        }) => {
          expect(response.body.success).toBe(true);
          expect(response.body.data.name).toBe('SmartKlass API');
          expect(response.body.data.api).toBe('/api/v1');
        },
      );
  });

  it('GET /api/v1/health', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect(
        (response: {
          body: { success: boolean; data: { status: string; service: string } };
        }) => {
          expect(response.body.success).toBe(true);
          expect(response.body.data.status).toBe('ok');
          expect(response.body.data.service).toBe('SmartKlass');
        },
      );
  });

  it('GET /api/v1/courses returns published course listing', () => {
    return request(app.getHttpServer())
      .get('/api/v1/courses')
      .expect(200)
      .expect(
        (response: {
          body: { success: boolean; data: unknown[]; meta: { total: number } };
        }) => {
          expect(response.body.success).toBe(true);
          expect(Array.isArray(response.body.data)).toBe(true);
          expect(response.body.meta.total).toBe(0);
        },
      );
  });
});
