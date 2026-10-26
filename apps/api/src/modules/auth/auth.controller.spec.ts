import { AuthController } from './auth.controller';

describe('AuthController', () => {
  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'frontend.publicUrl' || key === 'FRONTEND_PUBLIC_URL') {
        return 'https://eventflow.uz';
      }

      return undefined;
    }),
    getOrThrow: jest.fn().mockReturnValue('csrf-secret'),
  };

  const authService = {
    registerUser: jest.fn().mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      emailVerificationRequired: true,
    }),
    handleGoogleUserAuth: jest.fn().mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      isNewUser: true,
      isOnboardingCompleted: false,
    }),
    handleLinkedInUserAuth: jest.fn(),
    logout: jest.fn().mockResolvedValue(undefined),
  };

  const loginThrottle = {
    assertNotLocked: jest.fn().mockResolvedValue(undefined),
    registerFailure: jest.fn().mockResolvedValue(undefined),
    reset: jest.fn().mockResolvedValue(undefined),
  };

  const mobileOAuthExchanges = {
    issue: jest.fn().mockResolvedValue('a'.repeat(43)),
    consume: jest.fn(),
  };

  const controller = new AuthController(
    authService as never,
    configService as never,
    loginThrottle as never,
    mobileOAuthExchanges as never,
  );

  it('registers web users without exposing bearer credentials in the body', async () => {
    const cookie = jest.fn();
    const clearCookie = jest.fn();
    const result = await controller.registerWeb(
      {
        firstName: 'Event',
        lastName: 'Flow',
        email: 'user@example.com',
        password: 'Strong1!',
        passwordConfirm: 'Strong1!',
      },
      { headers: {}, secure: true, socket: {} } as never,
      { cookie, clearCookie } as never,
    );

    expect(result).toEqual({
      authenticated: true,
      csrfToken: expect.any(String),
      emailVerificationRequired: true,
    });
    expect(result).not.toHaveProperty('accessToken');
    expect(result).not.toHaveProperty('refreshToken');
    expect(cookie).toHaveBeenCalledTimes(3);
    // Секьюрный запрос ставит набор `__Host-`, значит набор без префикса,
    // оставшийся от прошлой конфигурации прокси, надо убрать — иначе он
    // переживёт логин и readWebCookie будет находить его как живую сессию.
    expect(clearCookie.mock.calls.map(([name]) => name)).toEqual([
      'ef_access',
      'ef_refresh',
      'ef_csrf',
    ]);
  });

  it('clears both cookie name sets on web logout', async () => {
    const clearCookie = jest.fn();
    await controller.logoutWeb(
      {
        headers: { cookie: 'ef_refresh=stale' },
        secure: true,
        socket: {},
      } as never,
      { clearCookie } as never,
    );

    expect(authService.logout).toHaveBeenCalledWith('stale');
    expect(clearCookie.mock.calls.map(([name]) => name)).toEqual([
      '__Host-ef_access',
      '__Host-ef_refresh',
      '__Host-ef_csrf',
      'ef_access',
      'ef_refresh',
      'ef_csrf',
    ]);
  });

  it('redirects web OAuth without URL tokens and sets HttpOnly cookies', async () => {
    const redirect = jest.fn();
    const cookie = jest.fn();

    // Валидный OAuth state: nonce совпадает в state и в cookie (CSRF-проверка).
    await controller.googleCallback(
      {
        user: {
          email: 'user@example.com',
          name: 'Event Flow',
          providerId: 'provider-id',
        },
        headers: { cookie: 'ef_oauth_state=test-nonce' },
        secure: true,
        socket: {},
      } as never,
      { redirect, clearCookie: jest.fn(), cookie } as never,
      'user.test-nonce',
    );

    expect(redirect).toHaveBeenCalledTimes(1);

    const redirectedTo = redirect.mock.calls[0][0] as string;
    const url = new URL(redirectedTo);

    expect(url.searchParams.get('accessToken')).toBeNull();
    expect(url.searchParams.get('refreshToken')).toBeNull();

    expect(url.hash).toBe('');
    expect(url.searchParams.get('oauth')).toBe('success');
    expect(cookie).toHaveBeenCalledTimes(3);
    expect(cookie).toHaveBeenCalledWith(
      '__Host-ef_access',
      'access-token',
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
      }),
    );
  });

  it('redirects mobile OAuth with only a single-use exchange code', async () => {
    configService.get.mockImplementation((key: string) =>
      key === 'frontend.mobileOAuthRedirect'
        ? 'eventflow://auth/callback'
        : undefined,
    );
    const redirect = jest.fn();

    await controller.googleCallback(
      {
        user: {
          email: 'user@example.com',
          name: 'Event Flow',
          providerId: 'provider-id',
        },
        headers: { cookie: 'ef_oauth_state=test-nonce' },
        socket: {},
      } as never,
      { redirect, clearCookie: jest.fn(), cookie: jest.fn() } as never,
      'user.mobile.test-nonce',
    );

    const redirectedTo = redirect.mock.calls[0][0] as string;
    expect(redirectedTo).toBe(
      `eventflow://auth/callback?code=${'a'.repeat(43)}`,
    );
    expect(redirectedTo).not.toContain('accessToken');
    expect(redirectedTo).not.toContain('refreshToken');
    expect(new URL(redirectedTo).hash).toBe('');
  });
});
