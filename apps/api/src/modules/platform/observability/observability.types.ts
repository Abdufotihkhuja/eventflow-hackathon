export interface RequestMetricInput {
  method: string;
  route: string;
  statusCode: number;
  durationMs: number;
}

export interface SlowQueryMetricInput {
  durationMs: number;
  model?: string;
  operation?: string;
}

export interface QueueWaitMetricInput {
  queueName: string;
  status: 'completed' | 'failed' | 'timed_out';
}

export interface QueueDepthSnapshot {
  queueName: string;
  depth: number;
}
