-- AlterTable
ALTER TABLE "scrape_runs"
ADD COLUMN "skip_diff" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "is_reconciliation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "reconciliation_reason" TEXT,
ADD COLUMN "is_system_noise" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "system_noise_reason" TEXT;

-- CreateIndex
CREATE INDEX "scrape_runs_is_system_noise_idx" ON "scrape_runs"("is_system_noise");
CREATE INDEX "scrape_runs_is_reconciliation_idx" ON "scrape_runs"("is_reconciliation");
