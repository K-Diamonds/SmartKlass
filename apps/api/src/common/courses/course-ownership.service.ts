import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Course,
  CourseModule,
  CourseStatus,
  Lesson,
  Prisma,
} from '@smartklass/database';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class CourseOwnershipService {
  constructor(private readonly prisma: PrismaService) {}

  async assertOwnsCourse(
    creatorProfileId: string,
    courseId: string,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<Course> {
    const course = await tx.course.findFirst({
      where: {
        id: courseId,
        creatorProfileId,
        deletedAt: null,
      },
    });

    if (!course) {
      throw new ForbiddenException(
        'You do not have permission to modify this course.',
      );
    }

    return course;
  }

  async assertOwnsModule(
    creatorProfileId: string,
    moduleId: string,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<CourseModule & { course: Course }> {
    const courseModule = await tx.courseModule.findFirst({
      where: {
        id: moduleId,
        deletedAt: null,
        course: {
          creatorProfileId,
          deletedAt: null,
        },
      },
      include: {
        course: true,
      },
    });

    if (!courseModule) {
      throw new ForbiddenException(
        'You do not have permission to modify this module.',
      );
    }

    return courseModule;
  }

  async assertOwnsLesson(
    creatorProfileId: string,
    lessonId: string,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<Lesson & { module: CourseModule & { course: Course } }> {
    const lesson = await tx.lesson.findFirst({
      where: {
        id: lessonId,
        deletedAt: null,
        module: {
          deletedAt: null,
          course: {
            creatorProfileId,
            deletedAt: null,
          },
        },
      },
      include: {
        module: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!lesson) {
      throw new ForbiddenException(
        'You do not have permission to modify this lesson.',
      );
    }

    return lesson;
  }

  async getPublishedCourseOrThrow(courseId: string): Promise<Course> {
    const course = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        deletedAt: null,
        status: CourseStatus.PUBLISHED,
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found.');
    }

    return course;
  }

  async getCourseOrThrow(courseId: string): Promise<Course> {
    const course = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        deletedAt: null,
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found.');
    }

    return course;
  }
}
