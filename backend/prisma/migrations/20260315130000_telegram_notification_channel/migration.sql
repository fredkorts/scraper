-- AlterEnum
ALTER TYPE "NotificationChannelType" ADD VALUE IF NOT EXISTS 'TELEGRAM';

-- CreateTable
CREATE TABLE "telegram_link_challenges" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_ip" TEXT,
    "created_by_user_agent" TEXT,
    "telegram_chat_id" TEXT,
    "telegram_user_id" TEXT,
    "confirmed_at" TIMESTAMP(3),
    "verification_message_sent_at" TIMESTAMP(3),
    "verification_message_failed_at" TIMESTAMP(3),
    "verification_message_error" TEXT,

    CONSTRAINT "telegram_link_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telegram_webhook_events" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "update_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "telegram_link_challenges_token_hash_key" ON "telegram_link_challenges"("token_hash");

-- CreateIndex
CREATE INDEX "telegram_link_challenges_user_id_created_at_idx" ON "telegram_link_challenges"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "telegram_link_challenges_expires_at_idx" ON "telegram_link_challenges"("expires_at");

-- CreateIndex
CREATE INDEX "telegram_link_challenges_confirmed_at_idx" ON "telegram_link_challenges"("confirmed_at");

-- CreateIndex
CREATE UNIQUE INDEX "telegram_webhook_events_update_id_key" ON "telegram_webhook_events"("update_id");

-- CreateIndex
CREATE INDEX "telegram_webhook_events_created_at_idx" ON "telegram_webhook_events"("created_at");

-- CreateIndex
CREATE INDEX "telegram_webhook_events_user_id_idx" ON "telegram_webhook_events"("user_id");

-- AddForeignKey
ALTER TABLE "telegram_link_challenges"
ADD CONSTRAINT "telegram_link_challenges_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telegram_webhook_events"
ADD CONSTRAINT "telegram_webhook_events_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
