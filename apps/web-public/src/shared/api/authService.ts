/**
 * API-сервис для аутентификации
 * Endpoints согласно EventFlow Swagger API v1
 */

import { apiGet, apiPost, setWebCsrfToken } from "../lib/apiClient";

import { accountSdk, publicSdk } from "./sdk";

// ============================================================================
// Типы аккаунтов
// ============================================================================

export type AccountType = "user" | "organizer";

// ============================================================================
// Типы пользователя
// ============================================================================

/** Пол пользователя (доп. поля профиля) */
export type UserGender = "MALE" | "FEMALE";

/** Статус профиля: работник / школьник / студент */
export type UserProfileStatus = "WORKER" | "SCHOOLBOY" | "STUDENT";

/** Специализация пользователя */
export type UserSpecialization =
  | "LAWYER"
  | "PROGRAMMER"
  | "DESIGNER"
  | "PHOTOGRAPHER"
  | "PROJECT_MANAGER"
  | "PRODUCT_MANAGER";

export interface User {
  id: string;
  email: string;
  /** Имя (или объединённое имя, если бэк не отдаёт firstName/lastName) */
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  location?: string | null;
  bio?: string | null;
  linkedinUrl?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  websiteUrl?: string | null;
  authProvider: "EMAIL" | "GOOGLE" | "LINKEDIN";
  providerId?: string | null;
  isEmailVerified: boolean;
  isPublicProfile: boolean;
  showEmail: boolean;
  showPhone: boolean;
  isNewUser?: boolean;
  /** Завершён ли онбординг (заполнение профиля после OAuth) */
  isOnboardingCompleted?: boolean;
  /** Доп. поля профиля заполнены; popup «Заполните доп. поля» больше не показывается */
  profileInfoCompleted?: boolean;
  /** Нужно показать popup «Заполните доп. поля» */
  needsProfileInfo?: boolean;
  /** Пол (MALE / FEMALE) */
  gender?: UserGender | null;
  /** Дата рождения (ISO date) */
  dateOfBirth?: string | null;
  /** Регион Узбекистана */
  region?: string | null;
  /** Языки (коды: ru, uz, en, …) */
  languages?: string[];
  /** Работник / школьник / студент */
  profileStatus?: UserProfileStatus | null;
  /** Где работает или учится */
  workOrStudyPlace?: string | null;
  /** Навыки (макс. 3 кода) */
  skills?: string[];
  /** Специализация (одна из) */
  specialization?: UserSpecialization | null;
  /** Коротко о себе (макс. 150 символов) */
  shortBio?: string | null;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  email: string;
  name: string;
  logo?: string;
  description?: string;
  verified?: boolean;
  createdAt?: string;
}

export interface SessionAccount {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
}

export interface SessionWorkspace {
  id: string;
  name: string;
  companyName?: string | null;
  email: string;
  logoUrl?: string | null;
  verificationStatus?: string | null;
}

export interface SessionMembership {
  id: string;
  kind: string;
  roleName?: string | null;
  permissions: string[];
  organizationMemberId?: string | null;
  workspace: SessionWorkspace;
}

export interface SessionMeResponse {
  currentAccount: SessionAccount;
  activeWorkspace?: SessionWorkspace | null;
  memberships: SessionMembership[];
  platformRole?: string | null;
  actorType: AuthUserType;
}

// ============================================================================
// Типы токенов
// ============================================================================

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// ============================================================================
// Типы запросов
// ============================================================================

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface UserSignupCredentials {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  passwordConfirm: string;
}

export interface OrganizerSignupCredentials {
  organizationName: string;
  email: string;
  password: string;
  passwordConfirm: string;
  description?: string;
}

/**
 * Данные для обновления профиля пользователя (API_USER UpdateUserProfileDto)
 * Примечание: email нельзя изменить через этот эндпоинт
 */
export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  /** Устаревший алиас — предпочтительно firstName + lastName */
  name?: string;
  avatar?: string;
  bio?: string;
  phone?: string;
  location?: string;
  linkedinUrl?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  websiteUrl?: string;
  /** Доп. поля профиля (popup «Заполните доп. поля») */
  gender?: UserGender;
  dateOfBirth?: string;
  region?: string;
  languages?: string[];
  profileStatus?: UserProfileStatus;
  workOrStudyPlace?: string;
  skills?: string[];
  specialization?: UserSpecialization;
  shortBio?: string;
}

/**
 * Данные для смены пароля
 */
export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Ответ после загрузки аватара
 */
export interface UploadAvatarResponse {
  avatarUrl: string;
  message?: string;
}

/**
 * Данные активной сессии (согласно реальному API)
 */
