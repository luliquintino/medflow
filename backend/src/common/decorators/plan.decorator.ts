import { SetMetadata } from '@nestjs/common';
import { SubscriptionPlan } from '@prisma/client';

export const PLAN_KEY = 'plan';
export const RequirePlan = (...plans: SubscriptionPlan[]) =>
  SetMetadata(PLAN_KEY, plans);
