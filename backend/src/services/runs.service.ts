import { ChangeType as PrismaChangeType, Prisma, ScrapeRunStatus as PrismaScrapeRunStatus } from "@prisma/client";
import {
    ChangeType as SharedChangeType,
    ScrapeStatus,
    type DashboardHomeResponse,
    type RunChangesResponse,
    type RunDetailResponse,
    type RunProductsResponse,
    type RunsListResponse,
    type ScrapeRunFailure,
    type UserRole,
} from "@mabrik/shared";
import type { DashboardHomeQuery, RunChangesQuery, RunProductsQuery, RunsListQuery } from "../schemas/runs";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/errors";
import { buildCategoryScopeWhere, getAccessibleCategoryIds } from "./access-scope.service";

const DASHBOARD_CHANGE_WINDOW_DAYS = 7;
const DASHBOARD_LATEST_RUN_LIMIT = 6;
const DASHBOARD_FAILURE_LIMIT = 5;

interface DashboardChangeSummary {
    priceIncrease: number;
    priceDecrease: number;
    newProduct: number;
    soldOut: number;
    backInStock: number;
}

const statusMap: Record<PrismaScrapeRunStatus, ScrapeStatus> = {
    PENDING: ScrapeStatus.PENDING,
    RUNNING: ScrapeStatus.RUNNING,
    COMPLETED: ScrapeStatus.COMPLETED,
    FAILED: ScrapeStatus.FAILED,
};

const statusInputMap: Record<NonNullable<RunsListQuery["status"]>, PrismaScrapeRunStatus> = {
    pending: PrismaScrapeRunStatus.PENDING,
    running: PrismaScrapeRunStatus.RUNNING,
    completed: PrismaScrapeRunStatus.COMPLETED,
    failed: PrismaScrapeRunStatus.FAILED,
};

const changeTypeMap: Record<PrismaChangeType, SharedChangeType> = {
    PRICE_INCREASE: SharedChangeType.PRICE_INCREASE,
    PRICE_DECREASE: SharedChangeType.PRICE_DECREASE,
    NEW_PRODUCT: SharedChangeType.NEW_PRODUCT,
    SOLD_OUT: SharedChangeType.SOLD_OUT,
    BACK_IN_STOCK: SharedChangeType.BACK_IN_STOCK,
};

const changeTypeInputMap: Record<NonNullable<RunChangesQuery["changeType"]>, PrismaChangeType> = {
    price_increase: PrismaChangeType.PRICE_INCREASE,
    price_decrease: PrismaChangeType.PRICE_DECREASE,
    new_product: PrismaChangeType.NEW_PRODUCT,
    sold_out: PrismaChangeType.SOLD_OUT,
    back_in_stock: PrismaChangeType.BACK_IN_STOCK,
};

const toNumber = (value: Prisma.Decimal | null | undefined): number | undefined =>
    value === null || value === undefined ? undefined : Number(value.toString());

const buildEmptyChangeSummary = (): DashboardChangeSummary => ({
    priceIncrease: 0,
    priceDecrease: 0,
    newProduct: 0,
    soldOut: 0,
    backInStock: 0,
});

const getDescendantCategoryIds = async (
    rootCategoryId: string,
    allowedCategoryIds: string[] | null,
): Promise<string[]> => {
    const categories = await prisma.category.findMany({
        select: {
            id: true,
            parentId: true,
        },
    });

    const childIdsByParentId = new Map<string, string[]>();
    const existingCategoryIds = new Set(categories.map((category) => category.id));

    for (const category of categories) {
        if (!category.parentId) {
            continue;
        }

        const siblings = childIdsByParentId.get(category.parentId) ?? [];
        siblings.push(category.id);
        childIdsByParentId.set(category.parentId, siblings);
    }

    if (!existingCategoryIds.has(rootCategoryId)) {
        return [];
    }

    const selectedIds: string[] = [];
    const pendingIds: string[] = [rootCategoryId];
    const visitedIds = new Set<string>();

    while (pendingIds.length > 0) {
        const currentId = pendingIds.pop();
        if (!currentId || visitedIds.has(currentId)) {
            continue;
        }

        visitedIds.add(currentId);
        selectedIds.push(currentId);

        const childIds = childIdsByParentId.get(currentId) ?? [];
        pendingIds.push(...childIds);
    }

    if (allowedCategoryIds === null) {
        return selectedIds;
    }

    const allowedCategoryIdSet = new Set(allowedCategoryIds);

    return selectedIds.filter((categoryId) => allowedCategoryIdSet.has(categoryId));
};

