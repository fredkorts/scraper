import { ScrapeRunStatus } from "@prisma/client";
import { isMainModule } from "../lib/is-main-module";
import { logger } from "../lib/logger";
import { prisma } from "../lib/prisma";

const DEFAULT_STALE_MINUTES = 30;

const parseStaleMinutes = (value: string | undefined): number => {
    if (!value) {
        return DEFAULT_STALE_MINUTES;
    }

    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error("Expected stale-minutes to be a positive integer");
    }

    return parsed;
};

const getStaleThreshold = (staleMinutes: number): Date => {
    return new Date(Date.now() - staleMinutes * 60_000);
};

const main = async (): Promise<void> => {
    const staleMinutes = parseStaleMinutes(process.argv[2]);
    const staleThreshold = getStaleThreshold(staleMinutes);

    const staleRuns = await prisma.scrapeRun.findMany({
        where: {
            status: ScrapeRunStatus.RUNNING,
            startedAt: {
                lt: staleThreshold,
            },
        },
        select: {
            id: true,
            startedAt: true,
        },
        orderBy: {
            startedAt: "asc",
        },
    });

    if (staleRuns.length === 0) {
        logger.info("cleanup_stale_runs_noop", {
            updatedCount: 0,
            staleMinutes,
        });
        return;
    }

    const completedAt = new Date();
    await prisma.scrapeRun.updateMany({
        where: {
            id: {
                in: staleRuns.map((run) => run.id),
            },
        },
        data: {
            status: ScrapeRunStatus.FAILED,
            errorMessage: `Marked stale by cleanup script after ${staleMinutes} minutes`,
            completedAt,
        },
    });

    logger.info("cleanup_stale_runs_completed", {
        updatedCount: staleRuns.length,
        staleMinutes,
        completedAt: completedAt.toISOString(),
        runIds: staleRuns.map((run) => run.id),
    });
};

if (isMainModule(import.meta.url)) {
    main()
        .catch((error) => {
            logger.error("cleanup_stale_runs_failed", {
                error,
            });
            process.exitCode = 1;
        })
        .finally(async () => {
            await prisma.$disconnect();
        });
}
