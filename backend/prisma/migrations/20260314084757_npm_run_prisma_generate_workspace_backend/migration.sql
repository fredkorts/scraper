-- DropIndex
DROP INDEX "scrape_runs_is_reconciliation_idx";

-- DropIndex
DROP INDEX "scrape_runs_is_system_noise_idx";

-- RenameIndex
ALTER INDEX "notification_delivery_items_notification_delivery_id_change_ite" RENAME TO "notification_delivery_items_notification_delivery_id_change_key";
