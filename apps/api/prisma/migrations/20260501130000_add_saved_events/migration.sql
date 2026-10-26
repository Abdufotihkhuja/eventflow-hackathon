-- CreateTable
CREATE TABLE "saved_events" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "saved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "saved_events_user_id_idx" ON "saved_events"("user_id");

-- CreateIndex
CREATE INDEX "saved_events_event_id_idx" ON "saved_events"("event_id");

-- CreateIndex
CREATE INDEX "saved_events_saved_at_idx" ON "saved_events"("saved_at");

-- CreateIndex
CREATE UNIQUE INDEX "saved_events_user_id_event_id_key" ON "saved_events"("user_id", "event_id");

-- AddForeignKey
ALTER TABLE "saved_events" ADD CONSTRAINT "saved_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_events" ADD CONSTRAINT "saved_events_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
