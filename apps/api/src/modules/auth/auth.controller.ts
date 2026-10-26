import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  ForbiddenException,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { LinkedInOAuthGuard } from './guards/linkedin-oauth.guard';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { CurrentUser, Public, SkipCookieCsrf } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards';
import type { ICurrentUser } from '../../common/interfaces';
import { AuthService } from './auth.service';
import { LoginThrottleService } from './login-throttle.service';
import {
  OAUTH_STATE_COOKIE,
  extractOAuthNonce,
  oauthNonceMatches,
  readOAuthStateCookie,
} from './oauth-state.util';
import {
  ChangePasswordDto,
  LoginDto,
  MemberLoginDto,
  MobileOAuthExchangeDto,
  RefreshTokenDto,
  RegisterOrganizationDto,
  RegisterResponseDto,
  RegisterUserDto,
  SessionResponseDto,
  TokensResponseDto,
  WebRefreshDto,
} from './dto';
import { MobileOAuthExchangeService } from './mobile-oauth-exchange.service';
import { GoogleProfile } from './strategies/google.strategy';
import { LinkedInProfile } from './strategies/linkedin.strategy';
import { ConfigService } from '@nestjs/config';
import {
  ALL_WEB_COOKIE_NAMES,
  createCsrfToken,
  readWebCsrfCookie,
  readWebRefreshCookie,
  verifyCsrfToken,
  webCookieOptions,
  webCookieNames,
} from './web-session.util';

// Rate limit constants для auth endpoints
const AUTH_THROTTLE_TTL = 60000; // 1 минута
const LOGIN_LIMIT = 15; // попыток входа в минуту на IP (учитывает общий NAT офиса/вуза)
const REGISTER_LIMIT = 15; // регистраций в минуту на IP (массовый набор на событие из одной сети)
const REFRESH_LIMIT = 10; // 10 обновлений токенов в минуту

