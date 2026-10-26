-- Per-event halls/rooms entity. Replaces text-match validation on
-- agenda_items.location with a proper FK; legacy location column stays
-- populated as snapshot for emails/PDF/old clients/search.

CREATE TABLE "event_rooms" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "event_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "translations" JSONB NOT NULL DEFAULT '{}',
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "event_rooms_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "event_rooms_event_id_fkey" FOREIGN KEY ("event_id")
    REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "event_rooms_event_id_name_key" ON "event_rooms"("event_id", "name");
CREATE INDEX "event_rooms_event_id_idx" ON "event_rooms"("event_id");

ALTER TABLE "agenda_items"
  ADD COLUMN "room_id" UUID;
ALTER TABLE "agenda_items"
  ADD CONSTRAINT "agenda_items_room_id_fkey" FOREIGN KEY ("room_id")
    REFERENCES "event_rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "agenda_items_room_id_idx" ON "agenda_items"("room_id");

-- Backfill: distinct non-empty location strings per event become EventRoom
-- rows. translations.name.ru is seeded with the same string so the
-- workspace UI shows a value on the source-locale tab and can auto-translate
-- it to uz/en on demand. Existing agenda items get their room_id linked by
-- exact trimmed match on the same name within the same event.
INSERT INTO "event_rooms" ("id", "event_id", "name", "translations", "sort_order", "updated_at")
SELECT
  gen_random_uuid(),
  event_id,
  TRIM(location),
  jsonb_build_object('name', jsonb_build_object('ru', TRIM(location))),
  ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY MIN(created_at)) * 10,
  NOW()
FROM "agenda_items"
WHERE location IS NOT NULL AND TRIM(location) <> ''
GROUP BY event_id, TRIM(location);

UPDATE "agenda_items" a
SET room_id = r.id
FROM "event_rooms" r
WHERE a.event_id = r.event_id
  AND a.location IS NOT NULL
  AND TRIM(a.location) = r.name;
