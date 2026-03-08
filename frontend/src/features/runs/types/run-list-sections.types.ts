import type { ColumnDef } from "@tanstack/react-table";
import type { CategoryTreeNode } from "../../categories/types/category-tree-node";
import type { RunsListData } from "../schemas";

export interface RunsFiltersProps {
    categoryId?: string;
    status?: string;
    pageSize: number;
    categoryTreeData: CategoryTreeNode[];
    onStatusChange: (value?: string) => void;
    onCategoryChange: (value?: string) => void;
    onPageSizeChange: (value: string) => void;
}

export interface RunsTableSectionProps {
    columns: Array<ColumnDef<RunsListData["items"][number], unknown>>;
    data?: RunsListData;
    page: number;
    pageSize: number;
    isFetching: boolean;
    isLoading: boolean;
    errorMessage?: string;
    onPageChange: (page: number) => void;
}

export interface ChangesFiltersProps {
    categoryId?: string;
    changeType?: "price_increase" | "price_decrease" | "new_product" | "sold_out" | "back_in_stock";
    preorder: "all" | "only" | "exclude";
    pageSize: number;
    windowDays: number;
    categoryTreeData: CategoryTreeNode[];
    onCategoryChange: (value?: string) => void;
    onChangeTypeChange: (
        value?: "price_increase" | "price_decrease" | "new_product" | "sold_out" | "back_in_stock",
    ) => void;
    onPreorderChange: (value: "all" | "only" | "exclude") => void;
    onWindowDaysChange: (value: number) => void;
    onPageSizeChange: (value: string) => void;
    onReset: () => void;
}
