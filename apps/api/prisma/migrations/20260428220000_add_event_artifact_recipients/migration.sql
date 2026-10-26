-- CreateEnum
CREATE TYPE "EventRecipientStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EventRecipientSourceType" AS ENUM ('USER', 'REGISTRATION', 'SPEAKER', 'MANUAL', 'EMAIL');

-- CreateEnum
CREATE TYPE "EventRecipientRoleKind" AS ENUM ('BUILT_IN', 'CUSTOM');

-- CreateEnum
CREATE TYPE "BuiltInEventRecipientRoleKey" AS ENUM ('PARTICIPANT', 'SPEAKER', 'STAFF', 'VIP', 'SPONSOR', 'VOLUNTEER', 'ORGANIZER');

-- CreateEnum
CREATE TYPE "EventRecipientRoleAssignmentStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "EventRecipientRoleSourceType" AS ENUM ('REGISTRATION', 'SPEAKER', 'MANUAL', 'SYSTEM');

-- CreateTable
CREATE TABLE "event_recipients" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "user_id" UUID,
    "display_name" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "email" TEXT,
    "email_normalized" TEXT,
    "status" "EventRecipientStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "event_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_recipient_sources" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "recipient_id" UUID NOT NULL,
    "source_type" "EventRecipientSourceType" NOT NULL,
    "source_id" UUID,
    "email_snapshot" TEXT,
    "name_snapshot" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_recipient_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_recipient_roles" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "kind" "EventRecipientRoleKind" NOT NULL,
    "built_in_key" "BuiltInEventRecipientRoleKey",
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_artifact_eligible" BOOLEAN NOT NULL DEFAULT true,
    "source_mapping" "EventRecipientRoleSourceType",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_recipient_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_recipient_role_assignments" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "recipient_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "source_type" "EventRecipientRoleSourceType",
    "source_id" UUID,
    "status" "EventRecipientRoleAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_recipient_role_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_recipients_event_id_user_id_key" ON "event_recipients"("event_id", "user_id");
CREATE INDEX "event_recipients_event_id_idx" ON "event_recipients"("event_id");
CREATE INDEX "event_recipients_event_id_email_normalized_idx" ON "event_recipients"("event_id", "email_normalized");
CREATE INDEX "event_recipients_user_id_idx" ON "event_recipients"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_recipient_sources_event_id_source_type_source_id_key" ON "event_recipient_sources"("event_id", "source_type", "source_id");
CREATE INDEX "event_recipient_sources_recipient_id_idx" ON "event_recipient_sources"("recipient_id");
CREATE INDEX "event_recipient_sources_event_id_source_type_idx" ON "event_recipient_sources"("event_id", "source_type");

-- CreateIndex
CREATE UNIQUE INDEX "event_recipient_roles_event_id_code_key" ON "event_recipient_roles"("event_id", "code");
CREATE UNIQUE INDEX "event_recipient_roles_event_id_built_in_key_key" ON "event_recipient_roles"("event_id", "built_in_key");
CREATE INDEX "event_recipient_roles_event_id_is_active_idx" ON "event_recipient_roles"("event_id", "is_active");
CREATE INDEX "event_recipient_roles_event_id_is_artifact_eligible_idx" ON "event_recipient_roles"("event_id", "is_artifact_eligible");

-- CreateIndex
CREATE UNIQUE INDEX "event_recipient_role_assignments_recipient_id_role_id_key" ON "event_recipient_role_assignments"("recipient_id", "role_id");
CREATE INDEX "event_recipient_role_assignments_event_id_role_id_status_idx" ON "event_recipient_role_assignments"("event_id", "role_id", "status");
CREATE INDEX "event_recipient_role_assignments_event_id_recipient_id_idx" ON "event_recipient_role_assignments"("event_id", "recipient_id");

-- AddForeignKey
ALTER TABLE "event_recipients" ADD CONSTRAINT "event_recipients_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_recipients" ADD CONSTRAINT "event_recipients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_recipient_sources" ADD CONSTRAINT "event_recipient_sources_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_recipient_sources" ADD CONSTRAINT "event_recipient_sources_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "event_recipients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_recipient_roles" ADD CONSTRAINT "event_recipient_roles_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_recipient_role_assignments" ADD CONSTRAINT "event_recipient_role_assignments_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_recipient_role_assignments" ADD CONSTRAINT "event_recipient_role_assignments_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "event_recipients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_recipient_role_assignments" ADD CONSTRAINT "event_recipient_role_assignments_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "event_recipient_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
