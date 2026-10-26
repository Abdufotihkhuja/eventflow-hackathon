-- AlterTable
ALTER TABLE "events" ADD COLUMN "deleted_at" TIMESTAMP(3),
ADD COLUMN "deleted_by_super_admin_id" UUID,
ADD COLUMN "deletion_reason" TEXT;

-- AlterTable
ALTER TABLE "blog_posts" ADD COLUMN "deleted_at" TIMESTAMP(3),
ADD COLUMN "deleted_by_super_admin_id" UUID,
ADD COLUMN "deletion_reason" TEXT;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_deleted_by_super_admin_id_fkey" FOREIGN KEY ("deleted_by_super_admin_id") REFERENCES "super_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_deleted_by_super_admin_id_fkey" FOREIGN KEY ("deleted_by_super_admin_id") REFERENCES "super_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
