import { Module } from '@nestjs/common';
import { CourseOwnershipService } from './course-ownership.service';

@Module({
  providers: [CourseOwnershipService],
  exports: [CourseOwnershipService],
})
export class CourseBuilderSharedModule {}
