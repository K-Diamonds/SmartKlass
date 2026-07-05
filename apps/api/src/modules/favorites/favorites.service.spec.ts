import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CourseStatus } from '@smartklass/database';
import { PrismaService } from '../../common/database/prisma.service';
import { FavoritesService } from './favorites.service';

describe('FavoritesService', () => {
  let service: FavoritesService;

  const prismaMock = {
    favorite: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    course: {
      findFirst: jest.fn(),
    },
  };

  const user = { id: 'user_1', email: 'alex@example.com' };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FavoritesService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<FavoritesService>(FavoritesService);
  });

  it('lists favorites for the signed-in user', async () => {
    prismaMock.favorite.findMany.mockResolvedValue([
      {
        id: 'fav_1',
        courseId: 'course_1',
        createdAt: new Date('2026-07-04T12:00:00.000Z'),
        course: {
          slug: 'pasta-basics',
          title: 'Pasta Basics',
          subtitle: 'From dough to dinner',
          thumbnailUrl: 'https://example.com/pasta.jpg',
          language: 'en',
          creatorProfile: {
            slug: 'maria-santos',
            displayName: 'Chef Maria',
            avatarUrl: null,
          },
        },
      },
    ]);
    prismaMock.favorite.count.mockResolvedValue(1);

    const result = await service.listMine(user, {});

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.course.slug).toBe('pasta-basics');
  });

  it('creates a favorite by course slug', async () => {
    prismaMock.course.findFirst.mockResolvedValue({
      id: 'course_1',
      slug: 'pasta-basics',
      status: CourseStatus.PUBLISHED,
    });
    prismaMock.favorite.findUnique.mockResolvedValue(null);
    prismaMock.favorite.create.mockResolvedValue({
      id: 'fav_1',
      courseId: 'course_1',
      createdAt: new Date('2026-07-04T12:00:00.000Z'),
      course: {
        slug: 'pasta-basics',
        title: 'Pasta Basics',
        subtitle: null,
        thumbnailUrl: null,
        language: 'en',
        creatorProfile: {
          slug: 'maria-santos',
          displayName: 'Chef Maria',
          avatarUrl: null,
        },
      },
    });

    const result = await service.create(user, { courseSlug: 'pasta-basics' });

    expect(result.course.slug).toBe('pasta-basics');
    expect(prismaMock.favorite.create).toHaveBeenCalledTimes(1);
  });

  it('throws when favoriting an unknown course slug', async () => {
    prismaMock.course.findFirst.mockResolvedValue(null);

    await expect(
      service.create(user, { courseSlug: 'missing-course' }),
    ).rejects.toThrow(NotFoundException);
  });
});
