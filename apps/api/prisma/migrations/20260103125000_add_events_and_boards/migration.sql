-- ==================== ENUMS ====================

-- CreateEnum: EventType
CREATE TYPE "EventType" AS ENUM ('FREE', 'PAID');

-- CreateEnum: EventAccessType
CREATE TYPE "EventAccessType" AS ENUM ('OPEN', 'REQUEST', 'INVITE_ONLY');

-- CreateEnum: EventFormat
CREATE TYPE "EventFormat" AS ENUM ('ONLINE', 'OFFLINE', 'HYBRID');

-- CreateEnum: EventStatus
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED');

-- CreateEnum: AgendaItemType
CREATE TYPE "AgendaItemType" AS ENUM ('KEYNOTE', 'PRESENTATION', 'WORKSHOP', 'PANEL', 'NETWORKING', 'BREAK');

-- CreateEnum: QuestionType
CREATE TYPE "QuestionType" AS ENUM ('TEXT', 'NUMBER', 'SELECT', 'CHECKBOX', 'TEXTAREA');

-- CreateEnum: RegistrationStatus
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum: ParticipantRole
CREATE TYPE "ParticipantRole" AS ENUM ('PARTICIPANT', 'SPEAKER', 'MENTOR');

-- CreateEnum: Currency
CREATE TYPE "Currency" AS ENUM ('RUB', 'USD', 'EUR', 'UZS');

-- CreateEnum: BoardRole
CREATE TYPE "BoardRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');

-- CreateEnum: TaskType
CREATE TYPE "TaskType" AS ENUM ('STORY', 'TASK', 'BUG');

-- CreateEnum: TaskPriority
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum: ActivityType
CREATE TYPE "ActivityType" AS ENUM ('CREATED', 'UPDATED', 'MOVED', 'ASSIGNED', 'UNASSIGNED', 'COMMENTED', 'ATTACHMENT_ADDED', 'ATTACHMENT_REMOVED', 'CHECKLIST_ADDED', 'CHECKLIST_UPDATED', 'TAG_ADDED', 'TAG_REMOVED');

-- ==================== EVENTS ====================

-- CreateTable: events
CREATE TABLE "events" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "short_description" TEXT,
    "cover_image" TEXT,
    "type" "EventType" NOT NULL DEFAULT 'FREE',
    "access_type" "EventAccessType" NOT NULL DEFAULT 'OPEN',
    "format" "EventFormat" NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "registration_deadline" TIMESTAMP(3),
    "venue" TEXT,
    "address" TEXT,
    "city" TEXT,
    "online_url" TEXT,
    "price" DECIMAL(10,2),
    "currency" "Currency" NOT NULL DEFAULT 'UZS',
    "max_participants" INTEGER,
    "invite_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "events_invite_code_key" ON "events"("invite_code");
CREATE INDEX "events_organization_id_idx" ON "events"("organization_id");
CREATE INDEX "events_status_idx" ON "events"("status");
CREATE INDEX "events_start_date_idx" ON "events"("start_date");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ==================== SPEAKERS ====================

-- CreateTable: speakers
CREATE TABLE "speakers" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "company" TEXT,
    "bio" TEXT,
    "avatar_url" TEXT,
    "linkedin_url" TEXT,
    "twitter_url" TEXT,
    "website_url" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "speakers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "speakers_event_id_idx" ON "speakers"("event_id");

-- AddForeignKey
ALTER TABLE "speakers" ADD CONSTRAINT "speakers_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ==================== AGENDA ITEMS ====================

-- CreateTable: agenda_items
CREATE TABLE "agenda_items" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "AgendaItemType" NOT NULL,
    "start_time" TIME NOT NULL,
    "duration" INTEGER NOT NULL,
    "location" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agenda_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agenda_items_event_id_idx" ON "agenda_items"("event_id");

-- AddForeignKey
ALTER TABLE "agenda_items" ADD CONSTRAINT "agenda_items_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: _AgendaSpeakers (many-to-many relation)
CREATE TABLE "_AgendaSpeakers" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_AgendaSpeakers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_AgendaSpeakers_B_index" ON "_AgendaSpeakers"("B");

-- AddForeignKey
ALTER TABLE "_AgendaSpeakers" ADD CONSTRAINT "_AgendaSpeakers_A_fkey" FOREIGN KEY ("A") REFERENCES "agenda_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_AgendaSpeakers" ADD CONSTRAINT "_AgendaSpeakers_B_fkey" FOREIGN KEY ("B") REFERENCES "speakers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ==================== REGISTRATION QUESTIONS ====================

-- CreateTable: registration_questions
CREATE TABLE "registration_questions" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "question" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "options" TEXT[],
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registration_questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "registration_questions_event_id_idx" ON "registration_questions"("event_id");

