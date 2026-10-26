-- CreateTable: SavedArticle - избранные статьи пользователя
CREATE TABLE "saved_articles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "article_url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "cover_image" TEXT,
    "category" TEXT,
    "published_at" TIMESTAMP(3),
    "reading_time" INTEGER,
    "author_name" TEXT,
    "saved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_articles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: уникальность статьи для пользователя
CREATE UNIQUE INDEX "saved_articles_user_id_article_url_key" ON "saved_articles"("user_id", "article_url");

-- CreateIndex
CREATE INDEX "saved_articles_user_id_idx" ON "saved_articles"("user_id");

-- CreateIndex
CREATE INDEX "saved_articles_saved_at_idx" ON "saved_articles"("saved_at");

-- AddForeignKey
ALTER TABLE "saved_articles" ADD CONSTRAINT "saved_articles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