export interface Session {
  id: string;
  userAgent: string;
  ipAddress: string;
  lastUsedAt: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

// ============================================================================
// Типы ответов
// ============================================================================

/** Тип пользователя в ответе auth (API_PUBLIC) */
export type AuthUserType = "USER" | "ORGANIZATION" | "MEMBER" | "SUPER_ADMIN";

/**
 * Ответ с токенами (API_PUBLIC TokensResponseDto)
 */
export interface TokensOnlyResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
  emailVerificationRequired?: boolean;
  isNewUser?: boolean;
  isOnboardingCompleted?: boolean;
}

export interface OrganizerRegisterResponse {
  message: string;
  emailVerificationRequired: boolean;
}

export interface MessageResponse {
  message: string;
  success?: boolean;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

// ============================================================================
// OAuth типы
// ============================================================================

export type OAuthUserType = "user" | "organization";

export interface OAuthRedirectResponse {
  url: string;
}

// ============================================================================
// API Endpoints согласно Swagger
// ============================================================================

const AUTH_ENDPOINTS = {
  // User endpoints
  USER_REGISTER: "/api/v1/auth/user/register",
  USER_LOGIN: "/api/v1/auth/user/login",

  // Organization endpoints
  ORG_REGISTER: "/api/v1/auth/organization/register",
  ORG_LOGIN: "/api/v1/auth/organization/login",

  // Common endpoints
  LOGOUT: "/api/v1/auth/logout",
  REFRESH: "/api/v1/auth/refresh",
  CHANGE_PASSWORD: "/api/v1/auth/change-password",
  SESSIONS: "/api/v1/auth/sessions",

  // OAuth endpoints
  GOOGLE: "/api/v1/auth/google",
  LINKEDIN: "/api/v1/auth/linkedin",
} as const;

function resolvePublicAppAccountType(
  session: SessionMeResponse
): "user" | "organization" {
  if (session.actorType === "USER") {
    return "user";
  }

  if (session.actorType === "ORGANIZATION") {
    return "organization";
  }

  throw new Error(
    `Unsupported session actor for web-public: ${session.actorType}`
  );
}

// ============================================================================
// Auth Service
// ============================================================================

export const authService = {
  // --------------------------------------------------------------------------
  // User Authentication
  // --------------------------------------------------------------------------

  /**
   * Регистрация пользователя
   * Возвращает только токены; bootstrap пользователя делается через session/me
   */
  userRegister: async (
    credentials: UserSignupCredentials
  ): Promise<{ emailVerificationRequired: boolean }> => {
    const response = await apiPost<{
      csrfToken: string;
      emailVerificationRequired: boolean;
    }>("/api/v1/auth/web/register", credentials, { skipAuth: true });
    setWebCsrfToken(response.csrfToken);
    return response;
  },

  /**
   * Вход пользователя
   * Возвращает только токены; bootstrap пользователя делается через session/me
   */
  userLogin: async (
    credentials: LoginCredentials
  ): Promise<{ authenticated: true; csrfToken: string }> => {
    const { email, password } = credentials;
    const response = await apiPost<{ authenticated: true; csrfToken: string }>(
      "/api/v1/auth/web/login",
      { email, password },
      { skipAuth: true }
    );
    setWebCsrfToken(response.csrfToken);
    return response;
  },

  // --------------------------------------------------------------------------
  // Organization Authentication
  // --------------------------------------------------------------------------

  /**
   * Регистрация отдельного аккаунта организации. Такой аккаунт получает
   * workspace OWNER scope, но не личный participant scope.
   */
  organizerRegister: async (
    credentials: OrganizerSignupCredentials
  ): Promise<OrganizerRegisterResponse> => {
    return publicSdk.auth.registerOrganization(
      credentials as never
    ) as Promise<OrganizerRegisterResponse>;
  },

  /**
   * Вход организации
   * Возвращает только токены; bootstrap организации делается через session/me
   */
  organizerLogin: async (
    credentials: LoginCredentials
  ): Promise<TokensOnlyResponse> => {
    return publicSdk.auth.loginOrganization({
      email: credentials.email,
      password: credentials.password,
    } as never) as Promise<TokensOnlyResponse>;
  },

  // --------------------------------------------------------------------------
  // Common Authentication
  // --------------------------------------------------------------------------

  /**
   * Выход из системы
   */
  logout: async (): Promise<void> => {
    await apiPost("/api/v1/auth/web/logout");
  },

  bootstrapWebCsrf: async (): Promise<void> => {
    const response = await apiGet<{ csrfToken: string }>(
      "/api/v1/auth/web/csrf",
      { skipAuth: true }
    );
    setWebCsrfToken(response.csrfToken);
  },

  /**
   * Обновление токенов
   */
  refreshToken: async (refreshToken: string): Promise<RefreshTokenResponse> => {
    return publicSdk.auth.refresh({
      refreshToken,
    } as never) as Promise<RefreshTokenResponse>;
  },

  /**
   * Канонический session bootstrap для новых клиентов
   * GET /api/v1/session/me
   */
  getSessionMe: async (): Promise<SessionMeResponse> => {
    return accountSdk.session.getMe() as Promise<SessionMeResponse>;
  },

  /**
   * Получение текущего пользователя через канонический session bootstrap
   */
  getCurrentUser: async (): Promise<User | Organization> => {
    const session = await authService.getSessionMe();
    const accountType = resolvePublicAppAccountType(session);

    if (accountType === "organization") {
      return publicSdk.organizations.getMe() as unknown as Promise<Organization>;
    }

    return accountSdk.account.getMe() as Promise<User>;
  },

  // --------------------------------------------------------------------------
  // OAuth Authentication
  // --------------------------------------------------------------------------

  /**
   * Получить URL для Google OAuth
   * @param type - Тип пользователя (user или organization)
   */
  getGoogleAuthUrl: async (
    type: OAuthUserType = "user"
  ): Promise<OAuthRedirectResponse> => {
    return apiGet<OAuthRedirectResponse>(
      `${AUTH_ENDPOINTS.GOOGLE}?type=${type}`
    );
  },

  /**
   * Получить URL для LinkedIn OAuth
   * @param type - Тип пользователя (user или organization)
   */
  getLinkedInAuthUrl: async (
    type: OAuthUserType = "user"
  ): Promise<OAuthRedirectResponse> => {
    return apiGet<OAuthRedirectResponse>(
      `${AUTH_ENDPOINTS.LINKEDIN}?type=${type}`
    );
  },

  /**
   * Получить прямой URL для OAuth редиректа (без API запроса)
   * Используется для прямого редиректа на backend OAuth endpoint
   */
  getOAuthRedirectUrl: (
    provider: "google" | "linkedin",
    type: OAuthUserType = "user"
  ): string => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
    const endpoint =
      provider === "google" ? AUTH_ENDPOINTS.GOOGLE : AUTH_ENDPOINTS.LINKEDIN;
    return `${baseUrl}${endpoint}?type=${type}`;
  },

