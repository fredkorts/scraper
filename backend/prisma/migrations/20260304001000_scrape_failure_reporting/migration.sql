ALTER TABLE "scrape_runs"
ADD COLUMN "failure_code" TEXT,
ADD COLUMN "failure_phase" TEXT,
ADD COLUMN "failure_page_url" TEXT,
ADD COLUMN "failure_page_number" INTEGER,
ADD COLUMN "failure_is_retryable" BOOLEAN,
ADD COLUMN "failure_technical_message" TEXT,
ADD COLUMN "failure_summary" TEXT;

ALTER TABLE "scrape_runs"
ADD CONSTRAINT "scrape_runs_failure_page_number_check"
CHECK ("failure_page_number" IS NULL OR "failure_page_number" > 0);
