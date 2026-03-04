import { ChangeType } from "@prisma/client";
import { isMainModule } from "../lib/is-main-module";
import { logger } from "../lib/logger";
import { prisma } from "../lib/prisma";
import { sendImmediateNotifications } from "../notifications/send-immediate";
import { buildDiffContext } from "./build-baseline";
import { detectDiffChanges } from "./detect";
import { persistDiffResults } from "./persist";
import type { DiffRunResult } from "./types";

export const runDiffEngine = async (scrapeRunId: string): Promise<DiffRunResult> => {
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
            soldOutCount: existingReport.changeItems.filter(
                (item) => item.changeType === ChangeType.SOLD_OUT,
            ).length,
            backInStockCount: existingReport.changeItems.filter(
                (item) => item.changeType === ChangeType.BACK_IN_STOCK,
            ).length,
            deliveryCount: existingReport.deliveries.length,
            reusedExistingReport: true,
        };
    }

    const context = await buildDiffContext(scrapeRunId);
    const detection = detectDiffChanges(context);
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
