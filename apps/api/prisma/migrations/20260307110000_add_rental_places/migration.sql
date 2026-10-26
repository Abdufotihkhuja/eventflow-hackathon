CREATE TYPE "RentalPlaceStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

ALTER TABLE "organizations"
ADD COLUMN "places_feature_enabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "events"
ADD COLUMN "rental_place_id" UUID;

CREATE TABLE "rental_places" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" JSONB,
    "short_description" VARCHAR(500),
    "status" "RentalPlaceStatus" NOT NULL DEFAULT 'DRAFT',
    "price" DECIMAL(10,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'UZS',
    "capacity" INTEGER,
    "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "address" VARCHAR(500) NOT NULL,
    "address_notes" VARCHAR(500),
    "city" VARCHAR(100),
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "place_id" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rental_places_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "rental_place_images" (
    "id" UUID NOT NULL,
    "rental_place_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rental_place_images_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "rental_places_slug_key" ON "rental_places"("slug");
CREATE INDEX "rental_places_organization_id_idx" ON "rental_places"("organization_id");
CREATE INDEX "rental_places_status_idx" ON "rental_places"("status");
CREATE INDEX "rental_places_city_idx" ON "rental_places"("city");
CREATE INDEX "rental_places_latitude_longitude_idx" ON "rental_places"("latitude", "longitude");
CREATE INDEX "rental_place_images_rental_place_id_sort_order_idx" ON "rental_place_images"("rental_place_id", "sort_order");
CREATE INDEX "events_rental_place_id_idx" ON "events"("rental_place_id");

ALTER TABLE "events"
ADD CONSTRAINT "events_rental_place_id_fkey"
FOREIGN KEY ("rental_place_id") REFERENCES "rental_places"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "rental_places"
ADD CONSTRAINT "rental_places_organization_id_fkey"
FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "rental_place_images"
ADD CONSTRAINT "rental_place_images_rental_place_id_fkey"
FOREIGN KEY ("rental_place_id") REFERENCES "rental_places"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
