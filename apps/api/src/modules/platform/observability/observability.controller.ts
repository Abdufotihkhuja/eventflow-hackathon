import {
  Controller,
  Get,
  Header,
  UseGuards,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from '../../../common/decorators';
import { QUEUE_NAMES, type QueueName } from '../queue/queue.types';
import { QueueService } from '../queue/queue.service';
import { InternalMetricsGuard } from './internal-metrics.guard';
import { OperationalMetricsService } from './operational-metrics.service';

@ApiExcludeController()
@Controller('internal')
@Public()
@UseGuards(InternalMetricsGuard)
export class ObservabilityController {
  constructor(
    private readonly queueService: QueueService,
    private readonly operationalMetricsService: OperationalMetricsService,
  ) {}

  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async renderMetrics(): Promise<string> {
    const queueDepths = await this.getQueueDepthSnapshots();
    this.operationalMetricsService.setQueueDepths(queueDepths);

    return this.operationalMetricsService.renderPrometheusMetrics(
      this.operationalMetricsService.isEnabled(),
    );
  }

  @Get('queues')
  async getQueueDepths() {
    const queueDepths = await this.getQueueDepthSnapshots();
    this.operationalMetricsService.setQueueDepths(queueDepths);

    return {
      collectedAt: new Date().toISOString(),
      queues: queueDepths,
      slowQueryCount: this.operationalMetricsService.getSlowQueryCount(),
      recentSlowQueries: this.operationalMetricsService.getRecentSlowQueries(),
    };
  }

  private async getQueueDepthSnapshots() {
    const queueNames = Object.values(QUEUE_NAMES) as QueueName[];

    return Promise.all(
      queueNames.map(async (queueName) => ({
        queueName,
        depth: await this.queueService.getQueueDepth(queueName),
      })),
    );
  }
}
