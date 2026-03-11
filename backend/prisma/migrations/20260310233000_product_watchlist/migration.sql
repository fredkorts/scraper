CREATE TABLE "user_tracked_products" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deactivated_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_tracked_products_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notification_delivery_items" (
    "id" UUID NOT NULL,
    "notification_delivery_id" UUID NOT NULL,
    "change_item_id" UUID NOT NULL,
    "is_watched_at_send" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_delivery_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_tracked_products_user_id_product_id_key" ON "user_tracked_products"("user_id", "product_id");
CREATE INDEX "user_tracked_products_user_id_is_active_idx" ON "user_tracked_products"("user_id", "is_active");
CREATE INDEX "user_tracked_products_product_id_is_active_idx" ON "user_tracked_products"("product_id", "is_active");

CREATE UNIQUE INDEX "notification_delivery_items_notification_delivery_id_change_item_id_key"
    ON "notification_delivery_items"("notification_delivery_id", "change_item_id");
CREATE INDEX "notification_delivery_items_notification_delivery_id_idx"
    ON "notification_delivery_items"("notification_delivery_id");
CREATE INDEX "notification_delivery_items_is_watched_at_send_idx"
    ON "notification_delivery_items"("is_watched_at_send");

ALTER TABLE "user_tracked_products"
    ADD CONSTRAINT "user_tracked_products_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_tracked_products"
    ADD CONSTRAINT "user_tracked_products_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "notification_delivery_items"
    ADD CONSTRAINT "notification_delivery_items_notification_delivery_id_fkey"
    FOREIGN KEY ("notification_delivery_id") REFERENCES "notification_deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notification_delivery_items"
    ADD CONSTRAINT "notification_delivery_items_change_item_id_fkey"
    FOREIGN KEY ("change_item_id") REFERENCES "change_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
