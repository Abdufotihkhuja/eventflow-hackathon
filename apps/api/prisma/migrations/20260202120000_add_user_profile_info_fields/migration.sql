-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "UserProfileStatus" AS ENUM ('WORKER', 'SCHOOLBOY', 'STUDENT');

-- CreateEnum
CREATE TYPE "Specialization" AS ENUM ('LAWYER', 'PROGRAMMER', 'DESIGNER', 'PHOTOGRAPHER', 'PROJECT_MANAGER', 'PRODUCT_MANAGER');

-- AlterTable: Доп. поля профиля пользователя (popup «Заполните доп. поля»)
ALTER TABLE "users" ADD COLUMN "gender" "Gender";
ALTER TABLE "users" ADD COLUMN "date_of_birth" DATE;
ALTER TABLE "users" ADD COLUMN "region" VARCHAR(150);
ALTER TABLE "users" ADD COLUMN "languages" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "users" ADD COLUMN "profile_status" "UserProfileStatus";
ALTER TABLE "users" ADD COLUMN "work_or_study_place" VARCHAR(500);
ALTER TABLE "users" ADD COLUMN "skills" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "users" ADD COLUMN "specialization" "Specialization";
ALTER TABLE "users" ADD COLUMN "short_bio" VARCHAR(150);
ALTER TABLE "users" ADD COLUMN "profile_info_completed" BOOLEAN NOT NULL DEFAULT false;
