import { UserRole as PrismaUserRole } from "@prisma/client";
import type { UserRole } from "@mabrik/shared";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/errors";

const roleLimitMap: Record<Exclude<UserRole, "admin">, number> = {
    free: 3,
    paid: 6,
};

const toLimit = (role: UserRole): number | null => (role === "admin" ? null : roleLimitMap[role]);

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

    const limit = toLimit(role);
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
    const limit = toLimit(role);

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
            const activeCount = await tx.userSubscription.count({
                where: {
                    userId,
                    isActive: true,
                },
            });

            if (activeCount >= limit) {
                throw new AppError(409, "subscription_limit_reached", `Your plan allows tracking up to ${limit} categories`);
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

export const deleteSubscription = async (userId: string, subscriptionId: string): Promise<{ success: true }> => {
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

    await prisma.userSubscription.update({
        where: {
            id: subscription.id,
        },
        data: {
            isActive: false,
        },
    });

    return { success: true };
};

export const getRoleLimit = (role: PrismaUserRole): number | null => {
    if (role === PrismaUserRole.ADMIN) {
        return null;
    }

    return role === PrismaUserRole.PAID ? 6 : 3;
};
