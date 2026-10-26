/**
 * Каталог полей выгрузки пользователей в XLSX (супер-админка → «Скачать»).
 *
 * Единственный источник правды и для валидации запроса (`fields`), и для
 * заголовков колонок, и для того, как значение попадает в ячейку. Порядок
 * колонок в файле всегда равен порядку в этом каталоге — не тому, в каком
 * админ отмечал чекбоксы, чтобы одинаковый набор полей давал одинаковый файл.
 *
 * Заголовки локализованы (ru/uz/en). Значения словарей (навыки, регионы,
 * специализация) отдаются платформенными подписями — они по всему продукту
 * существуют только на русском (см. users.service#getProfileOptions).
 */

import {
  AuthProvider,
  Gender,
  Specialization,
  UserProfileStatus,
} from '@prisma/client';
import {
  USER_PROFILE_LANGUAGES,
  USER_PROFILE_SKILLS,
} from '../../common/constants/user-profile.constants';

/** Локаль интерфейса админки; влияет только на заголовки и Да/Нет. */
export type ExportLocale = 'ru' | 'uz' | 'en';

export const EXPORT_LOCALES: readonly ExportLocale[] = ['ru', 'uz', 'en'];

type LocalizedLabel = Record<ExportLocale, string>;

/** Значение ячейки: exceljs сам разложит строку/число/дату по типам. */
export type ExportCellValue = string | number | Date | null;

/** Пользователь + membership-контекст, из которого считаются ячейки. */
export type ExportUserRow = {
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    location: string | null;
    bio: string | null;
    shortBio: string | null;
    gender: Gender | null;
    dateOfBirth: Date | null;
    region: string | null;
    languages: string[];
    profileStatus: UserProfileStatus | null;
    workOrStudyPlace: string | null;
    skills: string[];
    specialization: Specialization | null;
    authProvider: AuthProvider;
    isEmailVerified: boolean;
    linkedinUrl: string | null;
    instagramUrl: string | null;
    facebookUrl: string | null;
    websiteUrl: string | null;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  };
  organizationName: string | null;
  roleName: string | null;
};

type ExportFieldDefinition = {
  key: string;
  /** Группа — только для читаемости каталога; UI группирует у себя. */
  group: 'identity' | 'profile' | 'social' | 'organization' | 'system';
  header: LocalizedLabel;
  width: number;
  value: (row: ExportUserRow, locale: ExportLocale) => ExportCellValue;
};

// ── словари ────────────────────────────────────────────────────────────────

const YES: LocalizedLabel = { ru: 'Да', uz: 'Ha', en: 'Yes' };
const NO: LocalizedLabel = { ru: 'Нет', uz: "Yo'q", en: 'No' };

const STATE_ACTIVE: LocalizedLabel = {
  ru: 'Активен',
  uz: 'Faol',
  en: 'Active',
};
const STATE_ARCHIVED: LocalizedLabel = {
  ru: 'Архивирован',
  uz: 'Arxivlangan',
  en: 'Archived',
};

const GENDER_LABELS: Record<Gender, string> = {
  [Gender.MALE]: 'Мужской',
  [Gender.FEMALE]: 'Женский',
};

const PROFILE_STATUS_LABELS: Record<UserProfileStatus, string> = {
  [UserProfileStatus.WORKER]: 'Работник',
  [UserProfileStatus.SCHOOLBOY]: 'Школьник',
  [UserProfileStatus.STUDENT]: 'Студент',
};

const SPECIALIZATION_LABELS: Record<Specialization, string> = {
  [Specialization.LAWYER]: 'Юрист',
  [Specialization.PROGRAMMER]: 'Программист',
  [Specialization.DESIGNER]: 'Дизайнер',
  [Specialization.PHOTOGRAPHER]: 'Фотограф',
  [Specialization.PROJECT_MANAGER]: 'Проджект-менеджер',
  [Specialization.PRODUCT_MANAGER]: 'Продукт-менеджер',
};

const SKILL_LABELS = new Map<string, string>(
  USER_PROFILE_SKILLS.map((s) => [s.code, s.label]),
);
const LANGUAGE_LABELS = new Map<string, string>(
  USER_PROFILE_LANGUAGES.map((l) => [l.code, l.label]),
);

// ── помощники ──────────────────────────────────────────────────────────────

function bool(value: boolean, locale: ExportLocale): string {
  return value ? YES[locale] : NO[locale];
}

