import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CourseOwnershipService } from './course-ownership.service';
import { PrismaService } from '../database/prisma.service';

describe('CourseOwnershipService', () => {
  let service: CourseOwnershipService;

  const prismaMock = {
    course: {
      findFirst: jest.fn(),
    },
    courseModule: {
      findFirst: jest.fn(),
    },
    lesson: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseOwnershipService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<CourseOwnershipService>(CourseOwnershipService);
  });

  it('allows access when creator owns the course', async () => {
    prismaMock.course.findFirst.mockResolvedValue({
      id: 'course_1',
      creatorProfileId: 'creator_1',
    });

    await expect(
      service.assertOwnsCourse('creator_1', 'course_1'),
    ).resolves.toMatchObject({ id: 'course_1' });
  });

  it('denies access when creator does not own the course', async () => {
    prismaMock.course.findFirst.mockResolvedValue(null);

    await expect(
      service.assertOwnsCourse('creator_2', 'course_1'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('denies lesson edits when creator does not own the parent course', async () => {
    prismaMock.lesson.findFirst.mockResolvedValue(null);

    await expect(
      service.assertOwnsLesson('creator_2', 'lesson_1'),
    ).rejects.toThrow(ForbiddenException);
  });
});