const buildRunFailure = (
    run: {
        status: PrismaScrapeRunStatus;
        failureSummary: string | null;
        failureCode: string | null;
        failurePhase: string | null;
        failurePageUrl: string | null;
        failurePageNumber: number | null;
        failureIsRetryable: boolean | null;
        failureTechnicalMessage: string | null;
        errorMessage: string | null;
    },
    includeTechnicalMessage = false,
): (ScrapeRunFailure & { technicalMessage?: string }) | undefined => {
    if (run.status !== PrismaScrapeRunStatus.FAILED) {
        return undefined;
    }

    const summary = run.failureSummary ?? run.errorMessage ?? undefined;

    if (!summary) {
        return undefined;
    }

    return {
        summary,
        code: run.failureCode ?? undefined,
        phase: run.failurePhase ?? undefined,
        pageUrl: run.failurePageUrl ?? undefined,
        pageNumber: run.failurePageNumber ?? undefined,
        isRetryable: run.failureIsRetryable ?? undefined,
        ...(includeTechnicalMessage && run.failureTechnicalMessage
            ? {
                  technicalMessage: run.failureTechnicalMessage,
              }
            : {}),
    };
};

const getAccessibleRunOrThrow = async (userId: string, role: UserRole, runId: string) => {
    const categoryIds = await getAccessibleCategoryIds(userId, role);

    if (categoryIds !== null && categoryIds.length === 0) {
        throw new AppError(404, "not_found", "Scrape run not found");
    }

    const run = await prisma.scrapeRun.findFirst({
        where: {
            id: runId,
            ...buildCategoryScopeWhere(categoryIds),
        },
        include: {
            category: {
                select: {
                    id: true,
                    nameEt: true,
                },
            },
            changeReport: {
                select: {
                    id: true,
                    totalChanges: true,
                },
            },
        },
    });

    if (!run) {
        throw new AppError(404, "not_found", "Scrape run not found");
    }

    return run;
};

const toTotalPages = (totalItems: number, pageSize: number): number =>
    totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize);

