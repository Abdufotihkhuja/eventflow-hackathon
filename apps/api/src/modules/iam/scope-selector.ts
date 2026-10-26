import { BadRequestException } from '@nestjs/common';

export type ScopeSelector =
  | { kind: 'PERSONAL' }
  | { kind: 'ORGANIZATION'; organizationId: string };

const ORGANIZATION_SCOPE =
  /^organization:([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/;

export function parseScopeSelector(value: unknown): ScopeSelector {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > 64 ||
    value.includes(',') ||
    value.trim() !== value
  ) {
    throw invalidScope();
  }
  if (value === 'personal') {
    return { kind: 'PERSONAL' };
  }
  const match = ORGANIZATION_SCOPE.exec(value);
  if (!match) {
    throw invalidScope();
  }
  return { kind: 'ORGANIZATION', organizationId: match[1] };
}

function invalidScope(): BadRequestException {
  return new BadRequestException({
    code: 'SCOPE_INVALID',
    message: 'Некорректный X-EventFlow-Scope',
  });
}
