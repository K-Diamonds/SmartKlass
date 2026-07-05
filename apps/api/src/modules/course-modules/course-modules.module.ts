import { Module } from '@nestjs/common';
import { CourseBuilderSharedModule } from '../../common/courses/course-builder-shared.module';
import { AuthModule } from '../auth/auth.module';
import { CourseModulesController } from './course-modules.controller';
import { CourseModulesService } from './course-modules.service';

@Module({
  imports: [AuthModule, CourseBuilderSharedModule],
  controllers: [CourseModulesController],
  providers: [CourseModulesService],
  exports: [CourseModulesService],
})
export class CourseModulesModule {}
