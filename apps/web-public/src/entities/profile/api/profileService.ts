/**
 * @module entities/profile/api/profileService
 * @description API методы для работы с профилем пользователя.
 * Использует root profile surface /api/v1/account/me
 */

import {
  authService,
  usersService,
  type User,
  type UpdateUserData,
  type ProfileOptionsResponse,
} from "@shared/api";
import { toUtcIsoString } from "@shared/lib/date";

import type { ProfileInfo } from "../model/types";

export type { ProfileOptionsResponse };

export interface UpdateProfileRequest {
  name?: string;
  role?: string;
  company?: string;
  location?: string;
  timezone?: string;
  email?: string;
  telegram?: string;
  avatarUrl?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  bio?: string;
  focusAreas?: Array<{
    label: string;
    description: string;
  }>;
  /** Доп. поля профиля (popup «Заполните доп. поля») */
  firstName?: string;
  lastName?: string;
  phone?: string;
  gender?: "MALE" | "FEMALE";
  dateOfBirth?: string;
  region?: string;
  languages?: string[];
  profileStatus?: "WORKER" | "SCHOOLBOY" | "STUDENT";
  workOrStudyPlace?: string;
  skills?: string[];
  specialization?: string;
  shortBio?: string;
}

export interface UpdateProfileResponse {
  success: boolean;
  data: ProfileInfo;
}

/**
 * Маппер User -> ProfileInfo
 * Преобразует данные из API в формат ProfileInfo для UI
 */
function mapUserToProfileInfo(user: User): ProfileInfo {
  // Получаем сохраненные UI-данные из localStorage
  const savedUIData = getUIDataFromStorage(user.id);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl ?? "",
    location: user.location ?? "",
    bio: user.bio ?? "",
    // UI-специфичные поля (не поддерживаются API, хранятся локально)
    role: savedUIData?.role ?? "",
    company: savedUIData?.company ?? "",
    timezone: savedUIData?.timezone ?? "UTC+5 (Ташкент)",
    telegram: savedUIData?.telegram ?? "",
    calendarLink: savedUIData?.calendarLink ?? "",
    heroTitle: savedUIData?.heroTitle ?? user.name,
    heroSubtitle: savedUIData?.heroSubtitle ?? "",
    badges: savedUIData?.badges ?? [],
    focusAreas: savedUIData?.focusAreas ?? [],
  };
}

/**
 * Маппер UpdateProfileRequest -> UpdateUserData
 * Преобразует данные формы в формат API
 */
function mapProfileRequestToUserData(
  data: UpdateProfileRequest
): UpdateUserData {
  const base: UpdateUserData = {
    name: data.name,
    bio: data.bio,
    location: data.location,
    avatar: data.avatarUrl,
  };
  const extra = {
    firstName: data.firstName,
    lastName: data.lastName,
    phone: data.phone,
    gender: data.gender,
    dateOfBirth: data.dateOfBirth
      ? toUtcIsoString(data.dateOfBirth)
      : data.dateOfBirth,
    region: data.region,
    languages: data.languages,
    profileStatus: data.profileStatus,
    workOrStudyPlace: data.workOrStudyPlace,
    skills: data.skills,
    specialization: data.specialization as UpdateUserData["specialization"],
    shortBio: data.shortBio,
  };
  return { ...base, ...extra };
}

// ============================================================================
// Хранение UI-данных в localStorage
// ============================================================================

interface ProfileUIData {
  role?: string;
  company?: string;
  timezone?: string;
  telegram?: string;
  calendarLink?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  badges?: string[];
  focusAreas?: Array<{
    id: string;
    label: string;
    description: string;
  }>;
}

const PROFILE_UI_STORAGE_KEY = "profile_ui_data";

function getUIDataFromStorage(userId: string): ProfileUIData | null {
  if (typeof window === "undefined") return null;

  try {
    const data = localStorage.getItem(`${PROFILE_UI_STORAGE_KEY}_${userId}`);
    return data ? (JSON.parse(data) as ProfileUIData) : null;
  } catch {
    return null;
  }
}

function saveUIDataToStorage(userId: string, data: ProfileUIData): void {
  if (typeof window === "undefined") return;

  try {
    const existingData = getUIDataFromStorage(userId) ?? {};
    const mergedData = { ...existingData, ...data };
    localStorage.setItem(
      `${PROFILE_UI_STORAGE_KEY}_${userId}`,
      JSON.stringify(mergedData)
    );
  } catch {
    // Ignore storage errors
  }
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Получить данные профиля текущего пользователя
 * GET /api/v1/account/me
 */
export async function getProfile(): Promise<ProfileInfo> {
  const user = await authService.getMyProfile();
  return mapUserToProfileInfo(user);
}

/**
 * Обновить данные профиля
 * PATCH /api/v1/account/me
 *
 * Примечание: UI-специфичные поля (role, company, focusAreas и т.д.)
 * не поддерживаются API и сохраняются локально в localStorage
 */
export async function updateProfile(
  data: UpdateProfileRequest
): Promise<ProfileInfo> {
  // Обновляем данные через API
  const apiData = mapProfileRequestToUserData(data);
  const updatedUser = await authService.updateMyProfile(apiData);

  // Сохраняем UI-специфичные данные локально
  const uiData: ProfileUIData = {
    role: data.role,
    company: data.company,
    timezone: data.timezone,
    telegram: data.telegram,
    heroTitle: data.heroTitle,
    heroSubtitle: data.heroSubtitle,
    focusAreas: data.focusAreas?.map((area, index) => ({
      id: `focus-${index}`,
      ...area,
    })),
  };
  saveUIDataToStorage(updatedUser.id, uiData);

  return mapUserToProfileInfo(updatedUser);
}

/**
 * Загрузить аватар профиля
 * POST /api/v1/account/me/avatar
 */
export async function uploadAvatar(file: File): Promise<string> {
  const response = await authService.uploadAvatar(file);
  return response.avatarUrl;
}

/**
 * Удалить аватар профиля
 * DELETE /api/v1/account/me/avatar
 */
export async function deleteAvatar(): Promise<void> {
  await authService.deleteAvatar();
}

/**
 * Справочники для формы доп. полей профиля (навыки, регионы, языки и т.д.)
 * GET /api/v1/public/profile-options — публичный
 */
export async function getProfileOptions(): Promise<ProfileOptionsResponse> {
  return usersService.getProfileOptions();
}

/**
 * Отметить, что пользователь заполнил доп. поля профиля.
 * Popup «Заполните доп. поля» больше не показывается.
 * POST /api/v1/account/me/complete-profile-info
 *
 * @returns Обновлённый объект пользователя (как GET /account/me)
 */
export async function completeProfileInfo(): Promise<User> {
  return usersService.completeProfileInfo();
}
