-- Добавляем поле slug для SEO-friendly URL событий

-- 1. Добавляем колонку как nullable
ALTER TABLE "events" ADD COLUMN "slug" TEXT;

-- 2. Генерируем slug для существующих записей
-- Используем transliterated title + id suffix для уникальности
UPDATE "events" 
SET "slug" = CONCAT(
  LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            REGEXP_REPLACE(
              REGEXP_REPLACE(
                REGEXP_REPLACE(
                  REGEXP_REPLACE(
                    REGEXP_REPLACE(
                      REGEXP_REPLACE(
                        REGEXP_REPLACE(
                          REGEXP_REPLACE(
                            REGEXP_REPLACE(
                              REGEXP_REPLACE(
                                REGEXP_REPLACE(
                                  REGEXP_REPLACE(
                                    REGEXP_REPLACE(
                                      REGEXP_REPLACE(
                                        REGEXP_REPLACE(
                                          REGEXP_REPLACE(
                                            REGEXP_REPLACE(
                                              REGEXP_REPLACE(
                                                REGEXP_REPLACE(
                                                  REGEXP_REPLACE(
                                                    REGEXP_REPLACE(
                                                      REGEXP_REPLACE(
                                                        REGEXP_REPLACE(
                                                          REGEXP_REPLACE(
                                                            REGEXP_REPLACE(
                                                              REGEXP_REPLACE(
                                                                REGEXP_REPLACE(
                                                                  REGEXP_REPLACE(
                                                                    REGEXP_REPLACE(title, 'а', 'a', 'gi'),
                                                                  'б', 'b', 'gi'),
                                                                'в', 'v', 'gi'),
                                                              'г', 'g', 'gi'),
                                                            'д', 'd', 'gi'),
                                                          'е', 'e', 'gi'),
                                                        'ё', 'yo', 'gi'),
                                                      'ж', 'zh', 'gi'),
                                                    'з', 'z', 'gi'),
                                                  'и', 'i', 'gi'),
                                                'й', 'y', 'gi'),
                                              'к', 'k', 'gi'),
                                            'л', 'l', 'gi'),
                                          'м', 'm', 'gi'),
                                        'н', 'n', 'gi'),
                                      'о', 'o', 'gi'),
                                    'п', 'p', 'gi'),
                                  'р', 'r', 'gi'),
                                'с', 's', 'gi'),
                              'т', 't', 'gi'),
                            'у', 'u', 'gi'),
                          'ф', 'f', 'gi'),
                        'х', 'h', 'gi'),
                      'ц', 'ts', 'gi'),
                    'ч', 'ch', 'gi'),
                  'ш', 'sh', 'gi'),
                'щ', 'sch', 'gi'),
              'ъ', '', 'gi'),
            'ы', 'y', 'gi'),
          'ь', '', 'gi'),
        'э', 'e', 'gi'),
      'ю', 'yu', 'gi'),
    'я', 'ya', 'gi')
  ),
  '-',
  LEFT(id::text, 8)
);

-- Убираем специальные символы и заменяем пробелы на дефисы
UPDATE "events"
SET "slug" = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE("slug", '[^a-z0-9\-\s]', '', 'gi'),
      '\s+', '-', 'g'
    ),
    '-+', '-', 'g'
  )
);

-- Убираем дефисы в начале и конце
UPDATE "events"
SET "slug" = TRIM(BOTH '-' FROM "slug");

-- 3. Делаем колонку NOT NULL
ALTER TABLE "events" ALTER COLUMN "slug" SET NOT NULL;

-- 4. Добавляем уникальный индекс
CREATE UNIQUE INDEX "events_slug_key" ON "events"("slug");

-- 5. Добавляем индекс для быстрого поиска по slug
CREATE INDEX "events_slug_idx" ON "events"("slug");
