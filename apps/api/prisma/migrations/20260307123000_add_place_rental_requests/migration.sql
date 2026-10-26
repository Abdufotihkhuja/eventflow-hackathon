CREATE TYPE "ContactRequestType" AS ENUM ('GENERAL', 'PLACE_RENTAL');

ALTER TABLE "contact_requests"
ALTER COLUMN "user_id" DROP NOT NULL;

ALTER TABLE "contact_requests"
ADD COLUMN "requester_organization_id" UUID,
ADD COLUMN "rental_place_id" UUID,
ADD COLUMN "type" "ContactRequestType" NOT NULL DEFAULT 'GENERAL';

CREATE INDEX "contact_requests_type_idx" ON "contact_requests"("type");
CREATE INDEX "contact_requests_requester_organization_id_idx" ON "contact_requests"("requester_organization_id");
CREATE INDEX "contact_requests_rental_place_id_idx" ON "contact_requests"("rental_place_id");

ALTER TABLE "contact_requests"
ADD CONSTRAINT "contact_requests_requester_organization_id_fkey"
FOREIGN KEY ("requester_organization_id") REFERENCES "organizations"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "contact_requests"
ADD CONSTRAINT "contact_requests_rental_place_id_fkey"
FOREIGN KEY ("rental_place_id") REFERENCES "rental_places"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "contact_requests"
DROP CONSTRAINT "contact_requests_user_id_fkey";

ALTER TABLE "contact_requests"
ADD CONSTRAINT "contact_requests_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