-- AddForeignKey
ALTER TABLE "registration_questions" ADD CONSTRAINT "registration_questions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ==================== REGISTRATIONS ====================

-- CreateTable: registrations
CREATE TABLE "registrations" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "role" "ParticipantRole" NOT NULL DEFAULT 'PARTICIPANT',
    "qr_code" TEXT,
    "rejection_reason" TEXT,
    "travel_start_date" DATE,
    "travel_end_date" DATE,
    "preparation_days" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "registrations_qr_code_key" ON "registrations"("qr_code");
CREATE UNIQUE INDEX "registrations_event_id_user_id_key" ON "registrations"("event_id", "user_id");
CREATE INDEX "registrations_event_id_idx" ON "registrations"("event_id");
CREATE INDEX "registrations_user_id_idx" ON "registrations"("user_id");
CREATE INDEX "registrations_status_idx" ON "registrations"("status");
CREATE INDEX "registrations_role_idx" ON "registrations"("role");

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ==================== QUESTION ANSWERS ====================

-- CreateTable: question_answers
CREATE TABLE "question_answers" (
    "id" UUID NOT NULL,
    "registration_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "answer" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "question_answers_registration_id_question_id_key" ON "question_answers"("registration_id", "question_id");

-- AddForeignKey
ALTER TABLE "question_answers" ADD CONSTRAINT "question_answers_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "question_answers" ADD CONSTRAINT "question_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "registration_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ==================== ATTENDANCES ====================

-- CreateTable: attendances
CREATE TABLE "attendances" (
    "id" UUID NOT NULL,
    "registration_id" UUID NOT NULL,
    "check_in_at" TIMESTAMP(3) NOT NULL,
    "check_in_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "attendances_registration_id_check_in_date_key" ON "attendances"("registration_id", "check_in_date");
CREATE INDEX "attendances_registration_id_idx" ON "attendances"("registration_id");
CREATE INDEX "attendances_check_in_date_idx" ON "attendances"("check_in_date");

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ==================== CERTIFICATES ====================

-- CreateTable: certificates
CREATE TABLE "certificates" (
    "id" UUID NOT NULL,
    "registration_id" UUID NOT NULL,
    "certificate_url" TEXT,
    "generated_at" TIMESTAMP(3),
    "download_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "certificates_registration_id_key" ON "certificates"("registration_id");

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ==================== BOARDS ====================

-- CreateTable: boards
CREATE TABLE "boards" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "event_id" UUID,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "cover_image" TEXT,
    "background_color" TEXT,
    "settings" JSONB DEFAULT '{}',
    "is_favorite" BOOLEAN NOT NULL DEFAULT false,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "boards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "boards_organization_id_idx" ON "boards"("organization_id");
CREATE INDEX "boards_event_id_idx" ON "boards"("event_id");
CREATE INDEX "boards_is_archived_idx" ON "boards"("is_archived");

-- AddForeignKey
ALTER TABLE "boards" ADD CONSTRAINT "boards_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "boards" ADD CONSTRAINT "boards_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "boards" ADD CONSTRAINT "boards_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "organization_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ==================== BOARD COLUMNS ====================

-- CreateTable: board_columns
CREATE TABLE "board_columns" (
    "id" UUID NOT NULL,
    "board_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "wip_limit" INTEGER,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "board_columns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "board_columns_board_id_idx" ON "board_columns"("board_id");

-- AddForeignKey
ALTER TABLE "board_columns" ADD CONSTRAINT "board_columns_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ==================== BOARD TASKS ====================

-- CreateTable: board_tasks
CREATE TABLE "board_tasks" (
    "id" UUID NOT NULL,
    "board_id" UUID NOT NULL,
    "column_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "TaskType" NOT NULL DEFAULT 'TASK',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "position" INTEGER NOT NULL DEFAULT 0,
    "due_date" TIMESTAMP(3),
    "start_date" TIMESTAMP(3),
    "estimated_hours" DECIMAL(6,2),
    "logged_hours" DECIMAL(6,2) DEFAULT 0,
    "cover_image" TEXT,
    "cover_color" TEXT,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "board_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "board_tasks_board_id_idx" ON "board_tasks"("board_id");
CREATE INDEX "board_tasks_column_id_idx" ON "board_tasks"("column_id");
CREATE INDEX "board_tasks_is_completed_idx" ON "board_tasks"("is_completed");
CREATE INDEX "board_tasks_due_date_idx" ON "board_tasks"("due_date");

-- AddForeignKey
ALTER TABLE "board_tasks" ADD CONSTRAINT "board_tasks_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "board_tasks" ADD CONSTRAINT "board_tasks_column_id_fkey" FOREIGN KEY ("column_id") REFERENCES "board_columns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ==================== BOARD TAGS ====================

-- CreateTable: board_tags
CREATE TABLE "board_tags" (
    "id" UUID NOT NULL,
    "board_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "board_tags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "board_tags_board_id_name_key" ON "board_tags"("board_id", "name");
CREATE INDEX "board_tags_board_id_idx" ON "board_tags"("board_id");

-- AddForeignKey
ALTER TABLE "board_tags" ADD CONSTRAINT "board_tags_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ==================== BOARD TASK TAGS ====================

-- CreateTable: board_task_tags
CREATE TABLE "board_task_tags" (
    "task_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,

    CONSTRAINT "board_task_tags_pkey" PRIMARY KEY ("task_id","tag_id")
);

-- AddForeignKey
ALTER TABLE "board_task_tags" ADD CONSTRAINT "board_task_tags_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "board_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "board_task_tags" ADD CONSTRAINT "board_task_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "board_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ==================== BOARD TASK ASSIGNEES ====================

-- CreateTable: board_task_assignees
CREATE TABLE "board_task_assignees" (
    "task_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by_id" UUID NOT NULL,

    CONSTRAINT "board_task_assignees_pkey" PRIMARY KEY ("task_id","member_id")
);

-- AddForeignKey
ALTER TABLE "board_task_assignees" ADD CONSTRAINT "board_task_assignees_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "board_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "board_task_assignees" ADD CONSTRAINT "board_task_assignees_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "organization_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "board_task_assignees" ADD CONSTRAINT "board_task_assignees_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "organization_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ==================== BOARD TASK COMMENTS ====================

-- CreateTable: board_task_comments
CREATE TABLE "board_task_comments" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "board_task_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "board_task_comments_task_id_idx" ON "board_task_comments"("task_id");

-- AddForeignKey
ALTER TABLE "board_task_comments" ADD CONSTRAINT "board_task_comments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "board_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "board_task_comments" ADD CONSTRAINT "board_task_comments_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "organization_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ==================== BOARD TASK ATTACHMENTS ====================

-- CreateTable: board_task_attachments
CREATE TABLE "board_task_attachments" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "uploaded_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "board_task_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "board_task_attachments_task_id_idx" ON "board_task_attachments"("task_id");

-- AddForeignKey
ALTER TABLE "board_task_attachments" ADD CONSTRAINT "board_task_attachments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "board_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "board_task_attachments" ADD CONSTRAINT "board_task_attachments_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "organization_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ==================== BOARD TASK CHECKLISTS ====================

-- CreateTable: board_task_checklists
CREATE TABLE "board_task_checklists" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "board_task_checklists_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "board_task_checklists_task_id_idx" ON "board_task_checklists"("task_id");

-- AddForeignKey
ALTER TABLE "board_task_checklists" ADD CONSTRAINT "board_task_checklists_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "board_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ==================== BOARD CHECKLIST ITEMS ====================

-- CreateTable: board_checklist_items
CREATE TABLE "board_checklist_items" (
    "id" UUID NOT NULL,
    "checklist_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMP(3),
    "completed_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "board_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "board_checklist_items_checklist_id_idx" ON "board_checklist_items"("checklist_id");

-- AddForeignKey
ALTER TABLE "board_checklist_items" ADD CONSTRAINT "board_checklist_items_checklist_id_fkey" FOREIGN KEY ("checklist_id") REFERENCES "board_task_checklists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "board_checklist_items" ADD CONSTRAINT "board_checklist_items_completed_by_id_fkey" FOREIGN KEY ("completed_by_id") REFERENCES "organization_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ==================== BOARD TASK ACTIVITIES ====================

-- CreateTable: board_task_activities
CREATE TABLE "board_task_activities" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "type" "ActivityType" NOT NULL,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "board_task_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "board_task_activities_task_id_idx" ON "board_task_activities"("task_id");
CREATE INDEX "board_task_activities_created_at_idx" ON "board_task_activities"("created_at");

-- AddForeignKey
ALTER TABLE "board_task_activities" ADD CONSTRAINT "board_task_activities_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "board_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "board_task_activities" ADD CONSTRAINT "board_task_activities_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "organization_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ==================== BOARD MEMBERS ====================

-- CreateTable: board_members
CREATE TABLE "board_members" (
    "board_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "role" "BoardRole" NOT NULL DEFAULT 'MEMBER',
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "added_by_id" UUID NOT NULL,

    CONSTRAINT "board_members_pkey" PRIMARY KEY ("board_id","member_id")
);

-- AddForeignKey
ALTER TABLE "board_members" ADD CONSTRAINT "board_members_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "board_members" ADD CONSTRAINT "board_members_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "organization_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "board_members" ADD CONSTRAINT "board_members_added_by_id_fkey" FOREIGN KEY ("added_by_id") REFERENCES "organization_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

