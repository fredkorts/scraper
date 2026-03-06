import type { ColumnDef } from "@tanstack/react-table";
import type { RunChangesData, RunDetailData, RunProductsData } from "../schemas";

type RunDetailRecord = RunDetailData["run"];

export interface RunDetailHeaderProps {
    run: RunDetailRecord;
}

export interface RunFailurePanelProps {
    failure: NonNullable<RunDetailRecord["failure"]>;
    isAdmin: boolean;
}

export interface RunMetricItem {
    label: string;
    value: string | number;
}

export interface RunMetricsGridProps {
    items: RunMetricItem[];
}

export interface RunChangesSectionProps {
    changeColumns: Array<ColumnDef<RunChangesData["items"][number], unknown>>;
    changeType?: string;
    changes: RunChangesData | undefined;
    errorMessage?: string;
    isLoading: boolean;
    isFetching: boolean;
    page: number;
    pageSize: number;
    onChangeTypeChange: (value?: string) => void;
    onPageChange: (page: number) => void;
}

export interface RunProductsSectionProps {
    productColumns: Array<ColumnDef<RunProductsData["items"][number], unknown>>;
    products: RunProductsData | undefined;
    productsInStock?: string;
    errorMessage?: string;
    isLoading: boolean;
    isFetching: boolean;
    page: number;
    pageSize: number;
    onProductsStockChange: (value?: string) => void;
    onPageChange: (page: number) => void;
}
