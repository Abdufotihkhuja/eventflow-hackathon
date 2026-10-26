import { OperationalMetricsService } from './operational-metrics.service';

describe('OperationalMetricsService', () => {
  const originalMetricsEnabled = process.env.METRICS_ENABLED;

  beforeEach(() => {
    process.env.METRICS_ENABLED = 'true';
  });

  afterAll(() => {
    if (originalMetricsEnabled === undefined) {
      delete process.env.METRICS_ENABLED;
      return;
    }

    process.env.METRICS_ENABLED = originalMetricsEnabled;
  });

  it('records request, slow-query, queue wait and queue depth metrics', () => {
    const service = new OperationalMetricsService();

    service.recordRequest({
      method: 'get',
      route: '/api/v1/public/events',
      statusCode: 200,
      durationMs: 72.4,
    });
    service.recordSlowQuery({
      durationMs: 612,
      operation: 'SELECT',
    });
    service.recordQueueWait({
      queueName: 'mail',
      status: 'completed',
    });
    service.setQueueDepth('mail', 3);

    const rendered = service.renderPrometheusMetrics(true);

    expect(rendered).toContain('eventflow_metrics_enabled 1');
    expect(rendered).toContain(
      'eventflow_http_requests_total{method="GET",route="/api/v1/public/events",status_code="200"} 1',
    );
    expect(rendered).toContain(
      'eventflow_http_request_duration_ms_sum{method="GET",route="/api/v1/public/events",status_code="200"} 72.40',
    );
    expect(rendered).toContain('eventflow_db_slow_queries_total 1');
    expect(rendered).toContain(
      'eventflow_queue_wait_total{queue_name="mail",status="completed"} 1',
    );
    expect(rendered).toContain(
      'eventflow_queue_depth{queue_name="mail"} 3',
    );
    expect(service.getRecentSlowQueries()).toHaveLength(1);
  });

  it('stops collecting counters when metrics are disabled', () => {
    process.env.METRICS_ENABLED = 'false';
    const service = new OperationalMetricsService();

    service.recordRequest({
      method: 'GET',
      route: '/api/v1/public/events',
      statusCode: 200,
      durationMs: 20,
    });
    service.recordSlowQuery({
      durationMs: 900,
      operation: 'SELECT',
    });
    service.recordQueueWait({
      queueName: 'tickets',
      status: 'failed',
    });

    const rendered = service.renderPrometheusMetrics(false);

    expect(rendered).toContain('eventflow_metrics_enabled 0');
    expect(rendered).toContain('eventflow_db_slow_queries_total 0');
    expect(rendered).not.toContain('eventflow_http_requests_total{');
    expect(rendered).not.toContain('eventflow_queue_wait_total{');
  });
});
