import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';
import { PrismaService } from './prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async check() {
    let dbStatus = { connected: false, responseTimeMs: 0 };

    try {
      const start = Date.now();
      await this.prisma.$queryRawUnsafe('SELECT 1');
      dbStatus = { connected: true, responseTimeMs: Date.now() - start };
    } catch {
      dbStatus = { connected: false, responseTimeMs: -1 };
    }

    return {
      status: dbStatus.connected ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      db: dbStatus,
    };
  }
}
