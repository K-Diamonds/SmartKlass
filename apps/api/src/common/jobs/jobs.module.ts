import { Module } from '@nestjs/common';
import { BillingModule } from '../../modules/billing/billing.module';
import { JobRunnerService } from './job-runner.service';
import { JobSchedulerService } from './job-scheduler.service';

@Module({
  imports: [BillingModule],
  providers: [JobRunnerService, JobSchedulerService],
  exports: [JobRunnerService],
})
export class JobsModule {}
