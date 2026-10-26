-- CreateTable: UserFollowing - подписки пользователей на организаторов
CREATE TABLE "user_followings" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_followings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: одна подписка на пару user + organization
CREATE UNIQUE INDEX "user_followings_user_id_organization_id_key" ON "user_followings"("user_id", "organization_id");

-- CreateIndex
CREATE INDEX "user_followings_user_id_idx" ON "user_followings"("user_id");

-- CreateIndex
CREATE INDEX "user_followings_organization_id_idx" ON "user_followings"("organization_id");

-- AddForeignKey
ALTER TABLE "user_followings" ADD CONSTRAINT "user_followings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_followings" ADD CONSTRAINT "user_followings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
