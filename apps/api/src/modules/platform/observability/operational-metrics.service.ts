import { Injectable } from '@nestjs/common';
import type {
  QueueDepthSnapshot,
  QueueWaitMetricInput,
  RequestMetricInput,
  SlowQueryMetricInput,
} from './observability.types';
import {
  escapePrometheusLabel,
  getRequestDurationBuckets,
} from './observability.helpers';

@Injectable()
export class OperationalMetricsService {
  private readonly requestTotals = new Map<string, number>();
  private readonly requestDurationSums = new Map<string, number>();
  private readonly requestDurationCounts = new Map<string, number>();
  private readonly requestDurationBuckets = new Map<string, number>();
  private readonly queueWaitTotals = new Map<string, number>();
  private readonly queueDepthGauge = new Map<string, number>();
  private readonly scopeResolutionTotals = new Map<string, number>();
  private readonly scopeProjectionMismatchTotals = new Map<string, number>();
  private slowQueryCount = 0;
  private readonly recentSlowQueries: Array<
    SlowQueryMetricInput & { capturedAt: string }
  > = [];

  recordRequest(input: RequestMetricInput): void {
    if (!this.isEnabled()) {
      return;
    }

    const baseLabels = {
      method: input.method.toUpperCase(),
      route: input.route,
      status_code: String(input.statusCode),
    };
    const baseKey = serializeLabels(baseLabels);

    this.incrementMap(this.requestTotals, baseKey);
    this.addToMap(this.requestDurationSums, baseKey, input.durationMs);
    this.incrementMap(this.requestDurationCounts, baseKey);

    for (const bucket of getRequestDurationBuckets()) {
      if (input.durationMs <= bucket) {
        this.incrementMap(
          this.requestDurationBuckets,
          serializeLabels({ ...baseLabels, le: String(bucket) }),
        );
      }
    }

    this.incrementMap(
      this.requestDurationBuckets,
      serializeLabels({ ...baseLabels, le: '+Inf' }),
    );
  }

  recordSlowQuery(input: SlowQueryMetricInput): void {
    if (!this.isEnabled()) {
      return;
    }

    this.slowQueryCount += 1;
    this.recentSlowQueries.unshift({
      ...input,
      capturedAt: new Date().toISOString(),
    });
    this.recentSlowQueries.splice(10);
  }

  recordQueueWait(input: QueueWaitMetricInput): void {
    if (!this.isEnabled()) {
      return;
    }

    this.incrementMap(
      this.queueWaitTotals,
      serializeLabels({
        queue_name: input.queueName,
        status: input.status,
      }),
    );
  }

  setQueueDepth(queueName: string, depth: number): void {
    this.queueDepthGauge.set(queueName, depth);
  }

  setQueueDepths(snapshots: QueueDepthSnapshot[]): void {
    for (const snapshot of snapshots) {
      this.setQueueDepth(snapshot.queueName, snapshot.depth);
    }
  }

  recordScopeResolution(availability: string): void {
    if (this.isEnabled()) {
      this.incrementMap(this.scopeResolutionTotals, availability);
    }
  }

  recordScopeProjectionMismatch(kind: string): void {
    if (this.isEnabled()) {
      this.incrementMap(this.scopeProjectionMismatchTotals, kind);
    }
  }

  getSlowQueryCount(): number {
    return this.slowQueryCount;
  }

  getRecentSlowQueries(): Array<SlowQueryMetricInput & { capturedAt: string }> {
    return [...this.recentSlowQueries];
  }

