import { PreorderDetectionSource, Prisma } from "@prisma/client";
import type { TrackProductResponse, TrackedProductsResponse, UserRole } from "@mabrik/shared";
import { AppError } from "../lib/errors";
import { prisma } from "../lib/prisma";
import { getAccessibleCategoryIds } from "./access-scope.service";
import { getTrackingLimit, getTrackingUsage } from "./tracking-capacity.service";

const toDateOnly = (value: Date | null | undefined): string | undefined =>
    value ? value.toISOString().slice(0, 10) : undefined;

const preorderSourceMap: Record<PreorderDetectionSource, "category_slug" | "title" | "description"> = {
    CATEGORY_SLUG: "category_slug",
    TITLE: "title",
    DESCRIPTION: "description",
};

const buildTrackedProductWhere = (categoryIds: string[] | null): Prisma.UserTrackedProductWhereInput =>
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

const buildProductCategoryWhere = (categoryIds: string[] | null): Prisma.ProductCategoryWhereInput => ({
    category: {
        isActive: true,
        ...(categoryIds === null
            ? {}
            : {
                  id: {
                      in: categoryIds,
                  },
              }),
    },
});

const toTrackedProductItem = (record: {
    id: string;
    productId: string;
    createdAt: Date;
    updatedAt: Date;
    product: {
        id: string;
        name: string;
        imageUrl: string;
        externalUrl: string;
        currentPrice: Prisma.Decimal;
        inStock: boolean;
        isPreorder: boolean;
        preorderEta: Date | null;
        preorderDetectedFrom: PreorderDetectionSource | null;
        productCategories: Array<{
            category: {
                id: string;
                slug: string;
                nameEt: string;
                nameEn: string;
            };
        }>;
    };
}) => ({
    id: record.id,
    productId: record.productId,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    product: {
        id: record.product.id,
        name: record.product.name,
        imageUrl: record.product.imageUrl,
        externalUrl: record.product.externalUrl,
        currentPrice: Number(record.product.currentPrice.toString()),
        inStock: record.product.inStock,
        isPreorder: record.product.isPreorder,
        preorderEta: toDateOnly(record.product.preorderEta),
        preorderDetectedFrom: record.product.preorderDetectedFrom
            ? preorderSourceMap[record.product.preorderDetectedFrom]
            : undefined,
        categories: record.product.productCategories.map((entry) => ({
            id: entry.category.id,
            slug: entry.category.slug,
            nameEt: entry.category.nameEt,
            nameEn: entry.category.nameEn,
        })),
    },
});

export const listTrackedProducts = async (userId: string, role: UserRole): Promise<TrackedProductsResponse> => {
    const categoryIds = await getAccessibleCategoryIds(userId, role);

    if (categoryIds !== null && categoryIds.length === 0) {
        return { items: [] };
    }

    const items = await prisma.userTrackedProduct.findMany({
        where: {
            userId,
            isActive: true,
            ...buildTrackedProductWhere(categoryIds),
        },
        include: {
            product: {
                select: {
                    id: true,
                    name: true,
                    imageUrl: true,
                    externalUrl: true,
                    currentPrice: true,
                    inStock: true,
                    isPreorder: true,
                    preorderEta: true,
                    preorderDetectedFrom: true,
                    productCategories: {
                        where: buildProductCategoryWhere(categoryIds),
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
            },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });

    return {
        items: items.map(toTrackedProductItem),
    };
};

export const trackProduct = async (
    userId: string,
    role: UserRole,
    productId: string,
): Promise<TrackProductResponse> => {
    const categoryIds = await getAccessibleCategoryIds(userId, role);

    if (categoryIds !== null && categoryIds.length === 0) {
        throw new AppError(404, "not_found", "Product not found");
    }

    const limit = getTrackingLimit(role);

    return prisma.$transaction(async (tx) => {
        const product = await tx.product.findFirst({
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
            select: {
                id: true,
                name: true,
                imageUrl: true,
                externalUrl: true,
                currentPrice: true,
                inStock: true,
                isPreorder: true,
                preorderEta: true,
                preorderDetectedFrom: true,
                productCategories: {
                    where: buildProductCategoryWhere(categoryIds),
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

        const existing = await tx.userTrackedProduct.findUnique({
            where: {
                userId_productId: {
                    userId,
                    productId,
                },
            },
        });

        if (existing?.isActive) {
            return {
                item: toTrackedProductItem({
                    id: existing.id,
                    productId: existing.productId,
                    createdAt: existing.createdAt,
                    updatedAt: existing.updatedAt,
                    product,
                }),
            };
        }

        if (limit !== null) {
            const usage = await getTrackingUsage(tx, userId);
            if (usage.used >= limit) {
                throw new AppError(409, "tracking_limit_reached", `Your plan allows tracking up to ${limit} items`);
            }
        }

        const trackedProduct = existing
            ? await tx.userTrackedProduct.update({
                  where: {
                      id: existing.id,
                  },
                  data: {
                      isActive: true,
                      deactivatedReason: null,
                  },
              })
            : await tx.userTrackedProduct.create({
                  data: {
                      userId,
                      productId,
                  },
              });

        return {
            item: toTrackedProductItem({
                id: trackedProduct.id,
                productId: trackedProduct.productId,
                createdAt: trackedProduct.createdAt,
                updatedAt: trackedProduct.updatedAt,
                product,
            }),
        };
    });
};

export const untrackProductByProductId = async (userId: string, productId: string): Promise<{ success: true }> => {
    await prisma.userTrackedProduct.updateMany({
        where: {
            userId,
            productId,
            isActive: true,
        },
        data: {
            isActive: false,
            deactivatedReason: "manual_unwatch",
        },
    });

    return {
        success: true,
    };
};

export const getWatchedProductMap = async (userId: string, productIds: string[]): Promise<Set<string>> => {
    if (productIds.length === 0) {
        return new Set();
    }

    const watchedProducts = await prisma.userTrackedProduct.findMany({
        where: {
            userId,
            isActive: true,
            productId: {
                in: productIds,
            },
        },
        select: {
            productId: true,
        },
    });

    return new Set(watchedProducts.map((item) => item.productId));
};

export const getActiveTrackedProductRecord = async (
    userId: string,
    productId: string,
): Promise<{ id: string } | null> => {
    const tracked = await prisma.userTrackedProduct.findFirst({
        where: {
            userId,
            productId,
            isActive: true,
        },
        select: {
            id: true,
        },
    });

    return tracked;
};