export const getDashboardHome = async (
    userId: string,
    role: UserRole,
    query: DashboardHomeQuery,
): Promise<DashboardHomeResponse> => {
    const categoryIds = await getAccessibleCategoryIds(userId, role);

    if (categoryIds !== null && categoryIds.length === 0) {
        return {
            latestRuns: [],
            recentFailures: [],
            recentChangeSummary: buildEmptyChangeSummary(),
        };
    }

    const selectedCategoryIds = query.categoryId ? await getDescendantCategoryIds(query.categoryId, categoryIds) : null;

    if (query.categoryId && (selectedCategoryIds?.length ?? 0) === 0) {
        return {
            latestRuns: [],
            recentFailures: [],
            recentChangeSummary: buildEmptyChangeSummary(),
        };
    }

    const categoryScope = selectedCategoryIds
        ? { categoryId: { in: selectedCategoryIds } }
        : buildCategoryScopeWhere(categoryIds);
    const changeWindowStart = new Date(Date.now() - DASHBOARD_CHANGE_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const [latestRuns, recentFailures, recentChanges] = await Promise.all([
        prisma.scrapeRun.findMany({
            where: categoryScope,
            include: {
                category: {
                    select: {
                        id: true,
                        nameEt: true,
                    },
                },
                changeReport: {
                    select: {
                        totalChanges: true,
                    },
                },
            },
            orderBy: {
                startedAt: "desc",
            },
            take: DASHBOARD_LATEST_RUN_LIMIT,
        }),
        prisma.scrapeRun.findMany({
            where: {
                ...categoryScope,
                status: PrismaScrapeRunStatus.FAILED,
            },
            include: {
                category: {
                    select: {
                        id: true,
                        nameEt: true,
                    },
                },
            },
            orderBy: {
                startedAt: "desc",
            },
            take: DASHBOARD_FAILURE_LIMIT,
        }),
        prisma.changeItem.findMany({
            where: {
                changeReport: {
                    createdAt: {
                        gte: changeWindowStart,
                    },
                    scrapeRun: categoryScope,
                },
            },
            select: {
                changeType: true,
            },
        }),
    ]);

    const recentChangeSummary = recentChanges.reduce<DashboardChangeSummary>((summary, item) => {
        switch (item.changeType) {
            case PrismaChangeType.PRICE_INCREASE:
                summary.priceIncrease += 1;
                break;
            case PrismaChangeType.PRICE_DECREASE:
                summary.priceDecrease += 1;
                break;
            case PrismaChangeType.NEW_PRODUCT:
                summary.newProduct += 1;
                break;
            case PrismaChangeType.SOLD_OUT:
                summary.soldOut += 1;
                break;
            case PrismaChangeType.BACK_IN_STOCK:
                summary.backInStock += 1;
                break;
        }

        return summary;
    }, buildEmptyChangeSummary());

    return {
        latestRuns: latestRuns.map((run) => ({
            id: run.id,
            categoryId: run.category.id,
            categoryName: run.category.nameEt,
            status: statusMap[run.status],
            startedAt: run.startedAt.toISOString(),
            completedAt: run.completedAt?.toISOString(),
            totalChanges: run.changeReport?.totalChanges ?? 0,
            totalProducts: run.totalProducts,
        })),
        recentFailures: recentFailures.map((run) => ({
            id: run.id,
            categoryId: run.category.id,
            categoryName: run.category.nameEt,
            startedAt: run.startedAt.toISOString(),
            failure: buildRunFailure(run),
        })),
        recentChangeSummary,
    };
};

export const listRuns = async (userId: string, role: UserRole, query: RunsListQuery): Promise<RunsListResponse> => {
    const categoryIds = await getAccessibleCategoryIds(userId, role);

    if (categoryIds !== null && categoryIds.length === 0) {
        return {
            items: [],
            page: query.page,
            pageSize: query.pageSize,
            totalItems: 0,
            totalPages: 0,
        };
    }

    const selectedCategoryIds = query.categoryId ? await getDescendantCategoryIds(query.categoryId, categoryIds) : null;

    if (query.categoryId && (selectedCategoryIds?.length ?? 0) === 0) {
        return {
            items: [],
            page: query.page,
            pageSize: query.pageSize,
            totalItems: 0,
            totalPages: 0,
        };
    }

    const where: Prisma.ScrapeRunWhereInput = {
        ...(selectedCategoryIds ? { categoryId: { in: selectedCategoryIds } } : buildCategoryScopeWhere(categoryIds)),
        ...(query.status ? { status: statusInputMap[query.status] } : {}),
    };

    const orderBy: Prisma.ScrapeRunOrderByWithRelationInput =
        query.sortBy === "totalChanges"
            ? {
                  changeReport: {
                      totalChanges: query.sortOrder,
                  },
              }
            : query.sortBy === "durationMs"
              ? {
                    durationMs: query.sortOrder,
                }
              : query.sortBy === "totalProducts"
                ? {
                      totalProducts: query.sortOrder,
                  }
                : query.sortBy === "status"
                  ? {
                        status: query.sortOrder,
                    }
                  : {
                        startedAt: query.sortOrder,
                    };

    const [totalItems, runs] = await Promise.all([
        prisma.scrapeRun.count({ where }),
        prisma.scrapeRun.findMany({
            where,
            include: {
                category: {
                    select: {
                        id: true,
                        nameEt: true,
                    },
                },
                changeReport: {
                    select: {
                        totalChanges: true,
                    },
                },
            },
            orderBy: [orderBy, { id: query.sortOrder }],
            skip: (query.page - 1) * query.pageSize,
            take: query.pageSize,
        }),
    ]);

    return {
        items: runs.map((run) => ({
            id: run.id,
            categoryId: run.category.id,
            categoryName: run.category.nameEt,
            status: statusMap[run.status],
            totalProducts: run.totalProducts,
            totalChanges: run.changeReport?.totalChanges ?? 0,
            pagesScraped: run.pagesScraped,
            durationMs: run.durationMs ?? undefined,
            startedAt: run.startedAt.toISOString(),
            completedAt: run.completedAt?.toISOString(),
            failure: buildRunFailure(run),
        })),
        page: query.page,
        pageSize: query.pageSize,
        totalItems,
        totalPages: toTotalPages(totalItems, query.pageSize),
    };
};

export const getRunDetail = async (userId: string, role: UserRole, runId: string): Promise<RunDetailResponse> => {
    const run = await getAccessibleRunOrThrow(userId, role, runId);
    const failure = buildRunFailure(run, role === "admin");

    return {
        run: {
            id: run.id,
            categoryId: run.category.id,
            categoryName: run.category.nameEt,
            status: statusMap[run.status],
            totalProducts: run.totalProducts,
            totalChanges: run.changeReport?.totalChanges ?? 0,
            newProducts: run.newProducts,
            priceChanges: run.priceChanges,
            soldOut: run.soldOut,
            backInStock: run.backInStock,
            pagesScraped: run.pagesScraped,
            durationMs: run.durationMs ?? undefined,
            failure,
            startedAt: run.startedAt.toISOString(),
            completedAt: run.completedAt?.toISOString(),
        },
    };
};

export const listRunProducts = async (
    userId: string,
    role: UserRole,
    runId: string,
    query: RunProductsQuery,
): Promise<RunProductsResponse> => {
    await getAccessibleRunOrThrow(userId, role, runId);

    const where: Prisma.ProductSnapshotWhereInput = {
        scrapeRunId: runId,
        ...(query.inStock === undefined ? {} : { inStock: query.inStock }),
    };

    const [totalItems, snapshots] = await Promise.all([
        prisma.productSnapshot.count({ where }),
        prisma.productSnapshot.findMany({
            where,
            include: {
                product: {
                    select: {
                        externalUrl: true,
                    },
                },
            },
            orderBy: [{ name: "asc" }, { id: "asc" }],
            skip: (query.page - 1) * query.pageSize,
            take: query.pageSize,
        }),
    ]);

    return {
        items: snapshots.map((snapshot) => ({
            id: snapshot.id,
            scrapeRunId: snapshot.scrapeRunId,
            productId: snapshot.productId,
            name: snapshot.name,
            price: Number(snapshot.price.toString()),
            originalPrice: toNumber(snapshot.originalPrice),
            inStock: snapshot.inStock,
            imageUrl: snapshot.imageUrl,
            externalUrl: snapshot.product.externalUrl,
            scrapedAt: snapshot.scrapedAt.toISOString(),
        })),
        page: query.page,
        pageSize: query.pageSize,
        totalItems,
        totalPages: toTotalPages(totalItems, query.pageSize),
    };
};

export const listRunChanges = async (
    userId: string,
    role: UserRole,
    runId: string,
    query: RunChangesQuery,
): Promise<RunChangesResponse> => {
    const run = await getAccessibleRunOrThrow(userId, role, runId);

    if (!run.changeReport) {
        return {
            items: [],
            page: query.page,
            pageSize: query.pageSize,
            totalItems: 0,
            totalPages: 0,
        };
    }

    const where: Prisma.ChangeItemWhereInput = {
        changeReportId: run.changeReport.id,
        ...(query.changeType ? { changeType: changeTypeInputMap[query.changeType] } : {}),
    };

    const [totalItems, changeItems] = await Promise.all([
        prisma.changeItem.count({ where }),
        prisma.changeItem.findMany({
            where,
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        imageUrl: true,
                        externalUrl: true,
                    },
                },
            },
            orderBy: {
                id: "desc",
            },
            skip: (query.page - 1) * query.pageSize,
            take: query.pageSize,
        }),
    ]);

    return {
        items: changeItems.map((item) => ({
            id: item.id,
            changeType: changeTypeMap[item.changeType],
            oldPrice: toNumber(item.oldPrice),
            newPrice: toNumber(item.newPrice),
            oldStockStatus: item.oldStockStatus ?? undefined,
            newStockStatus: item.newStockStatus ?? undefined,
            product: {
                id: item.product.id,
                name: item.product.name,
                imageUrl: item.product.imageUrl,
                externalUrl: item.product.externalUrl,
            },
        })),
        page: query.page,
        pageSize: query.pageSize,
        totalItems,
        totalPages: toTotalPages(totalItems, query.pageSize),
    };
};
