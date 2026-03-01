-- AlterTable
ALTER TABLE "refresh_tokens" ADD COLUMN     "replaced_by_token_id" UUID,
ADD COLUMN     "revocation_reason" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "notification_channels_user_id_channel_type_destination_key" ON "notification_channels"("user_id", "channel_type", "destination");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_replaced_by_token_id_key" ON "refresh_tokens"("replaced_by_token_id");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_replaced_by_token_id_fkey" FOREIGN KEY ("replaced_by_token_id") REFERENCES "refresh_tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

