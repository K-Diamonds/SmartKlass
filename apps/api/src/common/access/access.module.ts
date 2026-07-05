import { Module } from '@nestjs/common';
import { AccessService } from './access.service';
import { CourseOwnerGuard } from './guards/course-owner.guard';
import { RequireCourseAccessGuard } from './guards/require-course-access.guard';
import { RequireLessonAccessGuard } from './guards/require-lesson-access.guard';

@Module({
  providers: [
    AccessService,
    RequireCourseAccessGuard,
    RequireLessonAccessGuard,
    CourseOwnerGuard,
  ],
  exports: [
    AccessService,
    RequireCourseAccessGuard,
    RequireLessonAccessGuard,
    CourseOwnerGuard,
  ],
})
export class AccessModule {}
