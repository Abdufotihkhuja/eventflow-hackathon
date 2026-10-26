-- CreateEnum
CREATE TYPE "AppBuildPlatform" AS ENUM ('ANDROID', 'IOS');

-- CreateTable
CREATE TABLE "app_builds" (
    "id" UUID NOT NULL,
    "platform" "AppBuildPlatform" NOT NULL,
    "version" TEXT NOT NULL,
    "notes" TEXT,
    "original_name" TEXT NOT NULL,
    "stored_path" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploaded_by_id" UUID,
    "uploaded_by_email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_builds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "app_builds_platform_idx" ON "app_builds"("platform");

-- CreateIndex
CREATE INDEX "app_builds_created_at_idx" ON "app_builds"("created_at");
