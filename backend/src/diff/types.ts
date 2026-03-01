import type { ChangeType, Prisma, ScrapeRun, UserRole } from "@prisma/client";

export interface CurrentRunProduct {
    productId: string;
    product: {
        id: string;
        externalUrl: string;
        name: string;
        imageUrl: string;
        currentPrice: Prisma.Decimal;
        originalPrice: Prisma.Decimal | null;
        inStock: boolean;
        firstSeenAt: Date;
    };
    snapshot: {
        id: string;
        price: Prisma.Decimal;
        originalPrice: Prisma.Decimal | null;
        inStock: boolean;
        scrapedAt: Date;
    };
}

export interface HistoricalSnapshotState {
    productId: string;
    price: Prisma.Decimal;
    originalPrice: Prisma.Decimal | null;
    inStock: boolean;
    scrapedAt: Date;
}

export interface DiffContext {
    scrapeRun: ScrapeRun & { completedAt: Date };
    currentProducts: CurrentRunProduct[];
    previousRunExists: boolean;
    historicalSnapshotsByProductId: Map<string, HistoricalSnapshotState>;
}

export interface PendingChangeItem {
    productId: string;
    changeType: ChangeType;
    oldPrice: Prisma.Decimal | null;
    newPrice: Prisma.Decimal | null;
    oldStockStatus: boolean | null;
    newStockStatus: boolean | null;
}

export interface DiffDetectionResult {
    changeItems: PendingChangeItem[];
    soldOutCount: number;
    backInStockCount: number;
}

export interface DeliveryRecipient {
    userId: string;
    role: UserRole;
    notificationChannelId: string;
}

export interface DiffRunResult {
    scrapeRunId: string;
    changeReportId?: string;
    totalChanges: number;
    soldOutCount: number;
    backInStockCount: number;
    deliveryCount: number;
    reusedExistingReport: boolean;
}
