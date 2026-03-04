import type { CategoriesData } from "./types/categories-data";
import type { CategoryOption } from "./types/category-option";

export const getCategoryDisplayLabel = (category: CategoriesData["categories"][number]): string =>
    category.pathNameEt || category.nameEt;

const getCategoryOptionPrefix = (depth: number): string => {
    if (depth <= 0) {
        return "";
    }

    return `${"--".repeat(depth)} `;
};

export const buildCategoryOptions = (categories: CategoriesData["categories"]): CategoryOption[] =>
    categories.map((category) => ({
        id: category.id,
        label: `${getCategoryOptionPrefix(category.depth)}${category.nameEt}`,
        slug: category.slug,
        depth: category.depth,
    }));

export const getCategoryLabelById = (
    categories: CategoriesData["categories"],
    categoryId: string | undefined,
): string | undefined => categories.find((category) => category.id === categoryId)?.pathNameEt;
