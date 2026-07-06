import { Prisma } from '@smartklass/database';
import { applyCourseSnapshot } from './course-version-apply';

describe('applyCourseSnapshot', () => {
  const now = new Date('2026-07-06T12:00:00.000Z');

  const txMock = {
    course: { update: jest.fn() },
    courseModule: { updateMany: jest.fn(), upsert: jest.fn() },
    lesson: { updateMany: jest.fn(), upsert: jest.fn() },
    lessonResource: { updateMany: jest.fn(), upsert: jest.fn() },
    accessPlan: { updateMany: jest.fn(), upsert: jest.fn() },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(now);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('soft-deletes all lessons when snapshot has zero lessons', async () => {
    const snapshot = {
      course: {
        title: 'Empty curriculum',
        subtitle: null,
        description: 'No lessons',
        thumbnailUrl: null,
        trailerYoutubeId: null,
        previewMaterialsDescription: null,
        estimatedHours: null,
        difficultyLevel: 'BEGINNER',
        language: 'en',
        offersCertificate: false,
      },
      modules: [
        {
          id: 'mod-1',
          courseId: 'course-1',
          title: 'Module 1',
          description: null,
          sortOrder: 0,
          lessons: [],
        },
      ],
      accessPlans: [],
    };

    await applyCourseSnapshot(
      txMock as unknown as Prisma.TransactionClient,
      'course-1',
      snapshot,
    );

    expect(txMock.lesson.updateMany).toHaveBeenCalledWith({
      where: {
        module: { courseId: 'course-1' },
        deletedAt: null,
      },
      data: { deletedAt: now },
    });
    expect(txMock.lesson.updateMany).toHaveBeenCalledTimes(1);
  });

  it('soft-deletes all resources when snapshot has zero resources', async () => {
    const snapshot = {
      course: {
        title: 'No resources',
        subtitle: null,
        description: 'Lessons without resources',
        thumbnailUrl: null,
        trailerYoutubeId: null,
        previewMaterialsDescription: null,
        estimatedHours: null,
        difficultyLevel: 'BEGINNER',
        language: 'en',
        offersCertificate: false,
      },
      modules: [
        {
          id: 'mod-1',
          courseId: 'course-1',
          title: 'Module 1',
          description: null,
          sortOrder: 0,
          lessons: [
            {
              id: 'lesson-1',
              moduleId: 'mod-1',
              title: 'Lesson 1',
              description: null,
              materialsDescription: null,
              youtubeVideoId: null,
              youtubeUrl: null,
              status: 'DRAFT',
              sortOrder: 0,
              durationMinutes: null,
              resources: [],
            },
          ],
        },
      ],
      accessPlans: [],
    };

    await applyCourseSnapshot(
      txMock as unknown as Prisma.TransactionClient,
      'course-1',
      snapshot,
    );

    expect(txMock.lessonResource.updateMany).toHaveBeenCalledWith({
      where: {
        lesson: { module: { courseId: 'course-1' } },
        deletedAt: null,
      },
      data: { deletedAt: now },
    });
    expect(txMock.lessonResource.updateMany).toHaveBeenCalledTimes(1);
  });
});
