import { Module } from '@nestjs/common';
import { AccessModule } from '../../common/access/access.module';
import { CourseBuilderSharedModule } from '../../common/courses/course-builder-shared.module';
import { AuthModule } from '../auth/auth.module';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { CourseVersioningService } from './course-versioning.service';

@Module({
  imports: [AuthModule, AccessModule, CourseBuilderSharedModule],
  controllers: [CoursesController],
  providers: [CoursesService, CourseVersioningService],
  exports: [CoursesService, CourseVersioningService],
})
export class CoursesModule {}