type AuthType = 'user' | 'organization';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly loginThrottle: LoginThrottleService,
    private readonly mobileOAuthExchanges: MobileOAuthExchangeService,
  ) {}

  /**
   * Оборачивает вход пер-аккаунтной защитой от брутфорса: до попытки проверяем
   * блокировку, при неудачной аутентификации (401) инкрементируем счётчик, при
   * успехе — сбрасываем. IP-throttle (@Throttle) остаётся как второй слой.
   */
  private async withLoginThrottle<T>(
    identifier: string,
    attempt: () => Promise<T>,
  ): Promise<T> {
    await this.loginThrottle.assertNotLocked(identifier);
    try {
      const result = await attempt();
      await this.loginThrottle.reset(identifier);
      return result;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        await this.loginThrottle.registerFailure(identifier);
      }
      throw error;
    }
  }

  // ==================== USER AUTH ====================

  @Public()
  @Throttle({ default: { ttl: AUTH_THROTTLE_TTL, limit: REGISTER_LIMIT } })
  @SkipCookieCsrf()
  @Post('user/register')
  @ApiOperation({ summary: 'Регистрация пользователя' })
  @ApiResponse({ status: 201, type: TokensResponseDto })
  async registerUser(
    @Body() dto: RegisterUserDto,
    @Req() req: Request,
  ): Promise<TokensResponseDto> {
    return this.authService.registerUser(dto, this.extractMetadata(req));
  }

  @Public()
  @Throttle({ default: { ttl: AUTH_THROTTLE_TTL, limit: REGISTER_LIMIT } })
  @SkipCookieCsrf()
  @Post('web/register')
  @ApiOperation({
    summary: 'Web registration через HttpOnly host-only cookies',
  })
  @ApiResponse({
    status: 201,
    schema: {
      type: 'object',
      required: ['authenticated', 'csrfToken', 'emailVerificationRequired'],
      properties: {
        authenticated: { type: 'boolean', example: true },
        csrfToken: { type: 'string' },
        emailVerificationRequired: { type: 'boolean' },
      },
    },
  })
  async registerWeb(
    @Body() dto: RegisterUserDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{
    authenticated: true;
    csrfToken: string;
    emailVerificationRequired: boolean;
  }> {
    const tokens = await this.authService.registerUser(
      dto,
      this.extractMetadata(req),
    );
    return {
      ...this.writeWebSession(req, res, tokens),
      emailVerificationRequired: tokens.emailVerificationRequired ?? true,
    };
  }

  @Public()
  @Throttle({ default: { ttl: AUTH_THROTTLE_TTL, limit: LOGIN_LIMIT } })
  @SkipCookieCsrf()
  @Post('user/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Вход пользователя' })
  @ApiResponse({ status: 200, type: TokensResponseDto })
  async loginUser(
    @Body() dto: LoginDto,
    @Req() req: Request,
  ): Promise<TokensResponseDto> {
    return this.withLoginThrottle(dto.email, () =>
      this.authService.loginUser(dto, this.extractMetadata(req, dto.locale)),
    );
  }

  // ==================== ACCOUNT-CENTRIC AUTH ====================

  @Public()
  @Throttle({ default: { ttl: AUTH_THROTTLE_TTL, limit: LOGIN_LIMIT } })
  @SkipCookieCsrf()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Единый вход по email/паролю (без ИНН) — организация, пользователь или сотрудник',
  })
  @ApiResponse({ status: 200, type: TokensResponseDto })
  async loginAccount(
    @Body() dto: LoginDto,
    @Req() req: Request,
  ): Promise<TokensResponseDto> {
    return this.withLoginThrottle(dto.email, () =>
      this.authService.loginAccount(dto, this.extractMetadata(req, dto.locale)),
    );
  }

  @Public()
  @Throttle({ default: { ttl: AUTH_THROTTLE_TTL, limit: LOGIN_LIMIT } })
  @SkipCookieCsrf()
  @Post('web/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Web login через HttpOnly host-only cookies' })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      required: ['authenticated', 'csrfToken'],
      properties: {
        authenticated: { type: 'boolean', example: true },
        csrfToken: { type: 'string' },
      },
    },
  })
  async loginWeb(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ authenticated: true; csrfToken: string }> {
    const tokens = await this.withLoginThrottle(dto.email, () =>
      this.authService.loginAccount(dto, this.extractMetadata(req, dto.locale)),
    );
    return this.writeWebSession(req, res, tokens);
  }

  // ==================== ORGANIZATION AUTH ====================

  @Public()
  @Throttle({ default: { ttl: AUTH_THROTTLE_TTL, limit: REGISTER_LIMIT } })
  @SkipCookieCsrf()
  @Post('organization/register')
  @ApiOperation({
    summary: 'Регистрация отдельного аккаунта организации',
    description:
      'Атомарно создаёт Organization, ORGANIZATION Identity и OWNER Membership. ' +
      'Личный User/participant scope не создаётся; email существующего личного пользователя использовать нельзя.',
  })
  @ApiResponse({ status: 201, type: RegisterResponseDto })
  @ApiResponse({
    status: 409,
    description: 'Email уже принадлежит личному аккаунту или организации',
  })
  async registerOrganization(
    @Body() dto: RegisterOrganizationDto,
    @Req() req: Request,
  ): Promise<RegisterResponseDto> {
    return this.authService.registerOrganization(
      dto,
      this.extractMetadata(req),
    );
  }

  @Public()
  @Throttle({ default: { ttl: AUTH_THROTTLE_TTL, limit: LOGIN_LIMIT } })
  @SkipCookieCsrf()
  @Post('organization/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Вход организации' })
  @ApiResponse({ status: 200, type: TokensResponseDto })
  async loginOrganization(
    @Body() dto: LoginDto,
    @Req() req: Request,
  ): Promise<TokensResponseDto> {
    return this.withLoginThrottle(dto.email, () =>
      this.authService.loginOrganization(
        dto,
        this.extractMetadata(req, dto.locale),
      ),
    );
  }

  // ==================== MEMBER AUTH ====================

  @Public()
  @Throttle({ default: { ttl: AUTH_THROTTLE_TTL, limit: LOGIN_LIMIT } })
  @SkipCookieCsrf()
  @Post('member/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Вход сотрудника организации' })
  @ApiResponse({ status: 200, type: TokensResponseDto })
  async loginMember(
    @Body() dto: MemberLoginDto,
    @Req() req: Request,
  ): Promise<TokensResponseDto> {
    return this.withLoginThrottle(`${dto.inn}:${dto.email}`, () =>
      this.authService.loginMember(dto, this.extractMetadata(req, dto.locale)),
    );
  }

  // ==================== SUPER ADMIN AUTH ====================

  @Public()
  @Throttle({ default: { ttl: AUTH_THROTTLE_TTL, limit: LOGIN_LIMIT } })
  @SkipCookieCsrf()
  @Post('superadmin/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Вход супер-администратора' })
  @ApiResponse({ status: 200, type: TokensResponseDto })
  async loginSuperAdmin(
    @Body() dto: LoginDto,
    @Req() req: Request,
  ): Promise<TokensResponseDto> {
    // Отдельный namespace ключа, чтобы блокировка superadmin не пересекалась с
    // обычным входом по тому же email.
    return this.withLoginThrottle(`superadmin:${dto.email}`, () =>
      this.authService.loginSuperAdmin(
        dto,
        this.extractMetadata(req, dto.locale),
      ),
    );
  }

  // ==================== PASSWORD MANAGEMENT ====================

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Изменить пароль' })
  @ApiResponse({ status: 200, description: 'Пароль успешно изменён' })
  async changePassword(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.changePassword(user, dto);
  }

  // ==================== SESSION MANAGEMENT ====================

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Получить активные сессии' })
  @ApiResponse({ status: 200, type: [SessionResponseDto] })
  async getSessions(
    @CurrentUser() user: ICurrentUser,
    @Headers('x-refresh-token') refreshToken?: string,
  ): Promise<SessionResponseDto[]> {
    return this.authService.getSessions(user, refreshToken);
  }

  @Delete('sessions/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Завершить конкретную сессию' })
  @ApiResponse({ status: 200, description: 'Сессия завершена' })
  async terminateSession(
    @CurrentUser() user: ICurrentUser,
    @Param('id', ParseUUIDPipe) sessionId: string,
  ): Promise<{ message: string }> {
    return this.authService.terminateSession(user, sessionId);
  }

  @Delete('sessions')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Завершить все сессии кроме текущей' })
  @ApiResponse({ status: 200, description: 'Все сессии завершены' })
  async terminateAllSessions(
    @CurrentUser() user: ICurrentUser,
    @Headers('x-refresh-token') refreshToken: string,
  ): Promise<{ message: string; terminatedCount: number }> {
    return this.authService.terminateAllSessions(user, refreshToken);
  }

  // ==================== OAUTH ====================

  @Public()
  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  @ApiOperation({ summary: 'Начать OAuth через Google' })
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  googleAuth(@Query('type') type: AuthType = 'user'): void {
    // Passport перенаправит на Google OAuth
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Callback для Google OAuth' })
  async googleCallback(
    @Req() req: Request,
    @Res() res: Response,
    @Query('state') state?: string,
  ): Promise<void> {
    const profile = req.user as GoogleProfile;
    this.verifyOAuthState(req, res, state);
    const { authType, isMobile } = this.parseOAuthState(state);
    if (authType === 'organization') {
      throw new BadRequestException(
        'OAuth через Google доступен только для пользователей',
      );
    }
    const metadata = this.extractMetadata(req);
    const tokens = await this.authService.handleGoogleUserAuth(
      profile,
      metadata,
    );

    res.redirect(await this.completeOAuthSession(req, res, tokens, isMobile));
  }

  @Public()
  @Get('linkedin')
  @UseGuards(LinkedInOAuthGuard)
  @ApiOperation({ summary: 'Начать OAuth через LinkedIn' })
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  linkedinAuth(@Query('type') type: AuthType = 'user'): void {
    // Passport перенаправит на LinkedIn OAuth
  }

  @Public()
  @Get('linkedin/callback')
  @UseGuards(AuthGuard('linkedin'))
  @ApiOperation({ summary: 'Callback для LinkedIn OAuth' })
  async linkedinCallback(
    @Req() req: Request,
    @Res() res: Response,
    @Query('state') state?: string,
  ): Promise<void> {
    const profile = req.user as LinkedInProfile;
    this.verifyOAuthState(req, res, state);
    const { authType, isMobile } = this.parseOAuthState(state);
    if (authType === 'organization') {
      throw new BadRequestException(
        'OAuth через LinkedIn доступен только для пользователей',
      );
    }
    const metadata = this.extractMetadata(req);
    const tokens = await this.authService.handleLinkedInUserAuth(
      profile,
      metadata,
    );

    res.redirect(await this.completeOAuthSession(req, res, tokens, isMobile));
  }

  @Public()
  @Throttle({ default: { ttl: AUTH_THROTTLE_TTL, limit: REFRESH_LIMIT } })
  @Post('oauth/mobile/exchange')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Одноразовый обмен native OAuth code на токены' })
  @ApiResponse({ status: 200, type: TokensResponseDto })
  exchangeMobileOAuth(
    @Body() dto: MobileOAuthExchangeDto,
  ): Promise<TokensResponseDto> {
    return this.mobileOAuthExchanges.consume(dto.code);
  }

  // ==================== TOKEN MANAGEMENT ====================

  @Public()
  @Throttle({ default: { ttl: AUTH_THROTTLE_TTL, limit: REFRESH_LIMIT } })
  @SkipCookieCsrf()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Обновить токены' })
  @ApiResponse({ status: 200, type: TokensResponseDto })
  async refreshTokens(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
  ): Promise<TokensResponseDto> {
    return this.authService.refreshTokens(
      dto.refreshToken,
      this.extractMetadata(req, dto.locale),
    );
  }

  @Public()
  @Throttle({ default: { ttl: AUTH_THROTTLE_TTL, limit: REFRESH_LIMIT } })
  @SkipCookieCsrf()
  @Post('web/refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ротация HttpOnly web session' })
  async refreshWeb(
    @Body() dto: WebRefreshDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ authenticated: true; csrfToken: string }> {
    const refreshToken = readWebRefreshCookie(req);
    if (!refreshToken) {
      throw new UnauthorizedException('Web session не найдена');
    }
    const tokens = await this.authService.refreshTokens(
      refreshToken,
      this.extractMetadata(req, dto.locale),
    );
    return this.writeWebSession(req, res, tokens);
  }

  @Public()
  @Get('web/csrf')
  @ApiOperation({ summary: 'Получить CSRF token активной web session' })
  getWebCsrf(@Req() req: Request): { csrfToken: string } {
    const csrfToken = readWebCsrfCookie(req);
    const secret = this.configService.getOrThrow<string>('jwt.secret');
    if (!csrfToken || !verifyCsrfToken(csrfToken, secret)) {
      throw new UnauthorizedException('Web session CSRF token не найден');
    }
    return { csrfToken };
  }

  @Public()
  @Throttle({ default: { ttl: AUTH_THROTTLE_TTL, limit: REFRESH_LIMIT } })
  @SkipCookieCsrf()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Выйти из системы' })
  async logout(@Body() dto: RefreshTokenDto): Promise<{ message: string }> {
    await this.authService.logout(dto.refreshToken);
    return { message: 'Успешный выход' };
  }

  @Public()
  @SkipCookieCsrf()
  @Post('web/logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Отозвать и очистить HttpOnly web session' })
  async logoutWeb(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    const refreshToken = readWebRefreshCookie(req);
    if (refreshToken) await this.authService.logout(refreshToken);
    const options = webCookieOptions(req, 0, true);
    // Оба набора имён: набор выбирается по протоколу запроса, и у пользователя,
    // который логинился до смены X-Forwarded-Proto на прокси, в браузере лежит
    // набор из прошлой жизни. Почистив только текущий, мы оставили бы
    // осиротевшую куку, которую readWebCookie по-прежнему находит.
    for (const names of ALL_WEB_COOKIE_NAMES) {
      res.clearCookie(names.access, options);
      res.clearCookie(names.refresh, options);
      res.clearCookie(names.csrf, { ...options, httpOnly: false });
    }
    return { message: 'Успешный выход' };
  }

  // ==================== HELPERS ====================

  private writeWebSession(
    req: Request,
    res: Response,
    tokens: TokensResponseDto,
  ): { authenticated: true; csrfToken: string } {
    const secret = this.configService.getOrThrow<string>('jwt.secret');
    const csrfToken = createCsrfToken(secret);
    const names = webCookieNames(req);
    const staleOptions = webCookieOptions(req, 0, true);
    for (const stale of ALL_WEB_COOKIE_NAMES) {
      if (stale.access === names.access) continue;
      res.clearCookie(stale.access, staleOptions);
      res.clearCookie(stale.refresh, staleOptions);
      res.clearCookie(stale.csrf, { ...staleOptions, httpOnly: false });
    }
    res.cookie(
      names.access,
      tokens.accessToken,
      webCookieOptions(req, 15 * 60 * 1000, true),
    );
    res.cookie(
      names.refresh,
      tokens.refreshToken,
      webCookieOptions(req, 7 * 24 * 60 * 60 * 1000, true),
    );
    res.cookie(
      names.csrf,
      csrfToken,
      webCookieOptions(req, 7 * 24 * 60 * 60 * 1000, false),
    );
    return { authenticated: true, csrfToken };
  }

  /**
   * OAuth (Google/LinkedIn) — только для роли пользователь.
   * Редирект всегда на публичный сайт.
   */
  private getOAuthRedirectUrl(): string {
    return (
      this.configService.get<string>('frontend.publicUrl') ||
      this.configService.get<string>('FRONTEND_PUBLIC_URL') ||
      'http://localhost'
    );
  }

  /**
   * Deep-link target for the native mobile app OAuth flow (scheme "eventflow",
   * bundle uz.eventflow.app). The mobile app opens `/auth/<provider>?platform=
   * mobile` in an in-app browser and catches this redirect to exchange its
   * single-use code. Configurable, but ALWAYS a fixed value — it is never taken from
   * the request, so it cannot become an open redirect.
   */
  private getMobileOAuthRedirectUrl(): string {
    return (
      this.configService.get<string>('frontend.mobileOAuthRedirect') ||
      this.configService.get<string>('MOBILE_OAUTH_REDIRECT') ||
      'eventflow://auth/callback'
    );
  }

  /**
   * OAuth `state` carries the auth type and, for mobile-initiated flows, a
   * `.mobile` platform suffix (set by the OAuth guards) — it is the only param
   * that survives the provider round-trip. Format: `user` | `user.mobile`.
   */
  /**
   * CSRF-проверка OAuth: nonce из `state` должен совпасть с nonce из httpOnly-
   * cookie, поставленной на инициации. Cookie одноразовая — очищаем всегда.
   * Несовпадение/отсутствие → отклоняем (login-CSRF).
   */
  private verifyOAuthState(req: Request, res: Response, state?: string): void {
    const stateNonce = extractOAuthNonce(state);
    const cookieNonce = readOAuthStateCookie(req.headers.cookie);
    res.clearCookie(OAUTH_STATE_COOKIE, { path: '/api/v1/auth' });
    if (!oauthNonceMatches(stateNonce, cookieNonce)) {
      throw new ForbiddenException(
        'Недействительный OAuth state — запрос отклонён',
      );
    }
  }

  private parseOAuthState(state?: string): {
    authType: AuthType;
    isMobile: boolean;
  } {
    const [type, platform] = (state ?? 'user').split('.');
    return {
      authType: (type as AuthType) || 'user',
      isMobile: platform === 'mobile',
    };
  }

  /** Web gets HttpOnly cookies; native retains bearer deep-link compatibility. */
  private async completeOAuthSession(
    req: Request,
    res: Response,
    tokens: TokensResponseDto,
    isMobile: boolean,
  ): Promise<string> {
    if (isMobile) {
      const code = await this.mobileOAuthExchanges.issue(tokens);
      const callbackUrl = new URL(this.getMobileOAuthRedirectUrl());
      callbackUrl.searchParams.set('code', code);
      return callbackUrl.toString();
    }
    this.writeWebSession(req, res, tokens);
    const callbackUrl = new URL('/auth/callback', this.getOAuthRedirectUrl());
    callbackUrl.searchParams.set('oauth', 'success');
    callbackUrl.searchParams.set(
      'isOnboardingCompleted',
      String(tokens.isOnboardingCompleted ?? false),
    );
    if (tokens.isNewUser) callbackUrl.searchParams.set('isNewUser', 'true');
    return callbackUrl.toString();
  }

  private extractMetadata(
    req: Request,
    locale?: string,
  ): {
    userAgent?: string;
    ipAddress?: string;
    locale?: string;
  } {
    return {
      userAgent: req.headers['user-agent'],
      ipAddress: this.extractIpAddress(req),
      // BL-37: валидированный DTO-сигнал языка → Account.locale.
      ...(locale ? { locale } : {}),
    };
  }

  private extractIpAddress(req: Request): string | undefined {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0]?.trim();
    }
    if (Array.isArray(forwarded)) {
      return forwarded[0];
    }
    return req.socket?.remoteAddress;
  }
}
