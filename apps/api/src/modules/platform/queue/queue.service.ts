import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { Queue, QueueEvents, type ConnectionOptions } from 'bullmq';
import IORedis from 'ioredis';
import { OperationalMetricsService } from '../observability/operational-metrics.service';
import {
  BadgesZipGenerationJobPayload,
  CertificateGenerationJobPayload,
  MailJobPayload,
  PushReceiptsJobPayload,
  PushSendJobPayload,
  QUEUE_NAMES,
  QueueCompletionResult,
  QueueEnqueueOptions,
  QueueJobHandle,
  QueueName,
  QueuePayload,
  TicketGenerationJobPayload,
  TicketsZipGenerationJobPayload,
} from './queue.types';

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  /** Задержка опроса Expo receipts после send (BL-14, рекомендация Expo ~15 мин). */
  static readonly PUSH_RECEIPTS_DELAY_MS = 15 * 60 * 1000;

  private readonly logger = new Logger(QueueService.name);
  private readonly connectionsDisabled: boolean;
  private readonly connection?: IORedis;
  private readonly subscriber?: IORedis;
  private readonly queues?: Record<QueueName, Queue>;
  private readonly queueEvents?: Record<QueueName, QueueEvents>;

  constructor(
    private readonly configService: ConfigService,
    private readonly operationalMetricsService: OperationalMetricsService,
  ) {
    this.connectionsDisabled =
      this.configService.get<string>('OPENAPI_EXPORT_MODE') === 'true' ||
      process.env.OPENAPI_EXPORT_MODE === 'true';

    if (this.connectionsDisabled) {
      this.logger.log('Queue connections are disabled for OpenAPI export mode');
      return;
    }

    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (!redisUrl) {
      throw new Error(
        'REDIS_URL is required when queue connections are enabled',
      );
    }

    this.connection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    this.subscriber = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    // bullmq bundles its own ioredis copy. When npm resolves a separate ioredis
    // for it (e.g. on a clean prod install), the shared instance is identical at
    // runtime but not type-assignable across the two ioredis copies, so we pass
    // it through bullmq's ConnectionOptions. bullmq duck-types the connection,
    // so reusing one instance across queues still works at runtime.
    const queueConnection = this.connection as unknown as ConnectionOptions;
    const eventsConnection = this.subscriber as unknown as ConnectionOptions;

    this.queues = {
      [QUEUE_NAMES.MAIL]: new Queue(QUEUE_NAMES.MAIL, {
        connection: queueConnection,
      }),
      [QUEUE_NAMES.TICKETS]: new Queue(QUEUE_NAMES.TICKETS, {
        connection: queueConnection,
      }),
      [QUEUE_NAMES.CERTIFICATES]: new Queue(QUEUE_NAMES.CERTIFICATES, {
        connection: queueConnection,
      }),
      [QUEUE_NAMES.BADGES]: new Queue(QUEUE_NAMES.BADGES, {
        connection: queueConnection,
      }),
      [QUEUE_NAMES.BILLING_SWEEPS]: new Queue(QUEUE_NAMES.BILLING_SWEEPS, {
        connection: queueConnection,
      }),
      [QUEUE_NAMES.MAINTENANCE_SWEEPS]: new Queue(
        QUEUE_NAMES.MAINTENANCE_SWEEPS,
        { connection: queueConnection },
      ),
      [QUEUE_NAMES.NOTIFICATIONS]: new Queue(QUEUE_NAMES.NOTIFICATIONS, {
        connection: queueConnection,
      }),
      [QUEUE_NAMES.PUSH]: new Queue(QUEUE_NAMES.PUSH, {
        connection: queueConnection,
      }),
    };

    this.queueEvents = {
      [QUEUE_NAMES.MAIL]: new QueueEvents(QUEUE_NAMES.MAIL, {
        connection: eventsConnection,
      }),
      [QUEUE_NAMES.TICKETS]: new QueueEvents(QUEUE_NAMES.TICKETS, {
        connection: eventsConnection,
      }),
      [QUEUE_NAMES.CERTIFICATES]: new QueueEvents(QUEUE_NAMES.CERTIFICATES, {
        connection: eventsConnection,
      }),
      [QUEUE_NAMES.BADGES]: new QueueEvents(QUEUE_NAMES.BADGES, {
        connection: eventsConnection,
      }),
      [QUEUE_NAMES.BILLING_SWEEPS]: new QueueEvents(QUEUE_NAMES.BILLING_SWEEPS, {
        connection: eventsConnection,
      }),
      [QUEUE_NAMES.MAINTENANCE_SWEEPS]: new QueueEvents(
        QUEUE_NAMES.MAINTENANCE_SWEEPS,
        { connection: eventsConnection },
      ),
      [QUEUE_NAMES.NOTIFICATIONS]: new QueueEvents(QUEUE_NAMES.NOTIFICATIONS, {
        connection: eventsConnection,
      }),
      [QUEUE_NAMES.PUSH]: new QueueEvents(QUEUE_NAMES.PUSH, {
        connection: eventsConnection,
      }),
    };
  }

  async onModuleInit(): Promise<void> {
    if (this.connectionsDisabled || !this.queueEvents) {
      return;
    }

    // E-11b: единственное ПОВТОРЯЕМОЕ задание — гигиенический свип биллинга
    // (expiry-флипы + напоминания §2.1). Корректность сбросов от него НЕ
    // зависит (lazy periodKey, CR-6). upsert идемпотентен между репликами.
    await this.queues?.[QUEUE_NAMES.BILLING_SWEEPS].upsertJobScheduler(
      'billing-sweep-hourly',
      { every: 60 * 60 * 1000 },
      { name: 'billing.sweep', data: { type: 'billing.sweep' } },
    );

    // Уборка брошенных черновиков регистрации: участник загрузил файл, но так
    // и не отправил форму. Раз в сутки — файлы старше TTL черновика удаляются
    // из стораджа и БД, иначе они копятся вечно. upsert идемпотентен.
    await this.queues?.[QUEUE_NAMES.MAINTENANCE_SWEEPS].upsertJobScheduler(
      'registration-files-sweep-daily',
      { every: 24 * 60 * 60 * 1000 },
      {
        name: 'registration-files.sweep',
        data: { type: 'registration-files.sweep' },
      },
    );

    // Тик диспатчера уведомлений (BL-10): раз в 60s выбирает due-строки
    // ScheduledNotification (FOR UPDATE SKIP LOCKED — двойной воркер не
    // диспатчит одну строку дважды). Паттерн — billing-sweep-hourly.
    await this.queues?.[QUEUE_NAMES.NOTIFICATIONS].upsertJobScheduler(
      'notifications-dispatch-due',
      { every: 60 * 1000 },
      {
        name: 'notifications.dispatch-due',
        data: { type: 'notifications.dispatch-due' },
      },
    );

    // Reaper застрявших enqueued-доставок (BL-06): раз в 10 минут.
    // providerRef есть → не переотправлять; нет → max 1 повтор, дальше failed.
    await this.queues?.[QUEUE_NAMES.NOTIFICATIONS].upsertJobScheduler(
      'notifications-reaper',
      { every: 10 * 60 * 1000 },
      {
        name: 'notifications.reaper',
        data: { type: 'notifications.reaper' },
      },
    );

    // Reconcile-свип цепочек (Батч 6б): раз в сутки досоздаёт недостающие
    // плановые строки живых событий, гасит осиротевшие и создаёт digest-строки
    // следующего дня (BL-19). Основной путь пере-планирования — синхронный
    // (BL-03), свип — страховка.
    await this.queues?.[QUEUE_NAMES.NOTIFICATIONS].upsertJobScheduler(
      'notifications-reconcile',
      { every: 24 * 60 * 60 * 1000 },
      {
        name: 'notifications.reconcile',
        data: { type: 'notifications.reconcile' },
      },
    );

    await Promise.all(
      Object.values(this.queueEvents).map((events) => events.waitUntilReady()),
    );
  }

  async onModuleDestroy(): Promise<void> {
    if (
      this.connectionsDisabled ||
      !this.queueEvents ||
      !this.queues ||
      !this.connection ||
      !this.subscriber
    ) {
      return;
    }

    await Promise.all([
      ...Object.values(this.queueEvents).map((events) => events.close()),
      ...Object.values(this.queues).map((queue) => queue.close()),
      this.connection.quit(),
      this.subscriber.quit(),
    ]);
  }

  createJobId(parts: Array<string | number | boolean | undefined>): string {
    return createHash('sha256')
      .update(parts.filter((part) => part !== undefined).join(':'))
      .digest('hex');
  }

  async enqueueMail(
    payload: MailJobPayload,
    options?: QueueEnqueueOptions,
  ): Promise<QueueJobHandle<MailJobPayload>> {
    return this.enqueue(QUEUE_NAMES.MAIL, payload, {
      // BullMQ (v5.7x+) forbids ":" in custom job ids, but our idempotency
      // keys contain colons. Hash to a colon-free, deterministic id (same key
      // → same id, so BullMQ-level dedup is preserved). The original
      // idempotencyKey stays in the payload for app-level dedup.
      jobId: this.createJobId([payload.idempotencyKey]),
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: 500,
      removeOnFail: 500,
      ...options,
    });
  }

  /**
   * Постановка push-доставки (BL-14). jobId детерминирован от deliveryId —
   * BullMQ-дедуп повторной постановки той же строки; reaper-повтор меняет
   * суффикс (`:r1`), иначе BullMQ молча проглотит job с тем же id.
   */
  async enqueuePushSend(
    payload: PushSendJobPayload,
    options?: QueueEnqueueOptions,
  ): Promise<QueueJobHandle<PushSendJobPayload>> {
    return this.enqueue(QUEUE_NAMES.PUSH, payload, {
      jobId: this.createJobId([payload.jobId]),
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 500,
      removeOnFail: 500,
      ...options,
    });
  }

  /** Отложенный опрос Expo receipts (~15 мин после send, BL-14). */
  async enqueuePushReceipts(
    payload: PushReceiptsJobPayload,
    options?: QueueEnqueueOptions,
  ): Promise<QueueJobHandle<PushReceiptsJobPayload>> {
    return this.enqueue(QUEUE_NAMES.PUSH, payload, {
      jobId: this.createJobId([payload.jobId]),
      delay: QueueService.PUSH_RECEIPTS_DELAY_MS,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: 500,
      removeOnFail: 500,
      ...options,
    });
  }

  async enqueueTicketGeneration(
    payload: TicketGenerationJobPayload,
    options?: QueueEnqueueOptions,
  ): Promise<QueueJobHandle<TicketGenerationJobPayload>> {
    return this.enqueue(QUEUE_NAMES.TICKETS, payload, {
      jobId: payload.jobId,
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 1500,
      },
      removeOnComplete: 250,
      removeOnFail: 250,
      ...options,
    });
  }

  async enqueueTicketsZipGeneration(
    payload: TicketsZipGenerationJobPayload,
    options?: QueueEnqueueOptions,
  ): Promise<QueueJobHandle<TicketsZipGenerationJobPayload>> {
    return this.enqueue(QUEUE_NAMES.TICKETS, payload, {
      jobId: payload.jobId,
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 1500,
      },
      removeOnComplete: 100,
      removeOnFail: 100,
      ...options,
    });
  }

  async enqueueCertificateGeneration(
    payload: CertificateGenerationJobPayload,
    options?: QueueEnqueueOptions,
  ): Promise<QueueJobHandle<CertificateGenerationJobPayload>> {
    return this.enqueue(QUEUE_NAMES.CERTIFICATES, payload, {
      jobId: payload.jobId,
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 1500,
      },
      removeOnComplete: 100,
      removeOnFail: 100,
      ...options,
    });
  }

  async enqueueBadgesZipGeneration(
    payload: BadgesZipGenerationJobPayload,
    options?: QueueEnqueueOptions,
  ): Promise<QueueJobHandle<BadgesZipGenerationJobPayload>> {
    return this.enqueue(QUEUE_NAMES.BADGES, payload, {
      jobId: payload.jobId,
      // Один повтор: рендер идемпотентен (квота списывается по natural key),
      // но повторять долгую выгрузку бесконечно смысла нет.
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 1500,
      },
      removeOnComplete: 100,
      removeOnFail: 100,
      ...options,
    });
  }

  async waitForJob<TResult = unknown>(
    handle: QueueJobHandle,
    timeoutMs = 15000,
  ): Promise<QueueCompletionResult<TResult>> {
    if (!this.queueEvents) {
      return {
        status: 'failed',
        reason: 'Queue events are unavailable',
      };
    }

    try {
      const result = (await handle.job.waitUntilFinished(
        this.queueEvents[handle.queueName],
        timeoutMs,
      )) as TResult;

      this.operationalMetricsService.recordQueueWait({
        queueName: handle.queueName,
        status: 'completed',
      });

      return {
        status: 'completed',
        result,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown queue error';

      if (message.toLowerCase().includes('timed out')) {
        this.operationalMetricsService.recordQueueWait({
          queueName: handle.queueName,
          status: 'timed_out',
        });
        return {
          status: 'timed_out',
          reason: message,
        };
      }

      this.logger.error(`Queue job ${handle.jobId} failed`, message);
      this.operationalMetricsService.recordQueueWait({
        queueName: handle.queueName,
        status: 'failed',
      });
      return {
        status: 'failed',
        reason: message,
      };
    }
  }

  /**
   * Read the current state of a previously enqueued job. The cross-process
   * worker reports a single final result (returnvalue), so progress is coarse:
   * waiting/active until the worker finishes, then completed/failed. Returns
   * `unknown` when the job has already been evicted or queues are disabled.
   */
  async getJobStatus<TResult = unknown>(
    queueName: QueueName,
    jobId: string,
  ): Promise<{
    state: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'unknown';
    result?: TResult;
    failedReason?: string;
  }> {
    if (!this.queues) {
      return { state: 'unknown' };
    }
    try {
      const job = await this.queues[queueName].getJob(jobId);
      if (!job) {
        return { state: 'unknown' };
      }
      const rawState = await job.getState();
      const state =
        rawState === 'completed' ||
        rawState === 'failed' ||
        rawState === 'active' ||
        rawState === 'delayed' ||
        rawState === 'waiting'
          ? rawState
          : 'unknown';
      return {
        state,
        result: (job.returnvalue as TResult) ?? undefined,
        failedReason: job.failedReason ?? undefined,
      };
    } catch (error) {
      this.logger.warn(
        `Failed to read job status ${queueName}/${jobId}: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
      return { state: 'unknown' };
    }
  }

  /**
   * Убирает job из очереди. Нужно там, где jobId детерминирован от запроса:
   * BullMQ игнорирует повторную постановку с тем же id, поэтому завершённое
   * задание навсегда блокирует пересборку своего результата, если тот пропал.
   */
  async removeJob(queueName: QueueName, jobId: string): Promise<void> {
    if (!this.queues) {
      return;
    }
    try {
      const job = await this.queues[queueName].getJob(jobId);
      await job?.remove();
    } catch (error) {
      this.logger.warn(
        `Failed to remove job ${queueName}/${jobId}: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
    }
  }

  async getQueueDepth(queueName: QueueName): Promise<number> {
    if (!this.queues) {
      return 0;
    }

    const counts = await this.queues[queueName].getJobCounts(
      'waiting',
      'active',
      'delayed',
      'prioritized',
      'waiting-children',
    );

    return Object.values(counts).reduce(
      (total, value) => total + (typeof value === 'number' ? value : 0),
      0,
    );
  }

  async getRedisReadiness(): Promise<{ ready: boolean; status: string }> {
    if (this.connectionsDisabled) {
      return {
        ready: true,
        status: 'disabled',
      };
    }

    if (!this.connection) {
      return {
        ready: false,
        status: 'unavailable',
      };
    }

    const redisStatus = this.connection.status;
    if (redisStatus !== 'ready') {
      return {
        ready: false,
        status: redisStatus,
      };
    }

    try {
      await this.connection.ping();
      return {
        ready: true,
        status: redisStatus,
      };
    } catch (error) {
      this.logger.error(
        'Redis readiness ping failed',
        error instanceof Error ? error.message : 'Unknown error',
      );
      return {
        ready: false,
        status: 'error',
      };
    }
  }

  private async enqueue<TPayload extends QueuePayload>(
    queueName: QueueName,
    payload: TPayload,
    options?: QueueEnqueueOptions,
  ): Promise<QueueJobHandle<TPayload>> {
    if (!this.queues) {
      throw new Error('Queue connections are unavailable');
    }

    const job = await this.queues[queueName].add(queueName, payload, options);
    this.logger.log(
      JSON.stringify({
        type: 'queue_enqueue',
        queueName,
        jobId: job.id ?? String(options?.jobId ?? ''),
      }),
    );

    return {
      job,
      jobId: job.id ?? String(options?.jobId ?? ''),
      queueName,
    };
  }
}
