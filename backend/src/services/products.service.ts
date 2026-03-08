import { PreorderDetectionSource, ScrapeRunStatus } from "@prisma/client";
import type { ProductDetailResponse, ProductHistoryResponse, UserRole } from "@mabrik/shared";
import { ScrapeStatus } from "@mabrik/shared";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/errors";
import { buildCategoryScopeWhere, getAccessibleCategoryIds } from "./access-scope.service";

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
): Promise<ProductDetailResponse> => {
    const { product, categoryIds } = await getAccessibleProductScope(userId, role, productId);
    const runScope = buildCategoryScopeWhere(categoryIds);

    const [latestSnapshot, earliestSnapshot, historyPointCount, recentRuns] = await Promise.all([
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
): Promise<ProductHistoryResponse> => {
    const { categoryIds } = await getAccessibleProductScope(userId, role, productId);

    const snapshots = await prisma.productSnapshot.findMany({
        where: {
            productId,
            scrapeRun: buildCategoryScopeWhere(categoryIds),
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
