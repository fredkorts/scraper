import { ChangeType } from "@prisma/client";
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

const cliScrapeRunId = process.argv[2];

if (cliScrapeRunId) {
    prisma
        .$connect()
        .then(async () => {
            const result = await runDiffEngine(cliScrapeRunId);
            console.log(JSON.stringify(result, null, 2));
        })
        .catch((error) => {
            console.error(error);
            process.exitCode = 1;
        })
        .finally(async () => {
            await prisma.$disconnect();
        });
}
