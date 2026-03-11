import { PreorderDetectionSource, ScrapeRunStatus } from "@prisma/client";
import type {
    ProductDetailResponse,
    ProductHistoryResponse,
    ProductQuickSearchResponse,
    UserRole,
} from "@mabrik/shared";
import { ScrapeStatus } from "@mabrik/shared";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/errors";
import type { ProductDetailQuery, ProductHistoryQuery, ProductSearchQuery } from "../schemas/products";
import { buildCategoryScopeWhere, getAccessibleCategoryIds } from "./access-scope.service";
import { getActiveTrackedProductRecord } from "./tracked-product.service";

const statusMap: Record<ScrapeRunStatus, ScrapeStatus> = {
    PENDING: ScrapeStatus.PENDING,
    RUNNING: ScrapeStatus.RUNNING,
    COMPLETED: ScrapeStatus.COMPLETED,
    FAILED: ScrapeStatus.FAILED,
};

const toNumber = (value: { toString(): string } | null | undefined): number | undefined =>
    value === null || value === undefined ? undefined : Number(value.toString());
const toDateOnly = (value: Date | null | undefined): string | undefined =>
    value ? value.toISOString().slice(0, 10) : undefined;
const preorderSourceMap: Record<PreorderDetectionSource, "category_slug" | "title" | "description"> = {
    CATEGORY_SLUG: "category_slug",
    TITLE: "title",
    DESCRIPTION: "description",
};

const assertIncludeSystemNoiseAccess = (role: UserRole, includeSystemNoise: boolean): void => {
    if (includeSystemNoise && role !== "admin") {
        throw new AppError(403, "forbidden", "includeSystemNoise is only available to admin users");
    }
};

const tokenizeSearchQuery = (query: string): string[] =>
    query
        .toLocaleLowerCase()
        .split(" ")
        .map((token) => token.trim())
        .filter((token) => token.length > 0);

const categoryMatchesToken = (category: { nameEt: string; nameEn: string }, token: string): boolean => {
    const normalizedEt = category.nameEt.toLocaleLowerCase();
    const normalizedEn = category.nameEn.toLocaleLowerCase();

    return normalizedEt.includes(token) || normalizedEn.includes(token);
};

const pickCategoryLabel = (
    categories: Array<{ nameEt: string; nameEn: string }>,
    searchTokens: string[],
): string | undefined => {
    if (categories.length === 0) {
        return undefined;
    }

    const matchedCategories = categories.filter((category) =>
        searchTokens.some((token) => categoryMatchesToken(category, token)),
    );
    const candidates = matchedCategories.length > 0 ? matchedCategories : categories;

    return candidates[0]?.nameEt;
};

const getAccessibleProductScope = async (userId: string, role: UserRole, productId: string) => {
    const categoryIds = await getAccessibleCategoryIds(userId, role);

    if (categoryIds !== null && categoryIds.length === 0) {
        throw new AppError(404, "not_found", "Product not found");
    }

    const product = await prisma.product.findFirst({
        where: {
            id: productId,
            ...(categoryIds === null
                ? {}
                : {
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
                  }),
        },
        include: {
            productCategories: {
                where: {
                    category: {
                        isActive: true,
                        ...(categoryIds === null ? {} : { id: { in: categoryIds } }),
                    },
                },
                include: {
                    category: {
                        select: {
                            id: true,
                            slug: true,
                            nameEt: true,
                            nameEn: true,
                        },
                    },
                },
                orderBy: {
                    category: {
                        nameEt: "asc",
                    },
                },
            },
        },
    });

    if (!product) {
        throw new AppError(404, "not_found", "Product not found");
    }

    return { product, categoryIds };
};

