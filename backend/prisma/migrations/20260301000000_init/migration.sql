-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('FREE', 'PAID', 'ADMIN');

-- CreateEnum
CREATE TYPE "ScrapeRunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ChangeType" AS ENUM ('PRICE_INCREASE', 'PRICE_DECREASE', 'NEW_PRODUCT', 'SOLD_OUT', 'BACK_IN_STOCK');

-- CreateEnum
CREATE TYPE "NotificationChannelType" AS ENUM ('EMAIL', 'DISCORD', 'WHATSAPP', 'SIGNAL', 'SMS');

-- CreateEnum
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'FREE',
    "last_digest_sent_at" TIMESTAMP(3),
    "paypal_subscription_id" TEXT,
    "subscription_expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name_et" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "parent_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "scrape_interval_hours" INTEGER NOT NULL DEFAULT 12,
    "next_run_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scrape_runs" (
    "id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "status" "ScrapeRunStatus" NOT NULL,
    "total_products" INTEGER NOT NULL DEFAULT 0,
    "new_products" INTEGER NOT NULL DEFAULT 0,
    "price_changes" INTEGER NOT NULL DEFAULT 0,
    "sold_out" INTEGER NOT NULL DEFAULT 0,
    "back_in_stock" INTEGER NOT NULL DEFAULT 0,
    "pages_scraped" INTEGER NOT NULL DEFAULT 0,
    "duration_ms" INTEGER,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "scrape_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "external_url" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "current_price" DECIMAL(10,2) NOT NULL,
    "original_price" DECIMAL(10,2),
    "in_stock" BOOLEAN NOT NULL,
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_snapshots" (
    "id" UUID NOT NULL,
    "scrape_run_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "original_price" DECIMAL(10,2),
    "in_stock" BOOLEAN NOT NULL,
    "image_url" TEXT NOT NULL,
    "scraped_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "change_reports" (
    "id" UUID NOT NULL,
    "scrape_run_id" UUID NOT NULL,
    "total_changes" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "change_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "change_items" (
    "id" UUID NOT NULL,
    "change_report_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "change_type" "ChangeType" NOT NULL,
    "old_price" DECIMAL(10,2),
    "new_price" DECIMAL(10,2),
    "old_stock_status" BOOLEAN,
    "new_stock_status" BOOLEAN,

    CONSTRAINT "change_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_channels" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "channel_type" "NotificationChannelType" NOT NULL,
    "destination" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_deliveries" (
    "id" UUID NOT NULL,
    "change_report_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "notification_channel_id" UUID NOT NULL,
    "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "error_message" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_next_run_at_idx" ON "categories"("next_run_at");

-- CreateIndex
CREATE INDEX "categories_parent_id_idx" ON "categories"("parent_id");

-- CreateIndex
CREATE INDEX "user_subscriptions_category_id_idx" ON "user_subscriptions"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_subscriptions_user_id_category_id_key" ON "user_subscriptions"("user_id", "category_id");

-- CreateIndex
CREATE INDEX "scrape_runs_category_id_idx" ON "scrape_runs"("category_id");

-- CreateIndex
CREATE INDEX "scrape_runs_status_idx" ON "scrape_runs"("status");

-- CreateIndex
CREATE INDEX "scrape_runs_started_at_idx" ON "scrape_runs"("started_at");

-- CreateIndex
CREATE UNIQUE INDEX "products_external_url_key" ON "products"("external_url");

-- CreateIndex
CREATE INDEX "products_last_seen_at_idx" ON "products"("last_seen_at");

-- CreateIndex
CREATE INDEX "products_in_stock_idx" ON "products"("in_stock");

-- CreateIndex
CREATE INDEX "product_categories_category_id_idx" ON "product_categories"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_product_id_category_id_key" ON "product_categories"("product_id", "category_id");

-- CreateIndex
CREATE INDEX "product_snapshots_scrape_run_id_idx" ON "product_snapshots"("scrape_run_id");

-- CreateIndex
CREATE INDEX "product_snapshots_product_id_idx" ON "product_snapshots"("product_id");

-- CreateIndex
CREATE INDEX "product_snapshots_scraped_at_idx" ON "product_snapshots"("scraped_at");

-- CreateIndex
CREATE UNIQUE INDEX "change_reports_scrape_run_id_key" ON "change_reports"("scrape_run_id");

-- CreateIndex
CREATE INDEX "change_items_change_report_id_idx" ON "change_items"("change_report_id");

-- CreateIndex
CREATE INDEX "change_items_product_id_idx" ON "change_items"("product_id");

-- CreateIndex
CREATE INDEX "change_items_change_type_idx" ON "change_items"("change_type");

-- CreateIndex
CREATE INDEX "notification_channels_user_id_idx" ON "notification_channels"("user_id");

-- CreateIndex
CREATE INDEX "notification_deliveries_change_report_id_idx" ON "notification_deliveries"("change_report_id");

-- CreateIndex
CREATE INDEX "notification_deliveries_user_id_idx" ON "notification_deliveries"("user_id");

-- CreateIndex
CREATE INDEX "notification_deliveries_status_idx" ON "notification_deliveries"("status");

-- CreateIndex
CREATE UNIQUE INDEX "notification_deliveries_change_report_id_user_id_notificati_key" ON "notification_deliveries"("change_report_id", "user_id", "notification_channel_id");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scrape_runs" ADD CONSTRAINT "scrape_runs_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_snapshots" ADD CONSTRAINT "product_snapshots_scrape_run_id_fkey" FOREIGN KEY ("scrape_run_id") REFERENCES "scrape_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_snapshots" ADD CONSTRAINT "product_snapshots_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_reports" ADD CONSTRAINT "change_reports_scrape_run_id_fkey" FOREIGN KEY ("scrape_run_id") REFERENCES "scrape_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_items" ADD CONSTRAINT "change_items_change_report_id_fkey" FOREIGN KEY ("change_report_id") REFERENCES "change_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_items" ADD CONSTRAINT "change_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_channels" ADD CONSTRAINT "notification_channels_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_change_report_id_fkey" FOREIGN KEY ("change_report_id") REFERENCES "change_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notification_channel_id_fkey" FOREIGN KEY ("notification_channel_id") REFERENCES "notification_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

