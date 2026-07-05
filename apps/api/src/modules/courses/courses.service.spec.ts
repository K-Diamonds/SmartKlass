import { ConflictException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { CourseStatus } from '@smartklass/database';
import { CourseOwnershipService } from '../../common/courses/course-ownership.service';
import { PrismaService } from '../../common/database/prisma.service';
import { CoursesService } from './courses.service';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('CoursesService', () => {
  let service: CoursesService;

  const prismaMock = {
    course: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const ownershipMock = {
    assertOwnsCourse: jest.fn(),
    getCourseOrThrow: jest.fn(),
  };

  const configMock = {
    get: jest.fn().mockReturnValue('http://localhost:4000'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: CourseOwnershipService, useValue: ownershipMock },
        { provide: ConfigService, useValue: configMock },
      ],
    }).compile();

    service = module.get<CoursesService>(CoursesService);
  });

  it('creates a draft course for the creator', async () => {
    prismaMock.course.findFirst.mockResolvedValue(null);
    prismaMock.course.create.mockImplementation(({ data }) =>
      Promise.resolve({
        id: data.id,
        slug: 'pasta-basics',
        title: 'Pasta Basics',
        subtitle: null,
        description: 'Learn pasta',
        thumbnailUrl: null,
        status: CourseStatus.DRAFT,
        estimatedHours: null,
        trailerYoutubeId: null,
        publishedAt: null,
        creatorProfile: {
          slug: 'chef-maria',
          displayName: 'Chef Maria',
        },
        modules: [],
      }),
    );

    const result = await service.create('creator_1', {
      slug: 'pasta-basics',
      title: 'Pasta Basics',
      description: 'Learn pasta',
    });

    expect(result.id).toMatch(UUID_PATTERN);
    expect(result.status).toBe(CourseStatus.DRAFT);
    expect(prismaMock.course.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          id: expect.stringMatching(UUID_PATTERN),
        }),
      }),
    );
  });

  it('auto-generates a slug when none is provided', async () => {
    prismaMock.course.findFirst.mockResolvedValue(null);
    prismaMock.course.create.mockResolvedValue({
      id: 'course_2',
      slug: 'pasta-basics',
      title: 'Pasta Basics',
      subtitle: null,
      description: 'Learn pasta',
      thumbnailUrl: null,
      status: CourseStatus.DRAFT,
      estimatedHours: null,
      language: 'en',
      offersCertificate: false,
      trailerYoutubeId: null,
      publishedAt: null,
      creatorProfile: {
        slug: 'chef-maria',
        displayName: 'Chef Maria',
      },
      modules: [],
    });

    await service.create('creator_1', {
      title: 'Pasta Basics',
      description: 'Learn pasta',
    });

    expect(prismaMock.course.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slug: 'pasta-basics',
        }),
      }),
    );
  });

  it('throws when updating a course the creator does not own', async () => {
    ownershipMock.assertOwnsCourse.mockRejectedValue(
      new ForbiddenException(
        'You do not have permission to modify this course.',
      ),
    );

    await expect(
      service.update('creator_2', 'course_1', { title: 'Updated' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('publishes an owned course', async () => {
    ownershipMock.assertOwnsCourse.mockResolvedValue({
      id: 'course_1',
      status: CourseStatus.DRAFT,
      publishedAt: null,
    });
    prismaMock.course.update.mockResolvedValue({
      id: 'course_1',
      slug: 'pasta-basics',
      title: 'Pasta Basics',
      subtitle: null,
      description: 'Learn pasta',
      thumbnailUrl: null,
      status: CourseStatus.PUBLISHED,
      estimatedHours: null,
      trailerYoutubeId: null,
      publishedAt: new Date('2026-07-04T12:00:00.000Z'),
      creatorProfile: {
        slug: 'chef-maria',
        displayName: 'Chef Maria',
      },
      modules: [],
    });

    const result = await service.publish('creator_1', 'course_1');

    expect(result.status).toBe(CourseStatus.PUBLISHED);
    expect(result.publishedAt).toBeTruthy();
  });

  it('republishes an archived course', async () => {
    const publishedAt = new Date('2026-06-01T12:00:00.000Z');
    ownershipMock.assertOwnsCourse.mockResolvedValue({
      id: 'course_1',
      status: CourseStatus.ARCHIVED,
      publishedAt,
    });
    prismaMock.course.update.mockResolvedValue({
      id: 'course_1',
      slug: 'pasta-basics',
      title: 'Pasta Basics',
      subtitle: null,
      description: 'Learn pasta',
      thumbnailUrl: null,
      status: CourseStatus.PUBLISHED,
      estimatedHours: null,
      trailerYoutubeId: null,
      publishedAt,
      creatorProfile: {
        slug: 'chef-maria',
        displayName: 'Chef Maria',
      },
      modules: [],
    });

    const result = await service.publish('creator_1', 'course_1');

    expect(result.status).toBe(CourseStatus.PUBLISHED);
    expect(prismaMock.course.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: CourseStatus.PUBLISHED,
          publishedAt,
        }),
      }),
    );
  });

  it('throws when slug already exists on create', async () => {
    prismaMock.course.findFirst.mockResolvedValue({ id: 'existing' });

    await expect(
      service.create('creator_1', {
        slug: 'pasta-basics',
        title: 'Pasta Basics',
        description: 'Learn pasta',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('filters published courses that offer certificates', async () => {
    prismaMock.course.findMany.mockResolvedValue([
      {
        id: 'course_1',
        slug: 'pasta-basics',
        title: 'Pasta Basics',
        subtitle: null,
        thumbnailUrl: null,
        status: CourseStatus.PUBLISHED,
        estimatedHours: null,
        language: 'en',
        offersCertificate: true,
        creatorProfile: {
          slug: 'chef-maria',
          displayName: 'Chef Maria',
        },
      },
    ]);
    prismaMock.course.count.mockResolvedValue(1);

    const result = await service.list({ certificates: true });

    expect(prismaMock.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          offersCertificate: true,
        }),
      }),
    );
    expect(result.items[0]?.offersCertificate).toBe(true);
  });
});
