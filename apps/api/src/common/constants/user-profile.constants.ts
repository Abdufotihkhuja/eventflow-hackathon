/**
 * Навыки для профиля пользователя (выбор до 3)
 * Код используется в БД, label — для отображения
 */
export const USER_PROFILE_SKILLS = [
  { code: 'javascript', label: 'JavaScript' },
  { code: 'python', label: 'Python' },
  { code: 'project_management', label: 'Управление проектами' },
  { code: 'communication', label: 'Коммуникация' },
  { code: 'design', label: 'Дизайн' },
  { code: 'analytics', label: 'Аналитика' },
  { code: 'marketing', label: 'Маркетинг' },
  { code: 'sales', label: 'Продажи' },
  { code: 'writing', label: 'Копирайтинг' },
  { code: 'presentation', label: 'Презентации' },
  { code: 'negotiation', label: 'Переговоры' },
  { code: 'leadership', label: 'Лидерство' },
  { code: 'teamwork', label: 'Командная работа' },
  { code: 'problem_solving', label: 'Решение задач' },
  { code: 'creativity', label: 'Креативность' },
  { code: 'photography', label: 'Фотография' },
  { code: 'video_editing', label: 'Монтаж видео' },
  { code: 'smm', label: 'SMM' },
  { code: 'seo', label: 'SEO' },
  { code: 'legal', label: 'Юриспруденция' },
  { code: 'finance', label: 'Финансы' },
  { code: 'hr', label: 'HR' },
  { code: 'event_management', label: 'Организация мероприятий' },
  { code: 'public_speaking', label: 'Публичные выступления' },
  { code: 'research', label: 'Исследования' },
  { code: 'data_analysis', label: 'Анализ данных' },
  { code: 'product_development', label: 'Разработка продукта' },
] as const;

export const USER_PROFILE_SKILL_CODES = USER_PROFILE_SKILLS.map((s) => s.code);

/**
 * Регионы Узбекистана (где живёт пользователь)
 */
export const UZBEKISTAN_REGIONS = [
  'Ташкент',
  'Андижанская область',
  'Бухарская область',
  'Джизакская область',
  'Кашкадарьинская область',
  'Навоийская область',
  'Наманганская область',
  'Самаркандская область',
  'Сурхандарьинская область',
  'Сырдарьинская область',
  'Ташкентская область',
  'Ферганская область',
  'Хорезмская область',
  'Республика Каракалпакстан',
] as const;

/**
 * Языки (можно выбрать несколько)
 */
export const USER_PROFILE_LANGUAGES = [
  { code: 'ru', label: 'Русский' },
  { code: 'uz', label: "O'zbek" },
  { code: 'en', label: 'English' },
  { code: 'kk', label: 'Qoraqalpoq' },
  { code: 'tg', label: 'Тоҷикӣ' },
  { code: 'ky', label: 'Кыргызча' },
  { code: 'tk', label: 'Türkmen' },
  { code: 'other', label: 'Другой' },
] as const;

export const USER_PROFILE_LANGUAGE_CODES = USER_PROFILE_LANGUAGES.map(
  (l) => l.code,
);
