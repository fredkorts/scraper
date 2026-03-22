import type { UserRole } from "@mabrik/shared";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/errors";
import { getTrackingLimit, getTrackingUsage } from "./tracking-capacity.service";

export const listSubscriptions = async (
    userId: string,
    role: UserRole,
): Promise<{
    items: Array<{
        id: string;
        category: {
            id: string;
            slug: string;
            nameEt: string;
            nameEn: string;
        };
        createdAt: string;
        isActive: boolean;
    }>;
    limit: number | null;
    used: number;
    remaining: number | null;
}> => {
    const subscriptions = await prisma.userSubscription.findMany({
        where: {
            userId,
            isActive: true,
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
            createdAt: "asc",
        },
    });

    const limit = getTrackingLimit(role);
    const used = subscriptions.length;

    return {
        items: subscriptions.map((subscription) => ({
            id: subscription.id,
            category: {
                id: subscription.category.id,
                slug: subscription.category.slug,
                nameEt: subscription.category.nameEt,
                nameEn: subscription.category.nameEn,
            },
            createdAt: subscription.createdAt.toISOString(),
            isActive: subscription.isActive,
        })),
        limit,
        used,
        remaining: limit === null ? null : Math.max(0, limit - used),
    };
};

export const createSubscription = async (
    userId: string,
    role: UserRole,
    categoryId: string,
): Promise<{
    id: string;
    category: {
        id: string;
        slug: string;
        nameEt: string;
        nameEn: string;
    };
    createdAt: string;
    isActive: boolean;
}> => {
    const limit = getTrackingLimit(role);

    return prisma.$transaction(async (tx) => {
        const category = await tx.category.findFirst({
            where: {
                id: categoryId,
                isActive: true,
            },
            select: {
                id: true,
                slug: true,
                nameEt: true,
                nameEn: true,
            },
        });

        if (!category) {
            throw new AppError(404, "category_not_found", "Category not found");
        }

        const existing = await tx.userSubscription.findFirst({
            where: {
                userId,
                categoryId,
            },
        });

        if (existing?.isActive) {
            throw new AppError(409, "already_subscribed", "You are already tracking this category");
        }

        if (limit !== null) {
            const usage = await getTrackingUsage(tx, userId);
            if (usage.used >= limit) {
                throw new AppError(409, "tracking_limit_reached", `Your plan allows tracking up to ${limit} items`);
            }
        }

        const subscription = existing
            ? await tx.userSubscription.update({
                  where: {
                      id: existing.id,
                  },
                  data: {
                      isActive: true,
                  },
              })
            : await tx.userSubscription.create({
                  data: {
                      userId,
                      categoryId,
                  },
              });

        return {
            id: subscription.id,
            category,
            createdAt: subscription.createdAt.toISOString(),
            isActive: subscription.isActive,
        };
    });
};

export const deleteSubscription = async (
    userId: string,
    role: UserRole,
    subscriptionId: string,
): Promise<{ success: true; autoDisabledWatchCount: number }> => {
    const subscription = await prisma.userSubscription.findFirst({
        where: {
            id: subscriptionId,
            userId,
            isActive: true,
        },
    });

    if (!subscription) {
        throw new AppError(404, "not_found", "Subscription not found");
    }

    return prisma.$transaction(async (tx) => {
        await tx.userSubscription.update({
            where: {
                id: subscription.id,
            },
            data: {
                isActive: false,
            },
        });

        if (role === "admin") {
            return {
                success: true as const,
                autoDisabledWatchCount: 0,
            };
        }

        const remainingSubscriptionCategoryIds = (
            await tx.userSubscription.findMany({
                where: {
                    userId,
                    isActive: true,
                },
                select: {
                    categoryId: true,
                },
            })
        ).map((item) => item.categoryId);

        const disableResult = await tx.userTrackedProduct.updateMany({
            where: {
                userId,
                isActive: true,
                ...(remainingSubscriptionCategoryIds.length > 0
                    ? {
                          NOT: {
                              product: {
                                  productCategories: {
                                      some: {
                                          categoryId: {
                                              in: remainingSubscriptionCategoryIds,
                                          },
                                          category: {
                                              isActive: true,
                                          },
                                      },
                                  },
                              },
                          },
                      }
                    : {}),
            },
            data: {
                isActive: false,
                deactivatedReason: "category_untracked",
            },
        });

        return {
            success: true as const,
            autoDisabledWatchCount: disableResult.count,
        };
    });
};
