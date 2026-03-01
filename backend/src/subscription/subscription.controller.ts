import {
  Controller, Get, Post, Body, Headers,
  UseGuards, RawBodyRequest, Req, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { SubscriptionPlan } from '@prisma/client';

@ApiTags('Subscription')
@Controller('subscription')
export class SubscriptionController {
  constructor(private subscriptionService: SubscriptionService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Consultar assinatura atual' })
  getSubscription(@CurrentUser('id') userId: string) {
    return this.subscriptionService.getSubscription(userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('checkout')
  @ApiOperation({ summary: 'Criar sessão de checkout Stripe' })
  createCheckout(
    @CurrentUser('id') userId: string,
    @Body() body: { plan: SubscriptionPlan },
  ) {
    return this.subscriptionService.createCheckoutSession(userId, body.plan);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('portal')
  @ApiOperation({ summary: 'Abrir portal de gerenciamento Stripe' })
  createPortal(@CurrentUser('id') userId: string) {
    return this.subscriptionService.createPortalSession(userId);
  }

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook Stripe (público)' })
  handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.subscriptionService.handleWebhook(req.rawBody!, signature);
  }
}