  renderPrometheusMetrics(enabled: boolean): string {
    const lines = [
      '# HELP eventflow_metrics_enabled Whether in-process operational metrics collection is enabled.',
      '# TYPE eventflow_metrics_enabled gauge',
      `eventflow_metrics_enabled ${enabled ? 1 : 0}`,
      '# HELP eventflow_http_requests_total Total HTTP requests observed by route template.',
      '# TYPE eventflow_http_requests_total counter',
      ...this.renderMapMetric(
        'eventflow_http_requests_total',
        this.requestTotals,
      ),
      '# HELP eventflow_http_request_duration_ms Request duration buckets in milliseconds.',
      '# TYPE eventflow_http_request_duration_ms histogram',
      ...this.renderMapMetric(
        'eventflow_http_request_duration_ms_bucket',
        this.requestDurationBuckets,
      ),
      ...this.renderMapMetric(
        'eventflow_http_request_duration_ms_sum',
        this.requestDurationSums,
      ),
      ...this.renderMapMetric(
        'eventflow_http_request_duration_ms_count',
        this.requestDurationCounts,
      ),
      '# HELP eventflow_db_slow_queries_total Total slow Prisma queries above the configured threshold.',
      '# TYPE eventflow_db_slow_queries_total counter',
      `eventflow_db_slow_queries_total ${this.slowQueryCount}`,
      '# HELP eventflow_queue_wait_total Queue wait results grouped by queue and status.',
      '# TYPE eventflow_queue_wait_total counter',
      ...this.renderMapMetric(
        'eventflow_queue_wait_total',
        this.queueWaitTotals,
      ),
      '# HELP eventflow_queue_depth Current queue depth by queue name.',
      '# TYPE eventflow_queue_depth gauge',
      ...this.renderQueueDepthMetric(),
      '# HELP eventflow_scope_resolution_total Live scope resolutions grouped by availability.',
      '# TYPE eventflow_scope_resolution_total counter',
      ...this.renderSimpleLabelMetric(
        'eventflow_scope_resolution_total',
        'availability',
        this.scopeResolutionTotals,
      ),
      '# HELP eventflow_scope_projection_mismatch_total Legacy/canonical projection mismatches.',
      '# TYPE eventflow_scope_projection_mismatch_total counter',
      ...this.renderSimpleLabelMetric(
        'eventflow_scope_projection_mismatch_total',
        'kind',
        this.scopeProjectionMismatchTotals,
      ),
    ];

    return `${lines.join('\n')}\n`;
  }

  isEnabled(): boolean {
    return process.env.METRICS_ENABLED !== 'false';
  }

  private renderMapMetric(
    metricName: string,
    source: Map<string, number>,
  ): string[] {
    return [...source.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([serializedLabels, value]) => {
        const labels = deserializeLabels(serializedLabels);
        return `${metricName}${formatPrometheusLabels(labels)} ${formatMetricValue(value)}`;
      });
  }

  private renderQueueDepthMetric(): string[] {
    return [...this.queueDepthGauge.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(
        ([queueName, depth]) =>
          `eventflow_queue_depth${formatPrometheusLabels({
            queue_name: queueName,
          })} ${formatMetricValue(depth)}`,
      );
  }

  private renderSimpleLabelMetric(
    metricName: string,
    labelName: string,
    source: Map<string, number>,
  ): string[] {
    return [...source.entries()].map(
      ([label, value]) =>
        `${metricName}${formatPrometheusLabels({ [labelName]: label })} ${value}`,
    );
  }

  private incrementMap(source: Map<string, number>, key: string): void {
    source.set(key, (source.get(key) ?? 0) + 1);
  }

  private addToMap(
    source: Map<string, number>,
    key: string,
    amount: number,
  ): void {
    source.set(key, (source.get(key) ?? 0) + amount);
  }
}

function serializeLabels(labels: Record<string, string>): string {
  return Object.entries(labels)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('|');
}

function deserializeLabels(serialized: string): Record<string, string> {
  return Object.fromEntries(
    serialized
      .split('|')
      .filter(Boolean)
      .map((entry) => {
        const [key, ...rest] = entry.split('=');
        return [key, rest.join('=')];
      }),
  );
}

function formatPrometheusLabels(labels: Record<string, string>): string {
  const entries = Object.entries(labels);

  if (entries.length === 0) {
    return '';
  }

  const rendered = entries
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}="${escapePrometheusLabel(value)}"`)
    .join(',');

  return `{${rendered}}`;
}

function formatMetricValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}
