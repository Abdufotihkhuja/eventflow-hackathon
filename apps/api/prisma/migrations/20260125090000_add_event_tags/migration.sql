-- CreateEnum
CREATE TYPE "TagCategory" AS ENUM ('FORMAT', 'AUDIENCE', 'TOPIC', 'CUSTOM');

-- CreateTable
CREATE TABLE "event_tags" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" "TagCategory" NOT NULL DEFAULT 'CUSTOM',
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "organization_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_tag_assignments" (
    "event_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,

    CONSTRAINT "event_tag_assignments_pkey" PRIMARY KEY ("event_id","tag_id")
);

-- CreateIndex
CREATE INDEX "event_tags_is_system_idx" ON "event_tags"("is_system");

-- CreateIndex
CREATE INDEX "event_tags_organization_id_idx" ON "event_tags"("organization_id");

-- CreateIndex
CREATE INDEX "event_tags_category_idx" ON "event_tags"("category");

-- CreateIndex
CREATE UNIQUE INDEX "event_tags_organization_id_slug_key" ON "event_tags"("organization_id", "slug");

-- CreateIndex
CREATE INDEX "event_tag_assignments_event_id_idx" ON "event_tag_assignments"("event_id");

-- CreateIndex
CREATE INDEX "event_tag_assignments_tag_id_idx" ON "event_tag_assignments"("tag_id");

-- AddForeignKey
ALTER TABLE "event_tags" ADD CONSTRAINT "event_tags_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_tag_assignments" ADD CONSTRAINT "event_tag_assignments_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_tag_assignments" ADD CONSTRAINT "event_tag_assignments_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "event_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
