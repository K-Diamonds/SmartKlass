import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CourseVersionStatus } from '@smartklass/database';
import { PrismaService } from '../../common/database/prisma.service';
import { CourseVersioningService } from './course-versioning.service';
import { diffCourseSnapshots } from './course-version-snapshot.types';

jest.mock('./course-version-apply', () => ({
  applyCourseSnapshot: jest.fn().mockResolvedValue(undefined),
  buildSnapshotFromCourse: jest.fn().mockReturnValue({
    course: { title: 'Live' },
    modules: [],
    accessPlans: [],
  }),
}));

import { applyCourseSnapshot } from './course-version-apply';

describe('CourseVersioningService', () => {
  let service: CourseVersioningService;

  const prismaMock = {
    course: { findFirst: jest.fn(), update: jest.fn() },
    courseVersion: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    prismaMock.$transaction.mockImplementation((fn: (tx: unknown) => unknown) =>
      fn(prismaMock),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseVersioningService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get(CourseVersioningService);
  });

  it('publishes a draft version and applies snapshot', async () => {
    const snapshot = {
      course: { title: 'V2' },
      modules: [],
      accessPlans: [],
    };

    prismaMock.courseVersion.findFirst.mockResolvedValue({
      id: 'ver-2',
      courseId: 'course-1',
      versionNumber: 2,
      status: CourseVersionStatus.DRAFT,
      snapshot,
    });
    prismaMock.courseVersion.findUnique.mockResolvedValue({
      id: 'ver-2',
      status: CourseVersionStatus.PUBLISHED,
    });

    const result = await service.publishVersion('course-1', 'ver-2');

    expect(applyCourseSnapshot).toHaveBeenCalledWith(
      prismaMock,
      'course-1',
      snapshot,
    );
    expect(prismaMock.course.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'course-1' },
        data: expect.objectContaining({
          publishedVersionId: 'ver-2',
          currentVersionNumber: 2,
        }),
      }),
    );
    expect(result?.status).toBe(CourseVersionStatus.PUBLISHED);
  });

  it('rolls back to an archived version', async () => {
    prismaMock.courseVersion.findFirst.mockResolvedValue({
      id: 'ver-1',
      courseId: 'course-1',
      versionNumber: 1,
      status: CourseVersionStatus.ARCHIVED,
      snapshot: { course: { title: 'V1' }, modules: [], accessPlans: [] },
    });
    prismaMock.courseVersion.findUnique.mockResolvedValue({
      id: 'ver-1',
      status: CourseVersionStatus.PUBLISHED,
    });

    await service.rollback('course-1', 'ver-1');

    expect(applyCourseSnapshot).toHaveBeenCalled();
  });

  it('rejects rollback for draft versions', async () => {
    prismaMock.courseVersion.findFirst.mockResolvedValue({
      id: 'ver-3',
      status: CourseVersionStatus.DRAFT,
    });

    await expect(service.rollback('course-1', 'ver-3')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('schedules a draft version', async () => {
    const scheduledFor = new Date('2026-07-10T12:00:00.000Z');
    prismaMock.courseVersion.findFirst.mockResolvedValue({
      id: 'ver-4',
      status: CourseVersionStatus.DRAFT,
    });
    prismaMock.courseVersion.update.mockResolvedValue({
      id: 'ver-4',
      status: CourseVersionStatus.SCHEDULED,
      scheduledFor,
    });

    const result = await service.scheduleVersion(
      'course-1',
      'ver-4',
      scheduledFor,
    );

    expect(result.status).toBe(CourseVersionStatus.SCHEDULED);
  });

  it('publishes due scheduled versions', async () => {
    prismaMock.courseVersion.findMany.mockResolvedValue([
      {
        id: 'ver-5',
        courseId: 'course-1',
        versionNumber: 5,
        status: CourseVersionStatus.SCHEDULED,
        snapshot: {
          course: { title: 'Scheduled' },
          modules: [],
          accessPlans: [],
        },
      },
    ]);
    prismaMock.courseVersion.findFirst.mockResolvedValue({
      id: 'ver-5',
      courseId: 'course-1',
      versionNumber: 5,
      status: CourseVersionStatus.SCHEDULED,
      snapshot: {
        course: { title: 'Scheduled' },
        modules: [],
        accessPlans: [],
      },
    });
    prismaMock.courseVersion.findUnique.mockResolvedValue({
      id: 'ver-5',
      status: CourseVersionStatus.PUBLISHED,
    });

    const count = await service.publishDueScheduledVersions();

    expect(count).toBe(1);
    expect(applyCourseSnapshot).toHaveBeenCalled();
  });

  it('diffs two version snapshots', async () => {
    const fromSnapshot = {
      course: {
        title: 'Before',
        subtitle: null,
        description: '',
        thumbnailUrl: null,
        trailerYoutubeId: null,
        previewMaterialsDescription: null,
        estimatedHours: null,
        difficultyLevel: 'BEGINNER',
        language: 'en',
        offersCertificate: false,
      },
      modules: [],
      accessPlans: [],
    };
    const toSnapshot = {
      ...fromSnapshot,
      course: { ...fromSnapshot.course, title: 'After' },
    };

    prismaMock.courseVersion.findFirst
      .mockResolvedValueOnce({ snapshot: fromSnapshot })
      .mockResolvedValueOnce({ snapshot: toSnapshot });

    const diff = await service.diffVersions('course-1', 'from', 'to');

    expect(diff).toEqual(diffCourseSnapshots(fromSnapshot, toSnapshot));
  });

  it('throws when version is missing for diff', async () => {
    prismaMock.courseVersion.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ snapshot: {} });

    await expect(
      service.diffVersions('course-1', 'missing', 'to'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
