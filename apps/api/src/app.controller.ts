import {
  Controller,
  Get,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './common/decorators';
import { PrismaService } from './prisma/prisma.service';
import { QueueService } from './modules/platform/queue/queue.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @Optional() private readonly prisma?: PrismaService,
    @Optional() private readonly queueService?: QueueService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @Public()
  async healthCheck(): Promise<{
    status: 'ok' | 'degraded';
    timestamp: string;
    uptime: number;
    dependencies: {
      database: string;
      redis: string;
    };
  }> {
    const readiness = await this.getReadinessStatus();

    return {
      status: readiness.ready ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      dependencies: readiness.dependencies,
    };
  }

  @Get('health/live')
  @Public()
  liveCheck(): {
    status: 'ok';
    timestamp: string;
  } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health/ready')
  @Public()
  async readyCheck(): Promise<{
    status: 'ready';
    timestamp: string;
    uptime: number;
    dependencies: {
      database: string;
      redis: string;
    };
  }> {
    const readiness = await this.getReadinessStatus();

    if (!readiness.ready) {
      throw new ServiceUnavailableException({
        status: 'degraded',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        dependencies: readiness.dependencies,
      });
    }

    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      dependencies: readiness.dependencies,
    };
  }

  private async getReadinessStatus(): Promise<{
    ready: boolean;
    dependencies: {
      database: string;
      redis: string;
    };
  }> {
    if (!this.prisma || !this.queueService) {
      return {
        ready: true,
        dependencies: {
          database: 'not-configured',
          redis: 'not-configured',
        },
      };
    }

    const [database, redis] = await Promise.all([
      this.checkDatabaseReadiness(),
      this.queueService.getRedisReadiness(),
    ]);

    return {
      ready: database.ready && redis.ready,
      dependencies: {
        database: database.status,
        redis: redis.status,
      },
    };
  }

  private async checkDatabaseReadiness(): Promise<{
    ready: boolean;
    status: string;
  }> {
    if (!this.prisma) {
      return {
        ready: true,
        status: 'not-configured',
      };
    }

    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
      return {
        ready: true,
        status: 'ready',
      };
    } catch {
      return {
        ready: false,
        status: 'error',
      };
    }
  }
}
