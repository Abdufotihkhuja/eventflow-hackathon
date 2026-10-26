-- Introduce a global, super-admin-managed blog category taxonomy and link blog
-- posts to it via a single optional `category_id` FK. The previous free-text
-- `category` column on blog_posts (which was unused in application code) is
-- dropped in favour of the normalized relation.

-- CreateTable
CREATE TABLE "blog_categories" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "translations" JSONB NOT NULL DEFAULT '{}',
    "translation_meta" JSONB NOT NULL DEFAULT '{}',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "blog_categories_name_key" ON "blog_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "blog_categories_slug_key" ON "blog_categories"("slug");

-- CreateIndex
CREATE INDEX "blog_categories_is_active_sort_order_idx" ON "blog_categories"("is_active", "sort_order");

-- AlterTable: replace the legacy free-text category column with a FK
ALTER TABLE "blog_posts" DROP COLUMN IF EXISTS "category";
ALTER TABLE "blog_posts" ADD COLUMN "category_id" UUID;

-- CreateIndex
CREATE INDEX "blog_posts_category_id_idx" ON "blog_posts"("category_id");

-- AddForeignKey
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "blog_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed the standard blog categories so the public blog catalog keeps working.
-- Slugs match the previous hardcoded frontend taxonomy so existing filters and
-- category labels line up. Idempotent: re-running skips existing slugs.
INSERT INTO "blog_categories"
  ("id", "name", "slug", "translations", "translation_meta", "sort_order", "is_active", "created_at", "updated_at")
VALUES
  (gen_random_uuid(), 'Советы и гиды', 'tips-guides',
   '{"name":{"ru":"Советы и гиды","uz":"Maslahatlar","en":"Tips & Guides"}}', '{}', 0, true, now(), now()),
  (gen_random_uuid(), 'Тренды', 'news-trends',
   '{"name":{"ru":"Тренды","uz":"Trendlar","en":"News & Trends"}}', '{}', 1, true, now(), now()),
  (gen_random_uuid(), 'Сообщество', 'community',
   '{"name":{"ru":"Сообщество","uz":"Hamjamiyat","en":"Community"}}', '{}', 2, true, now(), now()),
  (gen_random_uuid(), 'Инструменты', 'tools-features',
   '{"name":{"ru":"Инструменты","uz":"Vositalar","en":"Tools & Features"}}', '{}', 3, true, now(), now()),
  (gen_random_uuid(), 'Планирование', 'event-planning',
   '{"name":{"ru":"Планирование","uz":"Rejalashtirish","en":"Event Planning"}}', '{}', 4, true, now(), now()),
  (gen_random_uuid(), 'Маркетинг', 'event-marketing',
   '{"name":{"ru":"Маркетинг","uz":"Marketing","en":"Event Marketing"}}', '{}', 5, true, now(), now()),
  (gen_random_uuid(), 'Управление', 'event-management',
   '{"name":{"ru":"Управление","uz":"Boshqaruv","en":"Event Management"}}', '{}', 6, true, now(), now())
ON CONFLICT ("slug") DO NOTHING;
