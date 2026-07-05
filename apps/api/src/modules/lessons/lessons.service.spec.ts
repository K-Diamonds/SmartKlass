import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { LessonStatus, VideoProvider } from '@smartklass/database';
import { CourseOwnershipService } from '../../common/courses/course-ownership.service';
import { PrismaService } from '../../common/database/prisma.service';
import { LessonsService } from './lessons.service';

describe('LessonsService', () => {
  let service: LessonsService;

  const prismaMock = {
    lesson: {
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    lessonResource: {
      count: jest.fn(),
      create: jest.fn(),
    },
    courseModule: {
      findFirst: jest.fn(),
    },
  };

  const ownershipMock = {
    assertOwnsModule: jest.fn(),
    assertOwnsLesson: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LessonsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: CourseOwnershipService, useValue: ownershipMock },
      ],
    }).compile();

    service = module.get<LessonsService>(LessonsService);
  });

  it('sets parsed YouTube metadata on a lesson', async () => {
    ownershipMock.assertOwnsLesson.mockResolvedValue({
      id: 'lesson_1',
      module: { course: { creatorProfileId: 'creator_1' } },
    });
    prismaMock.lesson.update.mockResolvedValue({
      id: 'lesson_1',
      moduleId: 'module_1',
      title: 'Lesson 1',
      description: null,
      youtubeVideoId: 'dQw4w9WgXcQ',
      youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      provider: VideoProvider.YOUTUBE,
      durationSeconds: 212,
      sortOrder: 0,
      status: LessonStatus.DRAFT,
      isPreview: false,
      createdAt: new Date('2026-07-04T12:00:00.000Z'),
      resources: [],
    });

    const result = await service.setYoutube('creator_1', 'lesson_1', {
      youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ',
      durationSeconds: 212,
    });

    expect(prismaMock.lesson.update).toHaveBeenCalledTimes(1);
    expect(result.provider).toBe(VideoProvider.YOUTUBE);
  });

  it('rejects YouTube updates from non-owners', async () => {
    ownershipMock.assertOwnsLesson.mockRejectedValue(
      new ForbiddenException(
        'You do not have permission to modify this lesson.',
      ),
    );

    await expect(
      service.setYoutube('creator_2', 'lesson_1', {
        youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects invalid YouTube URLs', async () => {
    ownershipMock.assertOwnsLesson.mockResolvedValue({
      id: 'lesson_1',
      module: { course: { creatorProfileId: 'creator_1' } },
    });

    await expect(
      service.setYoutube('creator_1', 'lesson_1', {
        youtubeUrl: 'https://example.com/not-youtube',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
