interface HierarchyInputCategory {
    id: string;
    slug: string;
    nameEt: string;
    nameEn: string;
    parentId: string | null;
}

interface HierarchyNode extends HierarchyInputCategory {
    depth: number;
    pathNameEt: string;
    pathNameEn: string;
}

const compareSiblings = (left: HierarchyInputCategory, right: HierarchyInputCategory): number => {
    const byName = left.nameEt.localeCompare(right.nameEt, "et", { sensitivity: "base" });

    if (byName !== 0) {
        return byName;
    }

    return left.id.localeCompare(right.id);
};

export const buildCategoryHierarchy = <TCategory extends HierarchyInputCategory>(
    categories: TCategory[],
): Array<TCategory & HierarchyNode> => {
    const categoriesById = new Map(categories.map((category) => [category.id, category] as const));
    const childrenByParentId = new Map<string | null, TCategory[]>();

    for (const category of categories) {
        const normalizedParentId =
            category.parentId && categoriesById.has(category.parentId) ? category.parentId : null;
        const siblings = childrenByParentId.get(normalizedParentId) ?? [];
        siblings.push(category);
        childrenByParentId.set(normalizedParentId, siblings);
    }

    for (const siblings of childrenByParentId.values()) {
        siblings.sort(compareSiblings);
    }

    const ordered: Array<TCategory & HierarchyNode> = [];

    const visit = (category: TCategory, depth: number, parentEtPath: string[], parentEnPath: string[]) => {
        const pathNameEt = [...parentEtPath, category.nameEt].join(" / ");
        const pathNameEn = [...parentEnPath, category.nameEn].join(" / ");

        ordered.push({
            ...category,
            depth,
            pathNameEt,
            pathNameEn,
        });

        const children = childrenByParentId.get(category.id) ?? [];

        for (const child of children) {
            visit(child, depth + 1, [...parentEtPath, category.nameEt], [...parentEnPath, category.nameEn]);
        }
    };

    const roots = childrenByParentId.get(null) ?? [];

    for (const root of roots) {
        visit(root, 0, [], []);
    }

    return ordered;
};
