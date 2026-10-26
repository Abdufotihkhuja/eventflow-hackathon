-- CreateEnum
CREATE TYPE "BlogPostStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'PUBLISHED');

-- CreateTable
CREATE TABLE "blog_posts" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "short_description" VARCHAR(500),
    "cover_image" TEXT,
    "status" "BlogPostStatus" NOT NULL DEFAULT 'DRAFT',
    "comments_enabled" BOOLEAN NOT NULL DEFAULT true,
    "reading_time" INTEGER NOT NULL DEFAULT 0,
    "rejection_message" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "likes_count" INTEGER NOT NULL DEFAULT 0,
    "comments_count" INTEGER NOT NULL DEFAULT 0,
    "views_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_post_likes" (
    "post_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_post_likes_pkey" PRIMARY KEY ("post_id","user_id")
);

-- CreateTable
CREATE TABLE "blog_post_comments" (
    "id" UUID NOT NULL,
    "post_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "parent_id" UUID,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_post_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_post_comment_likes" (
    "comment_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "is_like" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_post_comment_likes_pkey" PRIMARY KEY ("comment_id","user_id")
);

-- CreateTable
CREATE TABLE "saved_blog_posts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "post_id" UUID NOT NULL,
    "saved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_blog_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_post_tag_assignments" (
    "post_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,

    CONSTRAINT "blog_post_tag_assignments_pkey" PRIMARY KEY ("post_id","tag_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "blog_posts_slug_key" ON "blog_posts"("slug");

-- CreateIndex
CREATE INDEX "blog_posts_organization_id_idx" ON "blog_posts"("organization_id");

-- CreateIndex
CREATE INDEX "blog_posts_status_idx" ON "blog_posts"("status");

-- CreateIndex
CREATE INDEX "blog_posts_published_at_idx" ON "blog_posts"("published_at");

-- CreateIndex
CREATE INDEX "blog_posts_slug_idx" ON "blog_posts"("slug");

-- CreateIndex
CREATE INDEX "blog_post_likes_post_id_idx" ON "blog_post_likes"("post_id");

-- CreateIndex
CREATE INDEX "blog_post_likes_user_id_idx" ON "blog_post_likes"("user_id");

-- CreateIndex
CREATE INDEX "blog_post_comments_post_id_idx" ON "blog_post_comments"("post_id");

-- CreateIndex
CREATE INDEX "blog_post_comments_user_id_idx" ON "blog_post_comments"("user_id");

-- CreateIndex
CREATE INDEX "blog_post_comments_parent_id_idx" ON "blog_post_comments"("parent_id");

-- CreateIndex
CREATE INDEX "blog_post_comments_created_at_idx" ON "blog_post_comments"("created_at");

-- CreateIndex
CREATE INDEX "blog_post_comment_likes_comment_id_idx" ON "blog_post_comment_likes"("comment_id");

-- CreateIndex
CREATE INDEX "blog_post_comment_likes_user_id_idx" ON "blog_post_comment_likes"("user_id");

-- CreateIndex
CREATE INDEX "saved_blog_posts_user_id_idx" ON "saved_blog_posts"("user_id");

-- CreateIndex
CREATE INDEX "saved_blog_posts_post_id_idx" ON "saved_blog_posts"("post_id");

-- CreateIndex
CREATE INDEX "saved_blog_posts_saved_at_idx" ON "saved_blog_posts"("saved_at");

-- CreateIndex
CREATE UNIQUE INDEX "saved_blog_posts_user_id_post_id_key" ON "saved_blog_posts"("user_id", "post_id");

-- CreateIndex
CREATE INDEX "blog_post_tag_assignments_post_id_idx" ON "blog_post_tag_assignments"("post_id");

-- CreateIndex
CREATE INDEX "blog_post_tag_assignments_tag_id_idx" ON "blog_post_tag_assignments"("tag_id");

-- AddForeignKey
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_post_likes" ADD CONSTRAINT "blog_post_likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_post_likes" ADD CONSTRAINT "blog_post_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_post_comments" ADD CONSTRAINT "blog_post_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_post_comments" ADD CONSTRAINT "blog_post_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_post_comments" ADD CONSTRAINT "blog_post_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "blog_post_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_post_comment_likes" ADD CONSTRAINT "blog_post_comment_likes_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "blog_post_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_post_comment_likes" ADD CONSTRAINT "blog_post_comment_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_blog_posts" ADD CONSTRAINT "saved_blog_posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_blog_posts" ADD CONSTRAINT "saved_blog_posts_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_post_tag_assignments" ADD CONSTRAINT "blog_post_tag_assignments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_post_tag_assignments" ADD CONSTRAINT "blog_post_tag_assignments_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "event_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