/** Коды → подписи через словарь; незнакомый код отдаём как есть. */
function codes(values: string[], dictionary: Map<string, string>): string {
  if (values.length === 0) return '';
  return values.map((code) => dictionary.get(code) ?? code).join(', ');
}

/**
 * Полных лет на сегодня. Считается по датам, а не делением миллисекунд:
 * dateOfBirth хранится как @db.Date (UTC-полночь), поэтому берём UTC-части.
 */
export function ageInYears(
  dateOfBirth: Date | null,
  now: Date = new Date(),
): number | null {
  if (!dateOfBirth) return null;
  let age = now.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - dateOfBirth.getUTCMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && now.getUTCDate() < dateOfBirth.getUTCDate())
  ) {
    age -= 1;
  }
  return age >= 0 && age < 150 ? age : null;
}

// ── каталог ────────────────────────────────────────────────────────────────

export const USER_EXPORT_FIELDS: readonly ExportFieldDefinition[] = [
  {
    key: 'firstName',
    group: 'identity',
    header: { ru: 'Имя', uz: 'Ism', en: 'First name' },
    width: 20,
    value: ({ user }) => user.firstName ?? '',
  },
  {
    key: 'lastName',
    group: 'identity',
    header: { ru: 'Фамилия', uz: 'Familiya', en: 'Last name' },
    width: 20,
    value: ({ user }) => user.lastName ?? '',
  },
  {
    key: 'email',
    group: 'identity',
    header: { ru: 'Email', uz: 'Email', en: 'Email' },
    width: 32,
    value: ({ user }) => user.email,
  },
  {
    key: 'phone',
    group: 'identity',
    header: { ru: 'Телефон', uz: 'Telefon', en: 'Phone' },
    width: 18,
    value: ({ user }) => user.phone ?? '',
  },
  {
    key: 'gender',
    group: 'identity',
    header: { ru: 'Пол', uz: 'Jinsi', en: 'Gender' },
    width: 12,
    value: ({ user }) => (user.gender ? GENDER_LABELS[user.gender] : ''),
  },
  {
    key: 'dateOfBirth',
    group: 'identity',
    header: {
      ru: 'Дата рождения',
      uz: "Tug'ilgan sana",
      en: 'Date of birth',
    },
    width: 16,
    value: ({ user }) => user.dateOfBirth,
  },
  {
    key: 'age',
    group: 'identity',
    header: { ru: 'Возраст', uz: 'Yosh', en: 'Age' },
    width: 10,
    value: ({ user }) => ageInYears(user.dateOfBirth),
  },
  {
    key: 'location',
    group: 'profile',
    header: { ru: 'Локация', uz: 'Manzil', en: 'Location' },
    width: 24,
    value: ({ user }) => user.location ?? '',
  },
  {
    key: 'region',
    group: 'profile',
    header: { ru: 'Регион', uz: 'Hudud', en: 'Region' },
    width: 24,
    value: ({ user }) => user.region ?? '',
  },
  {
    key: 'languages',
    group: 'profile',
    header: { ru: 'Языки', uz: 'Tillar', en: 'Languages' },
    width: 26,
    value: ({ user }) => codes(user.languages, LANGUAGE_LABELS),
  },
  {
    key: 'profileStatus',
    group: 'profile',
    header: { ru: 'Статус', uz: 'Maqomi', en: 'Occupation status' },
    width: 16,
    value: ({ user }) =>
      user.profileStatus ? PROFILE_STATUS_LABELS[user.profileStatus] : '',
  },
  {
    key: 'workOrStudyPlace',
    group: 'profile',
    header: {
      ru: 'Место работы / учёбы',
      uz: 'Ish yoki o‘qish joyi',
      en: 'Work or study place',
    },
    width: 32,
    value: ({ user }) => user.workOrStudyPlace ?? '',
  },
  {
    key: 'specialization',
    group: 'profile',
    header: {
      ru: 'Специализация',
      uz: 'Mutaxassislik',
      en: 'Specialization',
    },
    width: 22,
    value: ({ user }) =>
      user.specialization ? SPECIALIZATION_LABELS[user.specialization] : '',
  },
  {
    key: 'skills',
    group: 'profile',
    header: { ru: 'Навыки', uz: "Ko'nikmalar", en: 'Skills' },
    width: 32,
    value: ({ user }) => codes(user.skills, SKILL_LABELS),
  },
  {
    key: 'shortBio',
    group: 'profile',
    header: { ru: 'Коротко о себе', uz: 'Qisqacha', en: 'Short bio' },
    width: 40,
    value: ({ user }) => user.shortBio ?? '',
  },
  {
    key: 'bio',
    group: 'profile',
    header: { ru: 'О себе', uz: 'O‘zi haqida', en: 'Bio' },
    width: 48,
    value: ({ user }) => user.bio ?? '',
  },
  {
    key: 'linkedinUrl',
    group: 'social',
    header: { ru: 'LinkedIn', uz: 'LinkedIn', en: 'LinkedIn' },
    width: 30,
    value: ({ user }) => user.linkedinUrl ?? '',
  },
  {
    key: 'instagramUrl',
    group: 'social',
    header: { ru: 'Instagram', uz: 'Instagram', en: 'Instagram' },
    width: 30,
    value: ({ user }) => user.instagramUrl ?? '',
  },
  {
    key: 'facebookUrl',
    group: 'social',
    header: { ru: 'Facebook', uz: 'Facebook', en: 'Facebook' },
    width: 30,
    value: ({ user }) => user.facebookUrl ?? '',
  },
  {
    key: 'websiteUrl',
    group: 'social',
    header: { ru: 'Сайт', uz: 'Veb-sayt', en: 'Website' },
    width: 30,
    value: ({ user }) => user.websiteUrl ?? '',
  },
  {
    key: 'organizationName',
    group: 'organization',
    header: { ru: 'Организация', uz: 'Tashkilot', en: 'Organization' },
    width: 28,
    value: ({ organizationName }) => organizationName ?? '',
  },
  {
    key: 'roleName',
    group: 'organization',
    header: { ru: 'Роль', uz: 'Rol', en: 'Role' },
    width: 18,
    value: ({ roleName }) => roleName ?? '',
  },
  {
    key: 'authProvider',
    group: 'system',
    header: { ru: 'Способ входа', uz: 'Kirish usuli', en: 'Auth provider' },
    width: 14,
    value: ({ user }) => user.authProvider,
  },
  {
    key: 'isEmailVerified',
    group: 'system',
    header: {
      ru: 'Email подтверждён',
      uz: 'Email tasdiqlangan',
      en: 'Email verified',
    },
    width: 18,
    value: ({ user }, locale) => bool(user.isEmailVerified, locale),
  },
  {
    key: 'state',
    group: 'system',
    header: { ru: 'Состояние', uz: 'Holati', en: 'State' },
    width: 16,
    value: ({ user }, locale) =>
      user.deletedAt ? STATE_ARCHIVED[locale] : STATE_ACTIVE[locale],
  },
  {
    key: 'createdAt',
    group: 'system',
    header: {
      ru: 'Дата регистрации',
      uz: "Ro'yxatdan o'tgan sana",
      en: 'Registered at',
    },
    width: 20,
    value: ({ user }) => user.createdAt,
  },
  {
    key: 'updatedAt',
    group: 'system',
    header: { ru: 'Обновлён', uz: 'Yangilangan', en: 'Updated at' },
    width: 20,
    value: ({ user }) => user.updatedAt,
  },
  {
    key: 'id',
    group: 'system',
    header: { ru: 'ID', uz: 'ID', en: 'ID' },
    width: 38,
    value: ({ user }) => user.id,
  },
] as const;

/** Допустимые значения query-параметра `fields`. */
export const USER_EXPORT_FIELD_KEYS: readonly string[] =
  USER_EXPORT_FIELDS.map((f) => f.key);

/** Набор по умолчанию, если админ не снял ни одной галочки в диалоге. */
export const USER_EXPORT_DEFAULT_FIELDS: readonly string[] = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'createdAt',
];

/** Поля в порядке каталога — независимо от порядка в запросе. */
export function orderExportFields(
  requested: readonly string[],
): ExportFieldDefinition[] {
  const wanted = new Set(requested);
  return USER_EXPORT_FIELDS.filter((f) => wanted.has(f.key));
}

/** Даты — как даты (Excel сам применит формат), остальное — как есть. */
export const EXPORT_DATE_FORMAT = 'dd.mm.yyyy';
export const EXPORT_DATETIME_FORMAT = 'dd.mm.yyyy hh:mm';

/** Ключи полей, чьи значения — календарная дата без времени. */
export const DATE_ONLY_FIELD_KEYS = new Set(['dateOfBirth']);