export const getProductDetail = async (
    userId: string,
    role: UserRole,
    productId: string,
    query: ProductDetailQuery,
): Promise<ProductDetailResponse> => {
    assertIncludeSystemNoiseAccess(role, query.includeSystemNoise);
    const { product, categoryIds } = await getAccessibleProductScope(userId, role, productId);
    const runScope = {
        ...buildCategoryScopeWhere(categoryIds),
        ...(query.includeSystemNoise ? {} : { isSystemNoise: false }),
    };

    const [latestSnapshot, earliestSnapshot, historyPointCount, recentRuns, trackedProduct] = await Promise.all([
        prisma.productSnapshot.findFirst({
            where: {
                productId,
                scrapeRun: runScope,
            },
            orderBy: [{ scrapedAt: "desc" }, { id: "desc" }],
        }),
        prisma.productSnapshot.findFirst({
            where: {
                productId,
                scrapeRun: runScope,
            },
            orderBy: [{ scrapedAt: "asc" }, { id: "asc" }],
        }),
        prisma.productSnapshot.count({
            where: {
                productId,
                scrapeRun: runScope,
            },
        }),
        prisma.scrapeRun.findMany({
            where: {
                ...runScope,
                productSnapshots: {
                    some: {
                        productId,
                    },
                },
            },
            include: {
                category: {
                    select: {
                        id: true,
                        nameEt: true,
                    },
                },
            },
            orderBy: [{ startedAt: "desc" }, { id: "desc" }],
            take: 5,
        }),
        getActiveTrackedProductRecord(userId, productId),
    ]);

    return {
        product: {
            id: product.id,
            name: product.name,
            imageUrl: product.imageUrl,
            externalUrl: product.externalUrl,
            currentPrice: toNumber(latestSnapshot?.price) ?? Number(product.currentPrice.toString()),
            originalPrice: toNumber(latestSnapshot?.originalPrice) ?? toNumber(product.originalPrice),
            inStock: latestSnapshot?.inStock ?? product.inStock,
            isWatched: Boolean(trackedProduct),
            trackedProductId: trackedProduct?.id,
            isPreorder: product.isPreorder,
            preorderEta: toDateOnly(product.preorderEta),
            preorderDetectedFrom: product.preorderDetectedFrom
                ? preorderSourceMap[product.preorderDetectedFrom]
                : undefined,
            firstSeenAt: earliestSnapshot?.scrapedAt.toISOString() ?? product.firstSeenAt.toISOString(),
            lastSeenAt: latestSnapshot?.scrapedAt.toISOString() ?? product.lastSeenAt.toISOString(),
            historyPointCount,
            categories: product.productCategories.map((entry) => ({
                id: entry.category.id,
                slug: entry.category.slug,
                nameEt: entry.category.nameEt,
                nameEn: entry.category.nameEn,
            })),
            recentRuns: recentRuns.map((run) => ({
                id: run.id,
                categoryId: run.category.id,
                categoryName: run.category.nameEt,
                status: statusMap[run.status],
                startedAt: run.startedAt.toISOString(),
                completedAt: run.completedAt?.toISOString(),
            })),
        },
    };
};

export const getProductHistory = async (
    userId: string,
    role: UserRole,
    productId: string,
    query: ProductHistoryQuery,
): Promise<ProductHistoryResponse> => {
    assertIncludeSystemNoiseAccess(role, query.includeSystemNoise);
    const { categoryIds } = await getAccessibleProductScope(userId, role, productId);

    const snapshots = await prisma.productSnapshot.findMany({
        where: {
            productId,
            scrapeRun: {
                ...buildCategoryScopeWhere(categoryIds),
                ...(query.includeSystemNoise ? {} : { isSystemNoise: false }),
            },
        },
        include: {
            scrapeRun: {
                select: {
                    id: true,
                    category: {
                        select: {
                            id: true,
                            nameEt: true,
                        },
                    },
                },
            },
        },
        orderBy: [{ scrapedAt: "asc" }, { id: "asc" }],
    });

    return {
        items: snapshots.map((snapshot) => ({
            id: snapshot.id,
            scrapeRunId: snapshot.scrapeRun.id,
            categoryId: snapshot.scrapeRun.category.id,
            categoryName: snapshot.scrapeRun.category.nameEt,
            price: Number(snapshot.price.toString()),
            originalPrice: toNumber(snapshot.originalPrice),
            inStock: snapshot.inStock,
            scrapedAt: snapshot.scrapedAt.toISOString(),
        })),
    };
};

export const searchProducts = async (
    userId: string,
    role: UserRole,
    query: ProductSearchQuery,
): Promise<ProductQuickSearchResponse> => {
    const categoryIds = await getAccessibleCategoryIds(userId, role);

    if (categoryIds !== null && categoryIds.length === 0) {
        return { items: [] };
    }

    const searchTokens = tokenizeSearchQuery(query.query);
    const categoryScopeWhere = {
        isActive: true,
        ...(categoryIds === null ? {} : { id: { in: categoryIds } }),
    };

    const products = await prisma.product.findMany({
        where: {
            productCategories: {
                some: {
                    category: categoryScopeWhere,
                },
            },
            AND: searchTokens.map((token) => ({
                OR: [
                    {
                        name: {
                            contains: token,
                            mode: "insensitive",
                        },
                    },
                    {
                        productCategories: {
                            some: {
                                category: {
                                    ...categoryScopeWhere,
                                    OR: [
                                        {
                                            nameEt: {
                                                contains: token,
                                                mode: "insensitive",
                                            },
                                        },
                                        {
                                            nameEn: {
                                                contains: token,
                                                mode: "insensitive",
                                            },
                                        },
                                    ],
                                },
                            },
                        },
                    },
                ],
            })),
        },
        select: {
            id: true,
            name: true,
            imageUrl: true,
            lastSeenAt: true,
            productCategories: {
                where: {
                    category: categoryScopeWhere,
                },
                select: {
                    category: {
                        select: {
                            nameEt: true,
                            nameEn: true,
                        },
                    },
                },
                orderBy: {
                    category: {
                        nameEt: "asc",
                    },
                },
            },
        },
        orderBy: [{ lastSeenAt: "desc" }, { id: "desc" }],
        take: query.limit,
    });

    return {
        items: products
            .map((product) => {
                const categories = product.productCategories.map((entry) => entry.category);
                const categoryName = pickCategoryLabel(categories, searchTokens);

                if (!categoryName) {
                    return null;
                }

                return {
                    id: product.id,
                    name: product.name,
                    imageUrl: product.imageUrl,
                    categoryName,
                };
            })
            .filter((item): item is NonNullable<typeof item> => item !== null),
    };
};
