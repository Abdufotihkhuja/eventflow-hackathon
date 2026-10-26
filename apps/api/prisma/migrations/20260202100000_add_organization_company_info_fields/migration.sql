-- AlterTable: Доп. поля компании для организатора (popup «Заполните доп. поля»)
ALTER TABLE "organizations" ADD COLUMN "industry" VARCHAR(100);
ALTER TABLE "organizations" ADD COLUMN "company_size" VARCHAR(100);
ALTER TABLE "organizations" ADD COLUMN "company_info_completed" BOOLEAN NOT NULL DEFAULT false;
