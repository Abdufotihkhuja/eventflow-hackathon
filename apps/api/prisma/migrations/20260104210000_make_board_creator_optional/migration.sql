-- AlterTable: Делаем createdById опциональным для поддержки создания досок организацией
ALTER TABLE "boards" ALTER COLUMN "created_by_id" DROP NOT NULL;

