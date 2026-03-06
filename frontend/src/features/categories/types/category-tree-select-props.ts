import type { CategoryTreeNode } from "./category-tree-node";

export interface CategoryTreeSelectProps {
    ariaLabel: string;
    className?: string;
    disabled?: boolean;
    id?: string;
    treeData: CategoryTreeNode[];
    placeholder?: string;
    value?: string;
    allowClear?: boolean;
    onChange: (value: string | undefined) => void;
}
