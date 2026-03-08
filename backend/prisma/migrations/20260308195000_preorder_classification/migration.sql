CREATE TYPE "PreorderDetectionSource" AS ENUM ('CATEGORY_SLUG', 'TITLE', 'DESCRIPTION');

ALTER TABLE "products"
    ADD COLUMN "is_preorder" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "preorder_eta" TIMESTAMP(3),
    ADD COLUMN "preorder_detected_from" "PreorderDetectionSource",
    ADD COLUMN "preorder_last_checked_at" TIMESTAMP(3);
