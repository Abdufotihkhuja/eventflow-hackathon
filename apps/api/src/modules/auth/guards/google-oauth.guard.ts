import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import {
  OAUTH_STATE_COOKIE,
  buildOAuthState,
  generateOAuthNonce,
  oauthStateCookieOptions,
} from '../oauth-state.util';

type AuthType = 'user' | 'organization';

interface OAuthInitRequest {
  query?: { type?: AuthType; platform?: string };
  oauthStateNonce?: string;
}

/**
 * OAuth только для пользователей. Передаёт type в state (всегда user); для
 * мобильного приложения (`?platform=mobile`) добавляет суффикс `.mobile`,
 * чтобы callback вернул токены на deep-link приложения, а не на веб-сайт.
 * Дополнительно кладёт CSRF-nonce в state и в httpOnly-cookie (см.
 * oauth-state.util) — callback сверяет их, защищая от login-CSRF.
 */
@Injectable()
export class GoogleOAuthGuard extends AuthGuard('google') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<OAuthInitRequest>();
    const response = context.switchToHttp().getResponse<Response>();

    // Генерим nonce ДО super.canActivate (который вызывает
    // getAuthenticateOptions и редиректит), кладём в cookie и на request.
    const nonce = generateOAuthNonce();
    request.oauthStateNonce = nonce;
    response.cookie(OAUTH_STATE_COOKIE, nonce, oauthStateCookieOptions());

    return (await super.canActivate(context)) as boolean;
  }

  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<OAuthInitRequest>();
    const type = request.query?.type || 'user';
    const authType = type === 'organization' ? 'user' : type;
    const isMobile = request.query?.platform === 'mobile';
    return {
      state: buildOAuthState(authType, isMobile, request.oauthStateNonce ?? ''),
    };
  }
}
