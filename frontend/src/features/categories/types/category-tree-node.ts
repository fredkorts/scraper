export interface CategoryTreeNode {
    key: string;
    value: string;
    title: string;
    disabled?: boolean;
    selectable?: boolean;
    children?: CategoryTreeNode[];
}
