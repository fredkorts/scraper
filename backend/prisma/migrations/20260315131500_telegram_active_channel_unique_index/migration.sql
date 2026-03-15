-- CreateIndex
CREATE UNIQUE INDEX "notification_channels_user_active_telegram_key"
ON "notification_channels"("user_id")
WHERE "channel_type" = 'TELEGRAM' AND "is_active" = true;
