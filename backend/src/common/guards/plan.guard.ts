import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionPlan } from '@prisma/client';
import { PLAN_KEY } from '../decorators/plan.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPlans = this.reflector.getAllAndOverride<SubscriptionPlan[]>(PLAN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPlans || requiredPlans.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;

    if (!userId) return false;

    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      throw new ForbiddenException(
        'Você precisa de uma assinatura ativa para acessar este recurso.',
      );
    }

    if (!requiredPlans.includes(subscription.plan)) {
      throw new ForbiddenException(
        'Seu plano atual não inclui este recurso. Faça upgrade para o plano Pro.',
      );
    }

    return true;
  }
}
