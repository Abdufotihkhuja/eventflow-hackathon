import { PrismaService } from './prisma.service';

describe('PrismaService slow-query logging', () => {
  const handleQueryEvent = Reflect.get(
    PrismaService.prototype,
    'handleQueryEvent',
  ) as (this: object, event: { query: string; duration: number; target: string }) => void;

  it('skips queries below the configured threshold', () => {
    const context = {
      slowQueryThresholdMs: 500,
      operationalMetricsService: {
        isEnabled: jest.fn(() => true),
        recordSlowQuery: jest.fn(),
      },
      logger: {
        warn: jest.fn(),
      },
    };

    handleQueryEvent.call(context, {
      query: 'select 1',
      duration: 120,
      target: 'postgres',
    });

    expect(
      context.operationalMetricsService.recordSlowQuery,
    ).not.toHaveBeenCalled();
    expect(context.logger.warn).not.toHaveBeenCalled();
  });

  it('records structured payload for slow queries at or above the threshold', () => {
    const context = {
      slowQueryThresholdMs: 500,
      operationalMetricsService: {
        isEnabled: jest.fn(() => true),
        recordSlowQuery: jest.fn(),
      },
      logger: {
        warn: jest.fn(),
      },
    };

    handleQueryEvent.call(context, {
      query: 'select * from "Event"',
      duration: 825,
      target: 'postgres',
    });

    expect(context.operationalMetricsService.recordSlowQuery).toHaveBeenCalledWith({
      durationMs: 825,
      operation: 'SELECT',
    });

    expect(context.logger.warn).toHaveBeenCalledTimes(1);
    expect(JSON.parse(context.logger.warn.mock.calls[0][0] as string)).toEqual(
      expect.objectContaining({
        type: 'db_slow_query',
        durationMs: 825,
        operation: 'SELECT',
        thresholdMs: 500,
        target: 'postgres',
      }),
    );
  });
});
