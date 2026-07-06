import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { JwtAuthGuard } from './common/auth';
import configuration from './common/config/configuration';
import { validateEnvironment } from './common/config/validate-environment';
import { DomainEventsModule } from './common/domain-events/domain-events.module';
import { JobsModule } from './common/jobs/jobs.module';
import { OutboxModule } from './common/outbox/outbox.module';
import { ObservabilityModule } from './common/observability/observability.module';
import { CorrelationIdMiddleware } from './common/observability/correlation-id.middleware';
import { PrismaModule } from './common/database/prisma.module';
import { RequestLoggingMiddleware } from './common/middleware/request-logging.middleware';
import { AccessPlansModule } from './modules/access-plans/access-plans.module';
import { AdminQueriesModule } from './modules/admin-queries/admin-queries.module';
import { AuthModule } from './modules/auth/auth.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { CommentsModule } from './modules/comments/comments.module';
import { CourseModulesModule } from './modules/course-modules/course-modules.module';
import { CoursesModule } from './modules/courses/courses.module';
import { CreatorsModule } from './modules/creators/creators.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { HealthModule } from './modules/health/health.module';
import { LessonsModule } from './modules/lessons/lessons.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { BillingModule } from './modules/billing/billing.module';
import { AdminRiskModule } from './modules/admin-risk/admin-risk.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PurchasesModule } from './modules/purchases/purchases.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { UsersModule } from './modules/users/users.module';
import { YoutubeModule } from './modules/youtube/youtube.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      load: [configuration],
      validate: validateEnvironment,
    }),
    PrismaModule,
    DomainEventsModule,
    ObservabilityModule,
    OutboxModule,
    JobsModule,
    HealthModule,
    AuthModule,
    UsersModule,
    CreatorsModule,
    CoursesModule,
    CourseModulesModule,
    LessonsModule,
    AccessPlansModule,
    BillingModule,
    AdminRiskModule,
    AdminQueriesModule,
    PurchasesModule,
    SubscriptionsModule,
    PaymentsModule,
    ReviewsModule,
    CommentsModule,
    CategoriesModule,
    FavoritesModule,
    NotificationsModule,
    YoutubeModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(CorrelationIdMiddleware, RequestLoggingMiddleware)
      .forRoutes('*');
  }
}
