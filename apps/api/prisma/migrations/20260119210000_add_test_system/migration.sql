-- ==================== CREATE ENUMS ====================

-- CreateEnum: QuestionCategory
CREATE TYPE "QuestionCategory" AS ENUM ('OPEN', 'CLOSED', 'ALTERNATIVE', 'RHETORICAL');

-- CreateEnum: RegistrationMode
CREATE TYPE "RegistrationMode" AS ENUM ('QUESTIONS', 'TEST');

-- CreateEnum: TestEvaluationType
CREATE TYPE "TestEvaluationType" AS ENUM ('AUTO_REJECT', 'EVALUATION');

-- ==================== ALTER TABLE: events ====================

-- AlterTable: events - добавить поля для режима регистрации и тестирования
ALTER TABLE "events" ADD COLUMN "registration_mode" "RegistrationMode" NOT NULL DEFAULT 'QUESTIONS';
ALTER TABLE "events" ADD COLUMN "test_evaluation_type" "TestEvaluationType";
ALTER TABLE "events" ADD COLUMN "min_test_score" INTEGER;
ALTER TABLE "events" ADD COLUMN "max_test_score" INTEGER;

-- ==================== ALTER TABLE: registration_questions ====================

-- AlterTable: registration_questions - добавить поля для категоризации и тестирования
ALTER TABLE "registration_questions" ADD COLUMN "category" "QuestionCategory" NOT NULL DEFAULT 'OPEN';
ALTER TABLE "registration_questions" ADD COLUMN "points" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "registration_questions" ADD COLUMN "correct_answer" TEXT;
ALTER TABLE "registration_questions" ADD COLUMN "correct_options" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "registration_questions" ADD COLUMN "informational_text" TEXT;

-- AlterTable: registration_questions - обновить комментарий для options
COMMENT ON COLUMN "registration_questions"."options" IS 'Варианты ответов для SELECT и CHECKBOX';

-- ==================== ALTER TABLE: registrations ====================

-- AlterTable: registrations - добавить поля для результатов тестирования
ALTER TABLE "registrations" ADD COLUMN "test_score" INTEGER;
ALTER TABLE "registrations" ADD COLUMN "test_max_score" INTEGER;
ALTER TABLE "registrations" ADD COLUMN "test_passed" BOOLEAN;
ALTER TABLE "registrations" ADD COLUMN "test_completed_at" TIMESTAMP(3);
