import { Module } from '@nestjs/common';
import { CourseBuilderSharedModule } from '../../common/courses/course-builder-shared.module';
import { AuthModule } from '../auth/auth.module';
import { AccessPlansController } from './access-plans.controller';
import { AccessPlansService } from './access-plans.service';

@Module({
  imports: [AuthModule, CourseBuilderSharedModule],
  controllers: [AccessPlansController],
  providers: [AccessPlansService],
  exports: [AccessPlansService],
})
export class AccessPlansModule {}
