-- CreateTable
CREATE TABLE "event_categories" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_collections" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "cover_image" TEXT,
    "gradient_start" TEXT,
    "gradient_end" TEXT,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_collection_items" (
    "collection_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_collection_items_pkey" PRIMARY KEY ("collection_id","event_id")
);

-- AlterTable
ALTER TABLE "events" ADD COLUMN "category_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "event_categories_name_key" ON "event_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "event_categories_slug_key" ON "event_categories"("slug");

-- CreateIndex
CREATE INDEX "event_categories_is_active_sort_order_idx" ON "event_categories"("is_active", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "event_collections_slug_key" ON "event_collections"("slug");

-- CreateIndex
CREATE INDEX "event_collections_is_active_sort_order_idx" ON "event_collections"("is_active", "sort_order");

-- CreateIndex
CREATE INDEX "event_collection_items_collection_id_idx" ON "event_collection_items"("collection_id");

-- CreateIndex
CREATE INDEX "event_collection_items_event_id_idx" ON "event_collection_items"("event_id");

-- CreateIndex
CREATE INDEX "events_category_id_idx" ON "events"("category_id");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "event_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_collection_items" ADD CONSTRAINT "event_collection_items_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "event_collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_collection_items" ADD CONSTRAINT "event_collection_items_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
