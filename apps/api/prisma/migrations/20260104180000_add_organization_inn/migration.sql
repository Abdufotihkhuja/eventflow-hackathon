-- AlterTable
ALTER TABLE "organizations" ADD COLUMN "inn" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "organizations_inn_key" ON "organizations"("inn");

