import type { Request } from 'express';
import { buildRouteLabel, escapePrometheusLabel } from './observability.helpers';

describe('observability helpers', () => {
  it('builds a route-template label from baseUrl and route.path', () => {
    const request = {
      baseUrl: '/api/v1/public',
      route: {
        path: '/events/:id',
      },
      path: '/api/v1/public/events/123',
      originalUrl: '/api/v1/public/events/123',
      url: '/api/v1/public/events/123',
    } as Request;

    expect(buildRouteLabel(request)).toBe('/api/v1/public/events/:id');
  });

  it('adds a slash when route.path is emitted without a leading separator', () => {
    const request = {
      baseUrl: '/api/v1/public/events',
      route: {
        path: ':id',
      },
      path: '/api/v1/public/events/123',
      originalUrl: '/api/v1/public/events/123',
      url: '/api/v1/public/events/123',
    } as Request;

    expect(buildRouteLabel(request)).toBe('/api/v1/public/events/:id');
  });

  it('falls back to the request path when route metadata is missing', () => {
    const request = {
      baseUrl: '',
      path: '/api/v1/internal/metrics',
      originalUrl: '/api/v1/internal/metrics',
      url: '/api/v1/internal/metrics',
    } as Request;

    expect(buildRouteLabel(request)).toBe('/api/v1/internal/metrics');
  });

  it('escapes prometheus label values', () => {
    expect(escapePrometheusLabel('path "with" slash\\n')).toBe(
      'path \\"with\\" slash\\\\n',
    );
  });
});
