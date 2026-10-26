import type { Request } from 'express';

const REQUEST_DURATION_BUCKETS = [
  25,
  50,
  100,
  250,
  500,
  1000,
  2500,
  5000,
] as const;

export function getRequestDurationBuckets(): readonly number[] {
  return REQUEST_DURATION_BUCKETS;
}

export function escapePrometheusLabel(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

export function buildRouteLabel(request: Request): string {
  const baseUrl = normalizePath(request.baseUrl);
  const routePath = extractRoutePath(request);

  if (!routePath) {
    return normalizePath(request.path || request.originalUrl || request.url || 'unknown');
  }

  return joinRouteParts(baseUrl, routePath);
}

function extractRoutePath(request: Request): string {
  const route = request.route;

  if (!route) {
    return '';
  }

  if (typeof route.path === 'string') {
    return route.path;
  }

  if (Array.isArray(route.path)) {
    return route.path[0] ?? '';
  }

  return '';
}

function normalizePath(path: string): string {
  if (!path) {
    return '/';
  }

  const withLeadingSlash = path.startsWith('/') ? path : `/${path}`;
  return withLeadingSlash.replace(/\/+/g, '/');
}

function joinRouteParts(baseUrl: string, routePath: string): string {
  if (!baseUrl || baseUrl === '/') {
    return normalizePath(routePath);
  }

  if (!routePath) {
    return normalizePath(baseUrl);
  }

  return normalizePath(
    routePath.startsWith('/') ? `${baseUrl}${routePath}` : `${baseUrl}/${routePath}`,
  );
}
