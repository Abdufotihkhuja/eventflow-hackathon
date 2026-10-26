import { ScopeContextGuard } from './scope-context.guard';

describe('ScopeContextGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() };
  const scopeResolver = { resolve: jest.fn() };
  const guard = new ScopeContextGuard(
    reflector as never,
    scopeResolver as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('does not require a selector for unscoped legacy endpoints', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    await expect(guard.canActivate(context({}))).resolves.toBe(true);
    expect(scopeResolver.resolve).not.toHaveBeenCalled();
  });

  it('rejects a route/body tenant that differs from the resolved scope', async () => {
    reflector.getAllAndOverride.mockReturnValue([]);
    scopeResolver.resolve.mockResolvedValue(
      organizationScope('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
    );

    await expect(
      guard.canActivate(
        context({
          user: { accountId: 'account-1' },
          headers: {
            'x-eventflow-scope':
              'organization:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          },
          params: {
            organizationId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          },
        }),
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'SCOPE_TENANT_MISMATCH' }),
    });
  });

  it('attaches a live context only when every capability is present', async () => {
    const request = {
      user: { accountId: 'account-1' },
      headers: {
        'x-eventflow-scope':
          'organization:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      },
    };
    const scope = organizationScope('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    reflector.getAllAndOverride.mockReturnValue(['events:read']);
    scopeResolver.resolve.mockResolvedValue(scope);

    await expect(guard.canActivate(context(request))).resolves.toBe(true);
    expect(request).toHaveProperty('resolvedScope', scope);
  });

  it('fails closed when a required capability is absent', async () => {
    reflector.getAllAndOverride.mockReturnValue(['events:delete']);
    scopeResolver.resolve.mockResolvedValue(
      organizationScope('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
    );

    await expect(
      guard.canActivate(
        context({
          user: { accountId: 'account-1' },
          headers: {
            'x-eventflow-scope':
              'organization:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          },
        }),
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'SCOPE_CAPABILITY_REQUIRED' }),
    });
  });
});

function organizationScope(organizationId: string) {
  return {
    kind: 'ORGANIZATION',
    accountId: 'account-1',
    userId: null,
    organizationId,
    membershipId: 'membership-1',
    capabilities: ['events:read'],
  };
}

function context(request: Record<string, unknown>) {
  request.headers ??= {};
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => request }),
  } as never;
}
