import http from 'node:http';
import process from 'node:process';
import { Worker, type ConnectionOptions } from 'bullmq';
import { Redis } from 'ioredis';
import { loadWorkerRuntimeConfig } from './env.js';

const runtimeConfig = loadWorkerRuntimeConfig(process.env);
const redisUrl = runtimeConfig.redisUrl;
const apiInternalUrl = runtimeConfig.apiInternalUrl;
const apiInternalHost = process.env.API_INTERNAL_HOST;
const internalJobToken = runtimeConfig.internalJobToken;
const workerHealthPort = runtimeConfig.workerHealthPort;
const workerProfile = runtimeConfig.workerProfile;
const mailConcurrency = runtimeConfig.mailConcurrency;
const pushConcurrency = runtimeConfig.pushConcurrency;
const ticketsConcurrency = runtimeConfig.ticketsConcurrency;
const certificatesConcurrency = runtimeConfig.certificatesConcurrency;
const badgesConcurrency = runtimeConfig.badgesConcurrency;

const connection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// bullmq bundles its own ioredis copy. When npm resolves a separate ioredis for
// it (e.g. on a clean prod install), the shared instance is identical at runtime
// but not type-assignable across the two ioredis copies, so we pass it through
// bullmq's ConnectionOptions. bullmq duck-types the connection, so sharing this
// single instance across workers still works at runtime.
const queueConnection = connection as unknown as ConnectionOptions;

async function getWorkerReadiness(): Promise<{
  ready: boolean;
  redisStatus: string;
}> {
  const redisStatus = connection.status;
  if (redisStatus !== 'ready') {
    return {
      ready: false,
      redisStatus,
    };
  }

  try {
    await connection.ping();
    return {
      ready: true,
      redisStatus,
    };
  } catch {
    return {
      ready: false,
      redisStatus: 'error',
    };
  }
}

async function postInternalJob(path: string, payload: unknown) {
  const response = await fetch(`${apiInternalUrl}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-internal-job-token': internalJobToken,
      ...(apiInternalHost ? { host: apiInternalHost } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status} ${response.statusText}: ${text}`);
  }

  return response.json();
}

const workers: Worker[] = [];

if (workerProfile === 'all' || workerProfile === 'default') {
  workers.push(
    // E-11b: гигиенический свип биллинга (repeatable-задание из API).
    new Worker(
      'billing.sweeps',
      async (job) => postInternalJob('/billing/sweep', job.data),
      { connection: queueConnection, concurrency: 1 },
    ),
    // Уборка брошенных черновиков регистрации (repeatable-задание из API).
    new Worker(
      'maintenance.sweeps',
      async (job) => postInternalJob('/registration-files/sweep', job.data),
      { connection: queueConnection, concurrency: 1 },
    ),
    new Worker('mail.send', async (job) => postInternalJob('/mail/send', job.data), {
      connection: queueConnection,
      concurrency: mailConcurrency,
    }),
    // Push-канал (BL-14): отправка батча через Expo + отложенный опрос
    // receipts (~15 мин после send) в одной очереди, ветвление по type.
    new Worker(
      'push.send',
      async (job) => {
        if (job.data?.type === 'push.receipts') {
          return postInternalJob('/push/receipts', job.data);
        }

        return postInternalJob('/push/send', job.data);
      },
      { connection: queueConnection, concurrency: pushConcurrency },
    ),
    // Диспатчер уведомлений: тик dispatch-due (60s) + reaper застрявших
    // enqueued-доставок (10 мин). Repeatable-задания из API; concurrency 1 —
    // конкуренцию реплик решает FOR UPDATE SKIP LOCKED на стороне API.
    new Worker(
      'notifications.jobs',
      async (job) => {
        if (job.data?.type === 'notifications.reaper') {
          return postInternalJob('/notifications/reaper', job.data);
        }
        // Суточный reconcile-свип цепочек (Батч 6б): недостающие плановые
        // строки + осиротевшие + digest-фабрика.
        if (job.data?.type === 'notifications.reconcile') {
          return postInternalJob('/notifications/reconcile', job.data);
        }

        return postInternalJob('/notifications/dispatch-due', job.data);
      },
      { connection: queueConnection, concurrency: 1 },
    ),
  );
}

if (workerProfile === 'all' || workerProfile === 'assets') {
  workers.push(
    new Worker(
      'tickets.generate',
      async (job) => {
        if (job.data?.type === 'ticket.zip') {
          return postInternalJob('/tickets/zip', job.data);
        }

        return postInternalJob('/tickets/generate', job.data);
      },
      {
        connection: queueConnection,
        concurrency: ticketsConcurrency,
      },
    ),
  );

  workers.push(
    new Worker(
      'certificates.generate',
      async (job) => postInternalJob('/certificates/generate', job.data),
      {
        connection: queueConnection,
        concurrency: certificatesConcurrency,
      },
    ),
  );

  // Бейджи не персистятся: ZIP собирается заново на каждую выгрузку и на
  // десятках получателей не укладывается в таймаут браузера — сборка идёт сюда.
  workers.push(
    new Worker(
      'badges.generate',
      async (job) => postInternalJob('/badges/zip', job.data),
      {
        connection: queueConnection,
        concurrency: badgesConcurrency,
      },
    ),
  );
}

const healthServer = http.createServer((request, response) => {
  void handleHealthRequest(request, response);
});

async function handleHealthRequest(
  request: http.IncomingMessage,
  response: http.ServerResponse,
): Promise<void> {
  if (request.url === '/health/live') {
    response.statusCode = 200;
    response.setHeader('content-type', 'application/json');
    response.end(
      JSON.stringify({
        status: 'ok',
        profile: workerProfile,
      }),
    );
    return;
  }

  if (request.url !== '/health' && request.url !== '/health/ready') {
    response.statusCode = 404;
    response.end('not found');
    return;
  }

  const readiness = await getWorkerReadiness();

  response.statusCode = readiness.ready ? 200 : 503;
  response.setHeader('content-type', 'application/json');
  response.end(
    JSON.stringify({
      status: readiness.ready ? 'ready' : 'degraded',
      profile: workerProfile,
      redisStatus: readiness.redisStatus,
      queues: workers.map((worker) => ({
        name: worker.name,
        concurrency:
          worker.name === 'mail.send'
            ? mailConcurrency
            : worker.name === 'push.send'
              ? pushConcurrency
              : worker.name === 'tickets.generate'
                ? ticketsConcurrency
                : worker.name === 'badges.generate'
                  ? badgesConcurrency
                  : certificatesConcurrency,
      })),
    }),
  );
}

for (const worker of workers) {
  worker.on('ready', () => {
    console.log(`[worker] ${worker.name} ready`);
  });

  worker.on('completed', (job) => {
    console.log(`[worker] ${worker.name} completed job ${job.id}`);
  });

  worker.on('failed', (job, error) => {
    console.error(
      `[worker] ${worker.name} failed job ${job?.id ?? 'unknown'}: ${error.message}`,
    );
  });
}

async function shutdown(signal: string) {
  console.log(`[worker] shutting down on ${signal}`);
  await new Promise<void>((resolve, reject) => {
    healthServer.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
  await Promise.all(workers.map((worker) => worker.close()));
  await connection.quit();
  process.exit(0);
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});
process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

console.log(`[worker] EventFlow queue worker started [profile=${workerProfile}]`);
healthServer.listen(workerHealthPort, () => {
  console.log(`[worker] health endpoint listening on :${workerHealthPort}`);
});
