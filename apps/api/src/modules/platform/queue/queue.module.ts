import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QueueService } from './queue.service';
import { JobIdempotencyService } from './job-idempotency.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [QueueService, JobIdempotencyService],
  exports: [QueueService, JobIdempotencyService],
})
export class QueueModule {}
