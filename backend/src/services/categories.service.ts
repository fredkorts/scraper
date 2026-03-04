import type { CategoriesResponse, ScrapeInterval, UserRole } from "@mabrik/shared";
import { prisma } from "../lib/prisma";
import { getAccessibleCategoryIds } from "./access-scope.service";
import { buildCategoryHierarchy } from "./category-hierarchy.service";

export const listCategories = async (
    userId: string,
    role: UserRole,
    scope: "tracked" | "all" = "tracked",
): Promise<CategoriesResponse> => {
    const categoryIds = scope === "all" ? null : await getAccessibleCategoryIds(userId, role);

    const categories = await prisma.category.findMany({
        where: {
            isActive: true,
        },
    });

    const orderedCategories = buildCategoryHierarchy(
        categories.map((category) => ({
            id: category.id,
            slug: category.slug,
            nameEt: category.nameEt,
            nameEn: category.nameEn,
            parentId: category.parentId,
            isActive: category.isActive,
            scrapeIntervalHours: category.scrapeIntervalHours,
            nextRunAt: category.nextRunAt,
            createdAt: category.createdAt,
            updatedAt: category.updatedAt,
        })),
    ).filter((category) => categoryIds === null || categoryIds.includes(category.id));

    return {
        categories: orderedCategories.map((category) => ({
            id: category.id,
            slug: category.slug,
            nameEt: category.nameEt,
            nameEn: category.nameEn,
            parentId: category.parentId ?? undefined,
            depth: category.depth,
            pathNameEt: category.pathNameEt,
            pathNameEn: category.pathNameEn,
            isActive: category.isActive,
            scrapeIntervalHours: category.scrapeIntervalHours as ScrapeInterval,
            nextRunAt: category.nextRunAt?.toISOString(),
            createdAt: category.createdAt.toISOString(),
            updatedAt: category.updatedAt.toISOString(),
        })),
    };
};
