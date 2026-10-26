import { CookieCsrfGuard } from './cookie-csrf.guard';
import {
  createCsrfToken,
  WEB_ACCESS_COOKIE,
  WEB_CSRF_COOKIE,
  WEB_REFRESH_COOKIE,
} from '../../modules/auth/web-session.util';

describe('CookieCsrfGuard', () => {
  const secret = 'csrf-secret';
  const config = {
    get: jest.fn((key: string) => {
      if (key === 'jwt.secret') return secret;
      if (key === 'frontend.publicUrl') return 'https://eventflow.uz';
      if (key === 'frontend.appUrl') return 'https://app.eventflow.uz';
      if (key === 'frontend.adminUrl') return 'https://admin.eventflow.uz';
      return undefined;
    }),
  };
  const reflector = {
    getAllAndOverride: jest.fn((): boolean | undefined => undefined),
  };
  const guard = new CookieCsrfGuard(config as never, reflector as never);

  beforeEach(() => reflector.getAllAndOverride.mockReturnValue(undefined));

  it('does not impose CSRF on native bearer requests', () => {
    expect(guard.canActivate(context({ method: 'POST', headers: {} }))).toBe(
      true,
    );
  });

  it('rejects a signed token sent from an unapproved sibling origin', () => {
    const token = createCsrfToken(secret);
    expect(() =>
      guard.canActivate(
        context({
          method: 'POST',
          headers: {
            origin: 'https://evil.eventflow.uz',
            cookie: `${WEB_ACCESS_COOKIE}=access; ${WEB_CSRF_COOKIE}=${token}`,
            'x-csrf-token': token,
          },
        }),
      ),
    ).toThrow('Web session request отклонён');
  });

  it('accepts exact Origin plus matching signed double-submit token', () => {
    const token = createCsrfToken(secret);
    expect(
      guard.canActivate(
        context({
          method: 'PATCH',
          headers: {
            origin: 'https://app.eventflow.uz',
            cookie: `${WEB_ACCESS_COOKIE}=access; ${WEB_CSRF_COOKIE}=${token}`,
            'x-csrf-token': token,
          },
        }),
      ),
    ).toBe(true);
  });

  it('accepts the admin console origin', () => {
    const token = createCsrfToken(secret);
    expect(
      guard.canActivate(
        context({
          method: 'POST',
          headers: {
            origin: 'https://admin.eventflow.uz',
            cookie: `${WEB_ACCESS_COOKIE}=access; ${WEB_CSRF_COOKIE}=${token}`,
            'x-csrf-token': token,
          },
        }),
      ),
    ).toBe(true);
  });

  // Bearer-клиенты (web-workspace, web-admin) таскают куку web-сессии просто
  // потому, что она стоит на домене API. Аутентификацию она им не даёт, значит
  // и CSRF-гейтом быть не должна.
  it('ignores a stale web-session cookie on a bearer request', () => {
    expect(
      guard.canActivate(
        context({
          method: 'POST',
          headers: {
            origin: 'https://admin.eventflow.uz',
            authorization: 'Bearer access-token',
            cookie: `${WEB_REFRESH_COOKIE}=stale`,
          },
        }),
      ),
    ).toBe(true);
  });

  // Регрессия: протухшая кука запирала логин намертво — токена от новой сессии
  // у клиента ещё нет, а старый прочитать нельзя (кука host-only на API).
  it('lets a session-resetting endpoint through without a CSRF token', () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    expect(
      guard.canActivate(
        context({
          method: 'POST',
          headers: {
            origin: 'https://app.eventflow.uz',
            cookie: `${WEB_REFRESH_COOKIE}=stale`,
          },
        }),
      ),
    ).toBe(true);
  });

  it('still checks Origin on a session-resetting endpoint', () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    expect(() =>
      guard.canActivate(
        context({
          method: 'POST',
          headers: {
            origin: 'https://evil.example',
            cookie: `${WEB_REFRESH_COOKIE}=stale`,
          },
        }),
      ),
    ).toThrow('Web session request отклонён');
  });
});

function context(request: Record<string, unknown>) {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as never;
}
