import {
  createCsrfToken,
  readCookie,
  verifyCsrfToken,
  WEB_ACCESS_COOKIE,
  WEB_ACCESS_COOKIE_DEV,
  webCookieNames,
  webCookieOptions,
} from './web-session.util';

describe('web session primitives', () => {
  it('signs CSRF tokens and rejects tampering', () => {
    const token = createCsrfToken('test-secret');
    expect(verifyCsrfToken(token, 'test-secret')).toBe(true);
    expect(verifyCsrfToken(`${token}x`, 'test-secret')).toBe(false);
    expect(verifyCsrfToken(token, 'different-secret')).toBe(false);
  });

  it('reads an exact cookie without accepting a prefix collision', () => {
    expect(
      readCookie(
        `prefix_${WEB_ACCESS_COOKIE}=wrong; ${WEB_ACCESS_COOKIE}=right`,
        WEB_ACCESS_COOKIE,
      ),
    ).toBe('right');
  });

  it('keeps __Host cookies on HTTPS and uses host-only dev cookies on HTTP', () => {
    const httpsRequest = { secure: true, headers: {} } as never;
    const httpRequest = { secure: false, headers: {} } as never;

    expect(webCookieNames(httpsRequest).access).toBe(WEB_ACCESS_COOKIE);
    expect(webCookieOptions(httpsRequest, 1_000, true).secure).toBe(true);
    expect(webCookieNames(httpRequest).access).toBe(WEB_ACCESS_COOKIE_DEV);
    expect(webCookieOptions(httpRequest, 1_000, true).secure).toBe(false);
  });
});
