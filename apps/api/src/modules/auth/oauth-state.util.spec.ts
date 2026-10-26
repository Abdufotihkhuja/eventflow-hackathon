import {
  buildOAuthState,
  extractOAuthNonce,
  oauthNonceMatches,
  readOAuthStateCookie,
  generateOAuthNonce,
  OAUTH_STATE_COOKIE,
} from './oauth-state.util';

describe('oauth-state.util (CSRF nonce)', () => {
  it('builds state with the nonce as the last segment', () => {
    expect(buildOAuthState('user', false, 'abc123')).toBe('user.abc123');
    expect(buildOAuthState('user', true, 'abc123')).toBe('user.mobile.abc123');
  });

  it('extracts the nonce (last segment) for web and mobile states', () => {
    expect(extractOAuthNonce('user.abc123')).toBe('abc123');
    expect(extractOAuthNonce('user.mobile.abc123')).toBe('abc123');
    expect(extractOAuthNonce(undefined)).toBeUndefined();
    // Одиночный сегмент (легаси/без nonce) — nonce не извлекается → будет отклонён.
    expect(extractOAuthNonce('user')).toBeUndefined();
  });

  it('round-trips build → extract', () => {
    const nonce = generateOAuthNonce();
    expect(extractOAuthNonce(buildOAuthState('user', false, nonce))).toBe(nonce);
    expect(extractOAuthNonce(buildOAuthState('user', true, nonce))).toBe(nonce);
  });

  it('reads the state cookie from a raw Cookie header', () => {
    expect(
      readOAuthStateCookie(`other=1; ${OAUTH_STATE_COOKIE}=xyz789; a=b`),
    ).toBe('xyz789');
    expect(readOAuthStateCookie(`${OAUTH_STATE_COOKIE}=solo`)).toBe('solo');
    expect(readOAuthStateCookie('other=1')).toBeUndefined();
    expect(readOAuthStateCookie(undefined)).toBeUndefined();
  });

  it('matches nonces in constant time, rejecting mismatch/empty', () => {
    expect(oauthNonceMatches('abc', 'abc')).toBe(true);
    expect(oauthNonceMatches('abc', 'abd')).toBe(false);
    expect(oauthNonceMatches('abc', 'abcd')).toBe(false); // разная длина
    expect(oauthNonceMatches(undefined, 'abc')).toBe(false);
    expect(oauthNonceMatches('abc', undefined)).toBe(false);
    expect(oauthNonceMatches(undefined, undefined)).toBe(false);
  });

  it('generates a non-trivial random nonce', () => {
    const a = generateOAuthNonce();
    const b = generateOAuthNonce();
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(a).not.toBe(b);
  });

  it('end-to-end: a forged state (no matching cookie) is rejected', () => {
    // Легитимный флоу: guard кладёт nonce и в cookie, и в state.
    const nonce = generateOAuthNonce();
    const state = buildOAuthState('user', false, nonce);
    const cookieHeader = `${OAUTH_STATE_COOKIE}=${nonce}`;
    expect(
      oauthNonceMatches(
        extractOAuthNonce(state),
        readOAuthStateCookie(cookieHeader),
      ),
    ).toBe(true);

    // CSRF: злоумышленник шлёт свой state, но в браузере жертвы нет его cookie.
    const attackerState = buildOAuthState('user', false, generateOAuthNonce());
    expect(
      oauthNonceMatches(
        extractOAuthNonce(attackerState),
        readOAuthStateCookie('unrelated=1'),
      ),
    ).toBe(false);
  });
});
