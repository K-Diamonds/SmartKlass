import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/analytics.module';
import { BillingModule } from '../../modules/billing/billing.module';
import { CoursesModule } from '../../modules/courses/courses.module';
import { JobRunnerService } from './job-runner.service';
import { JobSchedulerService } from './job-scheduler.service';

@Module({
  imports: [BillingModule, CoursesModule, AnalyticsModule],
  providers: [JobRunnerService, JobSchedulerService],
  exports: [JobRunnerService],
})
export class JobsModule {}
