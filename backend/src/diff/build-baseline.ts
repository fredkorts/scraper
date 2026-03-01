import { ScrapeRunStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import type { DiffContext, HistoricalSnapshotState } from "./types";

export const buildDiffContext = async (scrapeRunId: string): Promise<DiffContext> => {
    const scrapeRun = await prisma.scrapeRun.findUnique({
        where: { id: scrapeRunId },
    });

    if (!scrapeRun) {
        throw new Error(`Scrape run not found: ${scrapeRunId}`);
    }

    if (scrapeRun.status !== ScrapeRunStatus.COMPLETED || !scrapeRun.completedAt) {
        throw new Error(`Diff engine requires a completed scrape run: ${scrapeRunId}`);
    }

    const currentSnapshots = await prisma.productSnapshot.findMany({
        where: { scrapeRunId },
        include: {
            product: {
                select: {
                    id: true,
                    externalUrl: true,
                    name: true,
                    imageUrl: true,
                    currentPrice: true,
                    originalPrice: true,
                    inStock: true,
                    firstSeenAt: true,
                },
            },
        },
        orderBy: { scrapedAt: "asc" },
    });

    const previousCompletedRun = await prisma.scrapeRun.findFirst({
        where: {
            categoryId: scrapeRun.categoryId,
            status: ScrapeRunStatus.COMPLETED,
            startedAt: {
                lt: scrapeRun.startedAt,
            },
        },
        orderBy: {
            startedAt: "desc",
        },
        select: {
            id: true,
        },
    });

    const historicalSnapshotsByProductId = new Map<string, HistoricalSnapshotState>();
    if (previousCompletedRun && currentSnapshots.length > 0) {
        const historicalSnapshots = await prisma.productSnapshot.findMany({
            where: {
                productId: {
                    in: currentSnapshots.map((snapshot) => snapshot.productId),
                },
                scrapedAt: {
                    lt: scrapeRun.startedAt,
                },
            },
            orderBy: [{ productId: "asc" }, { scrapedAt: "desc" }],
            select: {
                productId: true,
                price: true,
                originalPrice: true,
                inStock: true,
                scrapedAt: true,
            },
        });

        for (const snapshot of historicalSnapshots) {
            if (!historicalSnapshotsByProductId.has(snapshot.productId)) {
                historicalSnapshotsByProductId.set(snapshot.productId, snapshot);
            }
        }
    }

    return {
        scrapeRun: {
            ...scrapeRun,
            completedAt: scrapeRun.completedAt,
        },
        currentProducts: currentSnapshots.map((snapshot) => ({
            productId: snapshot.productId,
            product: snapshot.product,
            snapshot: {
                id: snapshot.id,
                price: snapshot.price,
                originalPrice: snapshot.originalPrice,
                inStock: snapshot.inStock,
                scrapedAt: snapshot.scrapedAt,
            },
        })),
        previousRunExists: previousCompletedRun !== null,
        historicalSnapshotsByProductId,
    };
};
