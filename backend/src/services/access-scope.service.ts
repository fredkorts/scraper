import type { Prisma } from "@prisma/client";
import type { UserRole } from "@mabrik/shared";
import { prisma } from "../lib/prisma";

export const getAccessibleCategoryIds = async (userId: string, role: UserRole): Promise<string[] | null> => {
    if (role === "admin") {
        return null;
    }

    const subscriptions = await prisma.userSubscription.findMany({
        where: {
            userId,
            isActive: true,
            category: {
                isActive: true,
            },
        },
        select: {
            categoryId: true,
        },
    });

    return subscriptions.map((subscription) => subscription.categoryId);
};

export const buildCategoryScopeWhere = (categoryIds: string[] | null): Prisma.ScrapeRunWhereInput => {
    if (categoryIds === null) {
        return {};
    }

    return {
        categoryId: {
            in: categoryIds,
        },
    };
};
