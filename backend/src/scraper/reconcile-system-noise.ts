import { NotificationDeliveryStatus, ScrapeRunStatus } from "@prisma/client";
import { isMainModule } from "../lib/is-main-module";
import { logger } from "../lib/logger";
import { prisma } from "../lib/prisma";
import { scrapeCategory } from "./run";

const DELIVERY_SKIP_REASON = "SYSTEM_NOISE_RECONCILIATION";
const DEFAULT_RECONCILIATION_REASON = "parser_false_drop_incident";

interface ReconcileOptions {
    apply: boolean;
    runIds: string[];
    reconciliationReason: string;
    skipReconciliationScrape: boolean;
}

const isUuid = (value: string): boolean =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const parseArgs = (argv: string[]): ReconcileOptions => {
    const runIdsArg = argv.find((arg) => arg.startsWith("--run-ids="));
    const reasonArg = argv.find((arg) => arg.startsWith("--reconciliation-reason="));
    const apply = argv.includes("--apply");
    const skipReconciliationScrape = argv.includes("--skip-reconciliation-scrape");
    const runIds = [
        ...new Set(
            runIdsArg
                ? runIdsArg
                      .slice("--run-ids=".length)
                      .split(",")
                      .map((value) => value.trim())
                      .filter((value) => value.length > 0)
                : [],
        ),
    ];

    if (runIds.length === 0) {
        throw new Error("Expected --run-ids=<id,id,...> with at least one scrape run id");
    }

    const invalidRunId = runIds.find((runId) => !isUuid(runId));
    if (invalidRunId) {
        throw new Error(`Invalid scrape run id: ${invalidRunId}`);
    }

    return {
        apply,
        runIds,
        reconciliationReason: reasonArg?.slice("--reconciliation-reason=".length) || DEFAULT_RECONCILIATION_REASON,
        skipReconciliationScrape,
    };
};

const summarizeTargetRuns = async (runIds: string[]) => {
    const runs = await prisma.scrapeRun.findMany({
        where: {
            id: {
                in: runIds,
            },
        },
        select: {
            id: true,
            categoryId: true,
            status: true,
            isSystemNoise: true,
            systemNoiseReason: true,
            completedAt: true,
            category: {
                select: {
                    slug: true,
                    nameEt: true,
                },
            },
        },
    });

    if (runs.length !== runIds.length) {
        const existingIds = new Set(runs.map((run) => run.id));
        const missingIds = runIds.filter((runId) => !existingIds.has(runId));
        throw new Error(`Some scrape runs were not found: ${missingIds.join(", ")}`);
    }

    const categoryIds = [...new Set(runs.map((run) => run.categoryId))];

    return {
        runs,
        categoryIds,
    };
};

const findAlreadyReconciledCategories = async (categoryIds: string[], reconciliationReason: string) => {
    const latestReconciliationRuns = await prisma.scrapeRun.findMany({
        where: {
            categoryId: {
                in: categoryIds,
            },
            status: ScrapeRunStatus.COMPLETED,
            isReconciliation: true,
            reconciliationReason,
        },
        orderBy: [{ completedAt: "desc" }, { startedAt: "desc" }],
        distinct: ["categoryId"],
        select: {
            categoryId: true,
            id: true,
            completedAt: true,
        },
    });

    return new Map(latestReconciliationRuns.map((run) => [run.categoryId, run] as const));
};

const reconcileSystemNoise = async (options: ReconcileOptions) => {
    const target = await summarizeTargetRuns(options.runIds);
    const now = new Date();
    const pendingDeliveryCount = await prisma.notificationDelivery.count({
        where: {
            status: NotificationDeliveryStatus.PENDING,
            changeReport: {
                scrapeRunId: {
                    in: options.runIds,
                },
            },
        },
    });

    const existingReconciliationsByCategory = await findAlreadyReconciledCategories(
        target.categoryIds,
        options.reconciliationReason,
    );

    const categoriesToReconcile = target.categoryIds.filter((categoryId) => {
        return !existingReconciliationsByCategory.has(categoryId);
    });

    const summary = {
        mode: options.apply ? "apply" : "dry-run",
        runCount: target.runs.length,
        categoryCount: target.categoryIds.length,
        pendingDeliveryCount,
        categoriesSkippedByIdempotency: target.categoryIds.filter((categoryId) =>
            existingReconciliationsByCategory.has(categoryId),
        ),
        categoriesToReconcile,
        reconciliationReason: options.reconciliationReason,
        skipReconciliationScrape: options.skipReconciliationScrape,
        startedAt: now.toISOString(),
    };

    if (!options.apply) {
        logger.info("system_noise_reconciliation_dry_run", summary);
        return;
    }

    const [runsUpdated, deliveriesUpdated] = await prisma.$transaction([
        prisma.scrapeRun.updateMany({
            where: {
                id: {
                    in: options.runIds,
                },
            },
            data: {
                isSystemNoise: true,
                systemNoiseReason: options.reconciliationReason,
            },
        }),
        prisma.notificationDelivery.updateMany({
            where: {
                status: NotificationDeliveryStatus.PENDING,
                changeReport: {
                    scrapeRunId: {
                        in: options.runIds,
                    },
                },
            },
            data: {
                status: NotificationDeliveryStatus.SKIPPED,
                errorMessage: DELIVERY_SKIP_REASON,
                sentAt: null,
            },
        }),
    ]);

    const reconciliationRuns: { categoryId: string; scrapeRunId: string }[] = [];
    const skippedCategories: string[] = [...summary.categoriesSkippedByIdempotency];

    if (!options.skipReconciliationScrape) {
        for (const categoryId of categoriesToReconcile) {
            const result = await scrapeCategory(categoryId, {
                skipDiff: true,
                isReconciliation: true,
                reconciliationReason: options.reconciliationReason,
            });

            reconciliationRuns.push({
                categoryId,
                scrapeRunId: result.scrapeRunId,
            });
        }
    } else {
        skippedCategories.push(...categoriesToReconcile);
    }

    logger.info("system_noise_reconciliation_applied", {
        ...summary,
        runsUpdated: runsUpdated.count,
        deliveriesUpdated: deliveriesUpdated.count,
        reconciliationRuns,
        skippedCategories,
        completedAt: new Date().toISOString(),
    });
};

const main = async () => {
    const options = parseArgs(process.argv.slice(2));
    await reconcileSystemNoise(options);
};

if (isMainModule(import.meta.url)) {
    main()
        .catch((error) => {
            logger.error("system_noise_reconciliation_failed", {
                error,
            });
            process.exitCode = 1;
        })
        .finally(async () => {
            await prisma.$disconnect();
        });
}
