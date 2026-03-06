import type { CategoriesData } from "./types/categories-data";
import type { CategoryOption } from "./types/category-option";
import type { CategoryTreeNode } from "./types/category-tree-node";

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

interface BuildCategoryTreeDataOptions {
    includeCategoryIds?: ReadonlySet<string>;
    disableCategoryIds?: ReadonlySet<string>;
}

const getIncludedCategoryIds = (
    categories: CategoriesData["categories"],
    includeCategoryIds?: ReadonlySet<string>,
): ReadonlySet<string> | undefined => {
    if (!includeCategoryIds) {
        return undefined;
    }

    const categoriesById = new Map(categories.map((category) => [category.id, category]));
    const includedIds = new Set(includeCategoryIds);

    for (const categoryId of includeCategoryIds) {
        let currentCategory = categoriesById.get(categoryId);

        while (currentCategory?.parentId) {
            const parentCategory = categoriesById.get(currentCategory.parentId);

            if (!parentCategory) {
                break;
            }

            includedIds.add(parentCategory.id);
            currentCategory = parentCategory;
        }
    }

    return includedIds;
};

export const buildCategoryTreeData = (
    categories: CategoriesData["categories"],
    options: BuildCategoryTreeDataOptions = {},
): CategoryTreeNode[] => {
    const includedCategoryIds = getIncludedCategoryIds(categories, options.includeCategoryIds);
    const categoryNodesById = new Map<string, CategoryTreeNode>();
    const roots: CategoryTreeNode[] = [];

    for (const category of categories) {
        if (includedCategoryIds && !includedCategoryIds.has(category.id)) {
            continue;
        }

        const isIncludedCategory = options.includeCategoryIds?.has(category.id) ?? true;
        const isDisabledByRule = options.disableCategoryIds?.has(category.id) ?? false;
        const isDisabled = isDisabledByRule || !isIncludedCategory;

        categoryNodesById.set(category.id, {
            key: category.id,
            value: category.id,
            title: category.nameEt,
            disabled: isDisabled,
            selectable: !isDisabled,
            children: [],
        });
    }

    for (const category of categories) {
        const categoryNode = categoryNodesById.get(category.id);

        if (!categoryNode) {
            continue;
        }

        const parentNode = category.parentId ? categoryNodesById.get(category.parentId) : undefined;

        if (parentNode) {
            parentNode.children?.push(categoryNode);
        } else {
            roots.push(categoryNode);
        }
    }

    return roots;
};

export const getCategoryLabelById = (
    categories: CategoriesData["categories"],
    categoryId: string | undefined,
): string | undefined => categories.find((category) => category.id === categoryId)?.pathNameEt;
