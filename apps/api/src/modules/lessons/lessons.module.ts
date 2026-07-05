import { Module } from '@nestjs/common';
import { AccessModule } from '../../common/access/access.module';
import { CourseBuilderSharedModule } from '../../common/courses/course-builder-shared.module';
import { AuthModule } from '../auth/auth.module';
import { LessonsController } from './lessons.controller';
import { LessonsService } from './lessons.service';

@Module({
  imports: [AuthModule, AccessModule, CourseBuilderSharedModule],
  controllers: [LessonsController],
  providers: [LessonsService],
  exports: [LessonsService],
})
export class LessonsModule {}
