-- Расширяем EntitlementKey ключом MAX_EVENTS (override-only лимит на общее
-- число созданных событий; тарифного дефолта нет — по умолчанию безлимит).
-- Enum-additive: значение только добавляется, существующие строки не трогаются.
ALTER TYPE "EntitlementKey" ADD VALUE IF NOT EXISTS 'MAX_EVENTS';
