import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobRunnerService } from './job-runner.service';

const DAILY_JOBS = [
  'expire_subscriptions',
  'promote_matured_transactions',
  'generate_analytics_snapshot',
  'cleanup_stale_job_runs',
] as const;

const FREQUENT_JOBS = ['publish_scheduled_versions'] as const;

@Injectable()
export class JobSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobSchedulerService.name);
  private interval?: NodeJS.Timeout;
  private lastDailyRunDate?: string;

  constructor(
    private readonly jobs: JobRunnerService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    const enabled =
      this.configService.get<string>('worker.enabled') !== 'false';
    if (!enabled) {
      return;
    }

    const pollMs =
      this.configService.get<number>('worker.dailyJobPollMs') ?? 60_000;
    this.interval = setInterval(() => {
      void this.tickFrequentJobs().catch((error) => {
        this.logger.error('Frequent job tick failed', error);
      });
      void this.tickDailyJobs().catch((error) => {
        this.logger.error('Daily job tick failed', error);
      });
    }, pollMs);
    this.logger.log('Job scheduler started');
  }

  onModuleDestroy() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  private async tickFrequentJobs() {
    for (const jobName of FREQUENT_JOBS) {
      try {
        await this.jobs.run(jobName);
      } catch {
        // Logged in JobRunnerService
      }
    }
  }

  private async tickDailyJobs() {
    const today = new Date().toISOString().slice(0, 10);
    if (this.lastDailyRunDate === today) {
      return;
    }

    const hour = new Date().getUTCHours();
    const runHour = this.configService.get<number>('worker.dailyJobHourUtc') ?? 6;
    if (hour < runHour) {
      return;
    }

    this.lastDailyRunDate = today;
    this.logger.log(`Running daily jobs for ${today}`);

    for (const jobName of DAILY_JOBS) {
      try {
        await this.jobs.run(jobName);
      } catch {
        // Logged in JobRunnerService
      }
    }
  }
}
