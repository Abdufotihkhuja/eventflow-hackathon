-- CreateTable: EventComment - комментарии к мероприятиям
CREATE TABLE "event_comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "parent_id" UUID,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable: EventCommentLike - лайки/дизлайки комментариев
CREATE TABLE "event_comment_likes" (
    "comment_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "is_like" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_comment_likes_pkey" PRIMARY KEY ("comment_id","user_id")
);

-- CreateIndex
CREATE INDEX "event_comments_event_id_idx" ON "event_comments"("event_id");

-- CreateIndex
CREATE INDEX "event_comments_user_id_idx" ON "event_comments"("user_id");

-- CreateIndex
CREATE INDEX "event_comments_parent_id_idx" ON "event_comments"("parent_id");

-- CreateIndex
CREATE INDEX "event_comments_created_at_idx" ON "event_comments"("created_at");

-- CreateIndex
CREATE INDEX "event_comment_likes_comment_id_idx" ON "event_comment_likes"("comment_id");

-- CreateIndex
CREATE INDEX "event_comment_likes_user_id_idx" ON "event_comment_likes"("user_id");

-- AddForeignKey
ALTER TABLE "event_comments" ADD CONSTRAINT "event_comments_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_comments" ADD CONSTRAINT "event_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_comments" ADD CONSTRAINT "event_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "event_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_comment_likes" ADD CONSTRAINT "event_comment_likes_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "event_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_comment_likes" ADD CONSTRAINT "event_comment_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
