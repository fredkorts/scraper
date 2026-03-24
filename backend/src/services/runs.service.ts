import {
    ChangeType as PrismaChangeType,
    PreorderDetectionSource,
    Prisma,
    ScrapeRunStatus as PrismaScrapeRunStatus,
} from "@prisma/client";
import {
    ChangeType as SharedChangeType,
    type ChangesListResponse,
    ScrapeStatus,
    type DashboardHomeResponse,
    type RunChangesResponse,
    type RunDetailResponse,
    type RunProductsResponse,
    type RunsListResponse,
    type ScrapeRunFailure,
    type UserRole,
} from "@mabrik/shared";
import type {
    ChangesListQuery,
    DashboardHomeQuery,
    RunDetailQuery,
    RunChangesQuery,
    RunProductsQuery,
    RunsListQuery,
} from "../schemas/runs";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/errors";
import { buildCategoryScopeWhere, getAccessibleCategoryIds } from "./access-scope.service";
import { collectDescendantCategoryIds } from "./category-hierarchy.service";
import { getWatchedProductMap } from "./tracked-product.service";

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
const toDateOnly = (value: Date | null | undefined): string | undefined =>
    value ? value.toISOString().slice(0, 10) : undefined;
const preorderSourceMap: Record<PreorderDetectionSource, "category_slug" | "title" | "description"> = {
    CATEGORY_SLUG: "category_slug",
    TITLE: "title",
    DESCRIPTION: "description",
};
const searchableChangeTypeLabels: Record<PrismaChangeType, string> = {
    PRICE_INCREASE: "price increase",
    PRICE_DECREASE: "price decrease",
    NEW_PRODUCT: "new product",
    SOLD_OUT: "sold out",
    BACK_IN_STOCK: "back in stock",
};

const buildEmptyChangeSummary = (): DashboardChangeSummary => ({
    priceIncrease: 0,
    priceDecrease: 0,
    newProduct: 0,
    soldOut: 0,
    backInStock: 0,
});

const buildTrackedProductScopeWhere = (categoryIds: string[] | null): Prisma.UserTrackedProductWhereInput =>
    categoryIds === null
        ? {}
        : {
              product: {
                  productCategories: {
                      some: {
                          categoryId: {
                              in: categoryIds,
                          },
                          category: {
                              isActive: true,
                          },
                      },
                  },
              },
          };

const tokenizeSearchQuery = (query?: string): string[] => {
    if (!query) {
        return [];
    }

    return query.split(" ").filter((token) => token.length > 0);
};

const getChangeTypesMatchingToken = (token: string): PrismaChangeType[] => {
    const normalizedToken = token.toLocaleLowerCase();

    return (Object.entries(searchableChangeTypeLabels) as Array<[PrismaChangeType, string]>)
        .filter(([, label]) => label.includes(normalizedToken))
        .map(([changeType]) => changeType);
};

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

    return collectDescendantCategoryIds(categories, rootCategoryId, allowedCategoryIds);
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