  // --------------------------------------------------------------------------
  // User Profile Management (требует авторизации)
  // --------------------------------------------------------------------------

  /**
   * Получить данные текущего пользователя
   * GET /api/v1/account/me
   */
  getMyProfile: async (): Promise<User> => {
    return accountSdk.account.getMe() as Promise<User>;
  },

  /**
   * Обновить данные текущего пользователя
   * PATCH /api/v1/account/me
   */
  updateMyProfile: async (data: UpdateUserData): Promise<User> => {
    return accountSdk.account.updateMe(data as never) as Promise<User>;
  },

  /**
   * Удалить аккаунт текущего пользователя
   * DELETE /api/v1/account/me
   */
  deleteMyAccount: async (): Promise<MessageResponse> => {
    await accountSdk.account.deleteMe();
    return { message: "Account deleted" };
  },

  /**
   * Изменить пароль текущего пользователя
   * PATCH /api/v1/auth/change-password
   */
  changePassword: async (
    data: ChangePasswordData
  ): Promise<MessageResponse> => {
    return publicSdk.auth.changePassword(
      data as never
    ) as Promise<MessageResponse>;
  },

  // --------------------------------------------------------------------------
  // Sessions Management
  // --------------------------------------------------------------------------

  /**
   * Получить активные сессии
   * GET /api/v1/auth/sessions
   */
  getSessions: async (): Promise<Session[]> => {
    return publicSdk.auth.getSessions() as unknown as Promise<Session[]>;
  },

  /**
   * Завершить все сессии кроме текущей
   * DELETE /api/v1/auth/sessions
   */
  terminateAllSessions: async (): Promise<MessageResponse> => {
    return publicSdk.auth.terminateAllSessions() as Promise<MessageResponse>;
  },

  /**
   * Завершить конкретную сессию
   * DELETE /api/v1/auth/sessions/{id}
   */
  terminateSession: async (sessionId: string): Promise<MessageResponse> => {
    return publicSdk.auth.terminateSession(
      sessionId
    ) as Promise<MessageResponse>;
  },

  /**
   * Загрузить аватар пользователя
   * POST /api/v1/account/me/avatar (multipart/form-data)
   */
  uploadAvatar: async (file: File): Promise<UploadAvatarResponse> => {
    const profile = await accountSdk.account.uploadAvatar(file);
    return {
      avatarUrl: (profile as User).avatarUrl ?? "",
      message: "Avatar uploaded",
    };
  },

  /**
   * Удалить аватар пользователя
   * DELETE /api/v1/account/me/avatar
   */
  deleteAvatar: async (): Promise<MessageResponse> => {
    await accountSdk.account.deleteAvatar();
    return { message: "Avatar deleted" };
  },
};
