-- CreateTable
CREATE TABLE "email_unsubscribes" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "user_id" UUID,
    "category" TEXT NOT NULL,
    "unsubscribed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_unsubscribes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_unsubscribes_email_idx" ON "email_unsubscribes"("email");

-- CreateIndex
CREATE UNIQUE INDEX "email_unsubscribes_email_category_key" ON "email_unsubscribes"("email", "category");
