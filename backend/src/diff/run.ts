import { ChangeType, Prisma } from "@prisma/client";
import { config } from "../config";
import { isMainModule } from "../lib/is-main-module";
import { logger } from "../lib/logger";
import { prisma } from "../lib/prisma";
import { sendImmediateNotifications } from "../notifications/send-immediate";
import { buildDiffContext } from "./build-baseline";
import { detectDiffChanges } from "./detect";
import { persistDiffResults } from "./persist";
import type { DiffRunResult } from "./types";

const toDecimalNumber = (value: Prisma.Decimal | null): number | null => {
    if (value === null) {
        return null;
    }

    return Number.parseFloat(value.toString());
};

const median = (values: number[]): number => {
    if (values.length === 0) {
        return 0;
    }

    const sorted = [...values].sort((left, right) => left - right);
    const middle = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
        return (sorted[middle - 1] + sorted[middle]) / 2;
    }

    return sorted[middle];
};

const stddevPopulation = (values: number[]): number => {
    if (values.length === 0) {
        return 0;
    }

    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
    return Math.sqrt(variance);
};

const logPriceAnomalyIfDetected = (
    scrapeRunId: string,
    categoryId: string,
    detection: ReturnType<typeof detectDiffChanges>,
): void => {
    const priceItems = detection.changeItems.filter(
        (item) => item.changeType === ChangeType.PRICE_DECREASE || item.changeType === ChangeType.PRICE_INCREASE,
    );
    const priceDecreaseItems = detection.changeItems.filter((item) => item.changeType === ChangeType.PRICE_DECREASE);

    if (priceDecreaseItems.length < config.SCRAPER_PRICE_ANOMALY_MIN_DECREASE_COUNT || priceItems.length === 0) {
        return;
    }

    const dropPcts = priceDecreaseItems
        .map((item) => {
            const oldPrice = toDecimalNumber(item.oldPrice);
            const newPrice = toDecimalNumber(item.newPrice);

            if (oldPrice === null || newPrice === null || oldPrice <= 0) {
                return null;
            }

            return Math.abs((newPrice - oldPrice) / oldPrice);
        })
        .filter((value): value is number => value !== null);

    if (dropPcts.length < config.SCRAPER_PRICE_ANOMALY_MIN_DECREASE_COUNT) {
        return;
    }

    const priceDecreaseRatio = priceDecreaseItems.length / priceItems.length;
    const medianDropPct = median(dropPcts);
    const stddevDropPct = stddevPopulation(dropPcts);
    const isAnomaly =
        priceDecreaseRatio >= config.SCRAPER_PRICE_ANOMALY_DECREASE_RATIO_THRESHOLD &&
        medianDropPct >= config.SCRAPER_PRICE_ANOMALY_MEDIAN_MIN &&
        medianDropPct <= config.SCRAPER_PRICE_ANOMALY_MEDIAN_MAX &&
        stddevDropPct <= config.SCRAPER_PRICE_ANOMALY_STDDEV_MAX;

    if (!isAnomaly) {
        return;
    }

    logger.warn("scrape_price_anomaly_detected", {
        scrapeRunId,
        categoryId,
        priceDecreaseCount: priceDecreaseItems.length,
        priceDecreaseRatio,
        medianDropPct,
        stddevDropPct,
        thresholds: {
            minDecreaseCount: config.SCRAPER_PRICE_ANOMALY_MIN_DECREASE_COUNT,
            decreaseRatioThreshold: config.SCRAPER_PRICE_ANOMALY_DECREASE_RATIO_THRESHOLD,
            medianMin: config.SCRAPER_PRICE_ANOMALY_MEDIAN_MIN,
            medianMax: config.SCRAPER_PRICE_ANOMALY_MEDIAN_MAX,
            stddevMax: config.SCRAPER_PRICE_ANOMALY_STDDEV_MAX,
        },
    });
};

export const runDiffEngine = async (scrapeRunId: string): Promise<DiffRunResult> => {
    const scrapeRun = await prisma.scrapeRun.findUnique({
        where: { id: scrapeRunId },
        select: {
            id: true,
            categoryId: true,
            skipDiff: true,
            isSystemNoise: true,
        },
    });

    if (!scrapeRun) {
        throw new Error(`Scrape run not found: ${scrapeRunId}`);
    }

    if (scrapeRun.skipDiff || scrapeRun.isSystemNoise) {
        return {
            scrapeRunId,
            totalChanges: 0,
            soldOutCount: 0,
            backInStockCount: 0,
            deliveryCount: 0,
            reusedExistingReport: false,
        };
    }

    const existingReport = await prisma.changeReport.findUnique({
        where: { scrapeRunId },
        include: {
            changeItems: {
                select: {
                    changeType: true,
                },
            },
            deliveries: {
                select: {
                    id: true,
                },
            },
        },
    });

    if (existingReport) {
        return {
            scrapeRunId,
            changeReportId: existingReport.id,
            totalChanges: existingReport.totalChanges,
            soldOutCount: existingReport.changeItems.filter((item) => item.changeType === ChangeType.SOLD_OUT).length,
            backInStockCount: existingReport.changeItems.filter((item) => item.changeType === ChangeType.BACK_IN_STOCK)
                .length,
            deliveryCount: existingReport.deliveries.length,
            reusedExistingReport: true,
        };
    }

    const context = await buildDiffContext(scrapeRunId);
    const detection = detectDiffChanges(context);
    logPriceAnomalyIfDetected(scrapeRunId, context.scrapeRun.categoryId, detection);
    const persisted = await persistDiffResults({
        scrapeRunId,
        categoryId: context.scrapeRun.categoryId,
        detection,
    });

    if (persisted.changeReportId) {
        await sendImmediateNotifications(persisted.changeReportId);
    }

    return {
        scrapeRunId,
        changeReportId: persisted.changeReportId,
        totalChanges: persisted.totalChanges,
        soldOutCount: persisted.soldOutCount,
        backInStockCount: persisted.backInStockCount,
        deliveryCount: persisted.deliveryCount,
        reusedExistingReport: false,
    };
};

if (isMainModule(import.meta.url)) {
    prisma
        .$connect()
        .then(async () => {
            const cliScrapeRunId = process.argv[2];

            if (!cliScrapeRunId) {
                throw new Error("Expected scrapeRunId as the first argument");
            }

            const result = await runDiffEngine(cliScrapeRunId);
            logger.info("diff_cli_completed", {
                scrapeRunId: cliScrapeRunId,
                result,
            });
        })
        .catch((error) => {
            logger.error("diff_cli_failed", {
                scrapeRunId: process.argv[2],
                error,
            });
            process.exitCode = 1;
        })
        .finally(async () => {
            await prisma.$disconnect();
        });
}
