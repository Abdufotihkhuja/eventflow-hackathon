-- AlterTable: Делаем поля с memberId опциональными для поддержки операций от организации
ALTER TABLE "board_tasks" ALTER COLUMN "created_by_id" DROP NOT NULL;
ALTER TABLE "board_task_assignees" ALTER COLUMN "assigned_by_id" DROP NOT NULL;
ALTER TABLE "board_task_activities" ALTER COLUMN "member_id" DROP NOT NULL;
ALTER TABLE "board_task_comments" ALTER COLUMN "member_id" DROP NOT NULL;
ALTER TABLE "board_task_attachments" ALTER COLUMN "uploaded_by_id" DROP NOT NULL;
ALTER TABLE "board_checklist_items" ALTER COLUMN "completed_by_id" DROP NOT NULL;
ALTER TABLE "board_members" ALTER COLUMN "added_by_id" DROP NOT NULL;

