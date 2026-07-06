import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';

export type SendEmailInput = {
  to: string;
  template: string;
  subject: string;
  body: string;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async send(input: SendEmailInput): Promise<{ messageId: string }> {
    const provider = this.configService.get<string>('email.provider') ?? 'console';
    const messageId = `email_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    if (provider === 'console' || !this.configService.get<string>('email.smtpUrl')) {
      this.logger.log(
        JSON.stringify({
          level: 'info',
          message: 'email_sent',
          provider: 'console',
          messageId,
          to: input.to,
          template: input.template,
          subject: input.subject,
        }),
      );
      return { messageId };
    }

    // SMTP / provider integration point — log intent until provider is configured.
    this.logger.warn(
      `Email provider ${provider} configured but not wired; logging only.`,
    );
    return { messageId };
  }

  async resolveUserEmail(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    return user?.email ?? null;
  }
}
