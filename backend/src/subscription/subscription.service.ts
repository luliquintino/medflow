import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubscriptionService {
  constructor(private prisma: PrismaService) {}

  async getSubscription(userId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
    });
    if (!sub) throw new NotFoundException('Assinatura não encontrada.');
    return sub;
  }
}
