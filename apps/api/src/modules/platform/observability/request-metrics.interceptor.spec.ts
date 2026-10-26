import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { RequestMetricsInterceptor } from './request-metrics.interceptor';

describe('RequestMetricsInterceptor', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('records route label, status code and duration for HTTP requests', async () => {
    const operationalMetricsService = {
      isEnabled: jest.fn(() => true),
      recordRequest: jest.fn(),
    };
    const interceptor = new RequestMetricsInterceptor(
      operationalMetricsService as never,
    );
    const request = {
      method: 'GET',
      baseUrl: '/api/v1/public/events',
      route: {
        path: ':id',
      },
      path: '/api/v1/public/events/evt_123',
      originalUrl: '/api/v1/public/events/evt_123',
      url: '/api/v1/public/events/evt_123',
    };
    const response = {
      statusCode: 200,
    };
    const context = {
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ExecutionContext;
    const next = {
      handle: () => of('ok'),
    } as CallHandler;

    jest
      .spyOn(performance, 'now')
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(148.25);

    await lastValueFrom(interceptor.intercept(context, next));

    expect(operationalMetricsService.recordRequest).toHaveBeenCalledWith({
      method: 'GET',
      route: '/api/v1/public/events/:id',
      statusCode: 200,
      durationMs: 48.25,
    });
  });

  it('does not record metrics when observability is disabled', async () => {
    const operationalMetricsService = {
      isEnabled: jest.fn(() => false),
      recordRequest: jest.fn(),
    };
    const interceptor = new RequestMetricsInterceptor(
      operationalMetricsService as never,
    );
    const context = {
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'GET',
        }),
        getResponse: () => ({
          statusCode: 200,
        }),
      }),
    } as unknown as ExecutionContext;
    const next = {
      handle: () => of('ok'),
    } as CallHandler;

    await lastValueFrom(interceptor.intercept(context, next));

    expect(operationalMetricsService.recordRequest).not.toHaveBeenCalled();
  });
});