const getAccessibleRunOrThrow = async (userId: string, role: UserRole, runId: string, includeSystemNoise: boolean) => {
    assertIncludeSystemNoiseAccess(role, includeSystemNoise);
    const categoryIds = await getAccessibleCategoryIds(userId, role);

    if (categoryIds !== null && categoryIds.length === 0) {
        throw new AppError(404, "not_found", "Scrape run not found");
    }

    const run = await prisma.scrapeRun.findFirst({
        where: {
            id: runId,
            ...buildCategoryScopeWhere(categoryIds),
            ...buildSystemNoiseWhere(includeSystemNoise),
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

const assertIncludeSystemNoiseAccess = (role: UserRole, includeSystemNoise: boolean): void => {
    if (includeSystemNoise && role !== "admin") {
        throw new AppError(403, "forbidden", "includeSystemNoise is only available to admin users");
    }
};

const buildSystemNoiseWhere = (includeSystemNoise: boolean): Prisma.ScrapeRunWhereInput =>
    includeSystemNoise ? {} : { isSystemNoise: false };

interface ListChangesWithScopeParams {
    userId: string;
    includeSystemNoise: boolean;
    categoryIds: string[] | null;
    page: number;
    pageSize: number;
    sortBy: "changedAt" | "changeType" | "productName" | "categoryName";
    sortOrder: "asc" | "desc";
    changeType?: RunChangesQuery["changeType"] | ChangesListQuery["changeType"];
    preorder?: "all" | "only" | "exclude";
    query?: string;
    categoryId?: string;
    windowDays?: number;
    changeReportId?: string;
}

const listChangesWithScope = async ({
    userId,
    includeSystemNoise,
    categoryIds,
    page,
    pageSize,
    sortBy,
    sortOrder,
    changeType,
    preorder = "all",
    query,
    categoryId,
    windowDays,
    changeReportId,
}: ListChangesWithScopeParams) => {
    const selectedCategoryIds = categoryId ? await getDescendantCategoryIds(categoryId, categoryIds) : null;

    if (categoryId && (selectedCategoryIds?.length ?? 0) === 0) {
        return {
            items: [],
            page,
            pageSize,
            totalItems: 0,
            totalPages: 0,
        };
    }

    const changeReportWhere: Prisma.ChangeReportWhereInput = {
        ...(changeReportId ? { id: changeReportId } : {}),
        ...(windowDays
            ? {
                  createdAt: {
                      gte: new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000),
                  },
              }
            : {}),
        ...(changeReportId
            ? {}
            : {
                  scrapeRun: selectedCategoryIds
                      ? { categoryId: { in: selectedCategoryIds }, ...buildSystemNoiseWhere(includeSystemNoise) }
                      : { ...buildCategoryScopeWhere(categoryIds), ...buildSystemNoiseWhere(includeSystemNoise) },
              }),
        ...(changeReportId
            ? {
                  scrapeRun: buildSystemNoiseWhere(includeSystemNoise),
              }
            : {}),
    };

    const searchTokens = tokenizeSearchQuery(query);
    const selectedChangeTypes = !changeType ? [] : Array.isArray(changeType) ? changeType : [changeType];
    const where: Prisma.ChangeItemWhereInput = {
        changeReport: changeReportWhere,
        ...(selectedChangeTypes.length > 0
            ? {
                  changeType:
                      selectedChangeTypes.length === 1
                          ? changeTypeInputMap[selectedChangeTypes[0]]
                          : {
                                in: selectedChangeTypes.map((item) => changeTypeInputMap[item]),
                            },
              }
            : {}),
        ...(preorder === "only"
            ? {
                  product: {
                      isPreorder: true,
                  },
              }
            : preorder === "exclude"
              ? {
                    product: {
                        isPreorder: false,
                    },
                }
              : {}),
        ...(searchTokens.length > 0
            ? {
                  AND: searchTokens.map((token) => {
                      const matchingChangeTypes = getChangeTypesMatchingToken(token);

                      return {
                          OR: [
                              {
                                  product: {
                                      name: {
                                          contains: token,
                                          mode: Prisma.QueryMode.insensitive,
                                      },
                                  },
                              },
                              {
                                  product: {
                                      externalUrl: {
                                          contains: token,
                                          mode: Prisma.QueryMode.insensitive,
                                      },
                                  },
                              },
                              {
                                  changeReport: {
                                      scrapeRun: {
                                          category: {
                                              nameEt: {
                                                  contains: token,
                                                  mode: Prisma.QueryMode.insensitive,
                                              },
                                          },
                                      },
                                  },
                              },
                              ...(matchingChangeTypes.length > 0
                                  ? [
                                        {
                                            changeType: {
                                                in: matchingChangeTypes,
                                            },
                                        },
                                    ]
                                  : []),
                          ],
                      };
                  }),
              }
            : {}),
    };

    const orderBy: Prisma.ChangeItemOrderByWithRelationInput[] =
        sortBy === "changeType"
            ? [{ changeType: sortOrder }, { id: sortOrder }]
            : sortBy === "productName"
              ? [{ product: { name: sortOrder } }, { id: sortOrder }]
              : sortBy === "categoryName"
                ? [{ changeReport: { scrapeRun: { category: { nameEt: sortOrder } } } }, { id: sortOrder }]
                : [{ changeReport: { createdAt: sortOrder } }, { id: sortOrder }];

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
                        isPreorder: true,
                        preorderEta: true,
                        preorderDetectedFrom: true,
                    },
                },
                changeReport: {
                    select: {
                        createdAt: true,
                        scrapeRun: {
                            select: {
                                id: true,
                                startedAt: true,
                                category: {
                                    select: {
                                        id: true,
                                        nameEt: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
            orderBy,
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
    ]);
    const watchedProductIds = await getWatchedProductMap(
        userId,
        Array.from(new Set(changeItems.map((item) => item.product.id))),
    );

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
                isWatched: watchedProductIds.has(item.product.id),
                isPreorder: item.product.isPreorder,
                preorderEta: toDateOnly(item.product.preorderEta),
                preorderDetectedFrom: item.product.preorderDetectedFrom
                    ? preorderSourceMap[item.product.preorderDetectedFrom]
                    : undefined,
            },
            changedAt: item.changeReport.createdAt.toISOString(),
            category: {
                id: item.changeReport.scrapeRun.category.id,
                nameEt: item.changeReport.scrapeRun.category.nameEt,
            },
            run: {
                id: item.changeReport.scrapeRun.id,
                startedAt: item.changeReport.scrapeRun.startedAt.toISOString(),
            },
        })),
        page,
        pageSize,
        totalItems,
        totalPages: toTotalPages(totalItems, pageSize),
    };
};

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
            trackingOverview: {
                rows: [],
            },
        };
    }

    const selectedCategoryIds = query.categoryId ? await getDescendantCategoryIds(query.categoryId, categoryIds) : null;

    if (query.categoryId && (selectedCategoryIds?.length ?? 0) === 0) {
        return {
            latestRuns: [],
            recentFailures: [],
            recentChangeSummary: buildEmptyChangeSummary(),
            trackingOverview: {
                rows: [],
            },
        };
    }

    const categoryScope = selectedCategoryIds
        ? { categoryId: { in: selectedCategoryIds }, isSystemNoise: false }
        : { ...buildCategoryScopeWhere(categoryIds), isSystemNoise: false };
    const changeWindowStart = new Date(Date.now() - DASHBOARD_CHANGE_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const trackingCategoryScope = selectedCategoryIds ?? categoryIds;

    const [latestRuns, recentFailures, recentChanges, subscriptions, trackedProducts] = await Promise.all([
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
        prisma.userSubscription.findMany({
            where: {
                userId,
                isActive: true,
                ...(trackingCategoryScope === null ? {} : { categoryId: { in: trackingCategoryScope } }),
            },
            include: {
                category: {
                    select: {
                        id: true,
                        nameEt: true,
                    },
                },
            },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        }),
        prisma.userTrackedProduct.findMany({
            where: {
                userId,
                isActive: true,
                ...buildTrackedProductScopeWhere(trackingCategoryScope),
            },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
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

    const categoryIdsForTrackingRows = subscriptions.map((item) => item.categoryId);
    const productIdsForTrackingRows = trackedProducts.map((item) => item.product.id);

    const [categoryChangeRows, productChangeRows] = await Promise.all([
        categoryIdsForTrackingRows.length > 0
            ? prisma.changeReport.findMany({
                  where: {
                      totalChanges: {
                          gt: 0,
                      },
                      scrapeRun: {
                          categoryId: {
                              in: categoryIdsForTrackingRows,
                          },
                          isSystemNoise: false,
                      },
                  },
                  select: {
                      createdAt: true,
                      scrapeRun: {
                          select: {
                              categoryId: true,
                          },
                      },
                  },
                  orderBy: {
                      createdAt: "desc",
                  },
              })
            : Promise.resolve([]),
        productIdsForTrackingRows.length > 0
            ? prisma.changeItem.findMany({
                  where: {
                      productId: {
                          in: productIdsForTrackingRows,
                      },
                      changeReport: {
                          scrapeRun: categoryScope,
                      },
                  },
                  select: {
                      productId: true,
                      changeReport: {
                          select: {
                              createdAt: true,
                          },
                      },
                  },
                  orderBy: {
                      changeReport: {
                          createdAt: "desc",
                      },
                  },
              })
            : Promise.resolve([]),
    ]);

    const categoryLastChangeByCategoryId = new Map<string, Date>();
    for (const row of categoryChangeRows) {
        if (!categoryLastChangeByCategoryId.has(row.scrapeRun.categoryId)) {
            categoryLastChangeByCategoryId.set(row.scrapeRun.categoryId, row.createdAt);
        }
    }

    const productLastChangeByProductId = new Map<string, Date>();
    for (const row of productChangeRows) {
        if (!productLastChangeByProductId.has(row.productId)) {
            productLastChangeByProductId.set(row.productId, row.changeReport.createdAt);
        }
    }

    const trackingRows = [
        ...subscriptions.map((subscription) => ({
            rowId: `category:${subscription.id}`,
            type: "category" as const,
            name: subscription.category.nameEt,
            lastChangeAt: categoryLastChangeByCategoryId.get(subscription.categoryId)?.toISOString(),
            actionTargetId: subscription.id,
            categoryId: subscription.categoryId,
        })),
        ...trackedProducts.map((trackedProduct) => ({
            rowId: `product:${trackedProduct.id}`,
            type: "product" as const,
            name: trackedProduct.product.name,
            lastChangeAt: productLastChangeByProductId.get(trackedProduct.product.id)?.toISOString(),
            actionTargetId: trackedProduct.product.id,
            productId: trackedProduct.product.id,
        })),
    ].sort((left, right) => {
        const leftTimestamp = left.lastChangeAt ? new Date(left.lastChangeAt).getTime() : 0;
        const rightTimestamp = right.lastChangeAt ? new Date(right.lastChangeAt).getTime() : 0;

        if (leftTimestamp !== rightTimestamp) {
            return rightTimestamp - leftTimestamp;
        }

        const typeComparison = left.type.localeCompare(right.type);
        if (typeComparison !== 0) {
            return typeComparison;
        }

        return left.name.localeCompare(right.name);
    });

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
        trackingOverview: {
            rows: trackingRows,
            lastCheckedAt: latestRuns[0]?.startedAt.toISOString(),
        },
    };
};

export const listRuns = async (userId: string, role: UserRole, query: RunsListQuery): Promise<RunsListResponse> => {
    assertIncludeSystemNoiseAccess(role, query.includeSystemNoise);
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
        ...buildSystemNoiseWhere(query.includeSystemNoise),
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

export const getRunDetail = async (
    userId: string,
    role: UserRole,
    runId: string,
    query: RunDetailQuery,
): Promise<RunDetailResponse> => {
    const run = await getAccessibleRunOrThrow(userId, role, runId, query.includeSystemNoise);
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
    await getAccessibleRunOrThrow(userId, role, runId, query.includeSystemNoise);
    const searchTokens = tokenizeSearchQuery(query.query);

    const where: Prisma.ProductSnapshotWhereInput = {
        scrapeRunId: runId,
        ...(query.inStock === undefined ? {} : { inStock: query.inStock }),
        ...(searchTokens.length > 0
            ? {
                  AND: searchTokens.map((token) => ({
                      OR: [
                          {
                              name: {
                                  contains: token,
                                  mode: Prisma.QueryMode.insensitive,
                              },
                          },
                          {
                              product: {
                                  externalUrl: {
                                      contains: token,
                                      mode: Prisma.QueryMode.insensitive,
                                  },
                              },
                          },
                      ],
                  })),
              }
            : {}),
    };

    const [totalItems, snapshots] = await Promise.all([
        prisma.productSnapshot.count({ where }),
        prisma.productSnapshot.findMany({
            where,
            include: {
                product: {
                    select: {
                        externalUrl: true,
                        isPreorder: true,
                        preorderEta: true,
                        preorderDetectedFrom: true,
                    },
                },
            },
            orderBy: [{ name: "asc" }, { id: "asc" }],
            skip: (query.page - 1) * query.pageSize,
            take: query.pageSize,
        }),
    ]);
    const watchedProductIds = await getWatchedProductMap(
        userId,
        Array.from(new Set(snapshots.map((snapshot) => snapshot.productId))),
    );

    return {
        items: snapshots.map((snapshot) => ({
            id: snapshot.id,
            scrapeRunId: snapshot.scrapeRunId,
            productId: snapshot.productId,
            name: snapshot.name,
            price: Number(snapshot.price.toString()),
            originalPrice: toNumber(snapshot.originalPrice),
            inStock: snapshot.inStock,
            isWatched: watchedProductIds.has(snapshot.productId),
            imageUrl: snapshot.imageUrl,
            externalUrl: snapshot.product.externalUrl,
            isPreorder: snapshot.product.isPreorder,
            preorderEta: toDateOnly(snapshot.product.preorderEta),
            preorderDetectedFrom: snapshot.product.preorderDetectedFrom
                ? preorderSourceMap[snapshot.product.preorderDetectedFrom]
                : undefined,
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
    const run = await getAccessibleRunOrThrow(userId, role, runId, query.includeSystemNoise);

    if (!run.changeReport) {
        return {
            items: [],
            page: query.page,
            pageSize: query.pageSize,
            totalItems: 0,
            totalPages: 0,
        };
    }

    const response = await listChangesWithScope({
        userId,
        includeSystemNoise: query.includeSystemNoise,
        categoryIds: await getAccessibleCategoryIds(userId, role),
        page: query.page,
        pageSize: query.pageSize,
        sortBy: "changedAt",
        sortOrder: "desc",
        changeType: query.changeType,
        preorder: query.preorder,
        query: query.query,
        changeReportId: run.changeReport.id,
    });

    return {
        ...response,
        items: response.items.map((item) => ({
            id: item.id,
            changeType: item.changeType,
            oldPrice: item.oldPrice,
            newPrice: item.newPrice,
            oldStockStatus: item.oldStockStatus,
            newStockStatus: item.newStockStatus,
            product: item.product,
        })),
    };
};

export const listChanges = async (
    userId: string,
    role: UserRole,
    query: ChangesListQuery,
): Promise<ChangesListResponse> => {
    assertIncludeSystemNoiseAccess(role, query.includeSystemNoise);
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

    return listChangesWithScope({
        userId,
        includeSystemNoise: query.includeSystemNoise,
        categoryIds,
        page: query.page,
        pageSize: query.pageSize,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        changeType: query.changeType,
        preorder: query.preorder,
        query: query.query,
        categoryId: query.categoryId,
        windowDays: query.windowDays,
    });
};
