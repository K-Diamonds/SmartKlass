import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import {
  Public,
  CurrentUser,
  CreatorGuard,
  CreatorProfileId,
} from '../../common/auth';
import type { AuthenticatedUser } from '../../common/auth/interfaces/authenticated-user.interface';
import { Request } from 'express';
import { IdParamDto } from '../../common/dto/pagination.dto';
import { BillingService } from './billing.service';
import { CheckoutService } from './checkout.service';
import { CreatorBillingService } from './creator-billing.service';
import {
  BillingMeDto,
  CertificateCheckoutDto,
  CoursePlanCheckoutDto,
  CreateCertificateCheckoutDto,
  CreateCoursePlanCheckoutDto,
  CreatorWalletDto,
  CreatorPayoutSummaryDto,
  CreateStripeConnectLinkDto,
  EnableCertificateResultDto,
  OwnerSelfSubscribeDto,
  OwnerSelfSubscribeResultDto,
  StripeConnectLinkDto,
  StripeConnectStatusDto,
  StripeWebhookResponseDto,
} from './dto/billing.dto';
import { StripeWebhookService } from './stripe-webhook.service';

@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post('course-plan')
  createCoursePlanCheckout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCoursePlanCheckoutDto,
  ): Promise<CoursePlanCheckoutDto> {
    return this.checkoutService.createCoursePlanCheckout(user.id, dto);
  }

  @Post('owner-self-subscribe')
  ownerSelfSubscribe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: OwnerSelfSubscribeDto,
  ): Promise<OwnerSelfSubscribeResultDto> {
    return this.checkoutService.ownerSelfSubscribe(user.id, dto.accessPlanId);
  }

  @UseGuards(CreatorGuard)
  @Post('certificate')
  createCertificateCheckout(
    @CurrentUser() user: AuthenticatedUser,
    @CreatorProfileId() creatorProfileId: string,
    @Body() dto: CreateCertificateCheckoutDto,
  ): Promise<CertificateCheckoutDto> {
    return this.checkoutService.createCertificateCheckout(
      user.id,
      creatorProfileId,
      dto,
    );
  }
}

@Controller('billing')
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly creatorBillingService: CreatorBillingService,
  ) {}

  @Get('me')
  getBillingOverview(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BillingMeDto> {
    return this.billingService.getBillingOverview(user.id);
  }

  @UseGuards(CreatorGuard)
  @Get('creator/wallet')
  getCreatorWallet(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CreatorWalletDto> {
    return this.creatorBillingService.getWalletForUser(user.id);
  }

  @UseGuards(CreatorGuard)
  @Get('creator/payouts/summary')
  getCreatorPayoutSummary(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CreatorPayoutSummaryDto> {
    return this.creatorBillingService.getPayoutSummaryForUser(user.id);
  }

  @UseGuards(CreatorGuard)
  @Get('creator/stripe-connect/status')
  getStripeConnectStatus(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<StripeConnectStatusDto> {
    return this.creatorBillingService.getStripeConnectStatus(user.id);
  }

  @UseGuards(CreatorGuard)
  @Post('creator/stripe-connect/onboard')
  createStripeConnectOnboardingLink(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateStripeConnectLinkDto,
  ): Promise<StripeConnectLinkDto> {
    return this.creatorBillingService.createStripeConnectOnboardingLink(
      user.id,
      dto.returnUrl,
      dto.refreshUrl,
    );
  }

  @UseGuards(CreatorGuard)
  @Post('creator/stripe-connect/dashboard')
  createStripeConnectDashboardLink(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<StripeConnectLinkDto> {
    return this.creatorBillingService.createStripeConnectDashboardLink(user.id);
  }

  @UseGuards(CreatorGuard)
  @Post('creator/courses/:id/certificate/enable-balance')
  enableCertificateWithBalance(
    @CreatorProfileId() creatorProfileId: string,
    @Param() params: IdParamDto,
  ): Promise<EnableCertificateResultDto> {
    return this.creatorBillingService.enableCertificateWithBalance(
      creatorProfileId,
      params.id,
    );
  }
}

@Public()
@Controller('stripe')
export class StripeWebhookController {
  constructor(private readonly stripeWebhookService: StripeWebhookService) {}

  @Post('webhook')
  handleWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string | undefined,
  ): Promise<StripeWebhookResponseDto> {
    return this.stripeWebhookService.handleWebhook(request.rawBody, signature);
  }
}
