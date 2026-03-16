import type { DashboardHomeData } from "../schemas";
import type { CategoryTreeNode } from "../../categories";

import type { ReactNode } from "react";

export interface DashboardSummaryGridProps {
    summary: DashboardHomeData["recentChangeSummary"];
    categoryId?: string;
}

export interface DashboardRunPanelItem {
    id: string;
    categoryName: string;
    startedAt: string;
    statusLabel: string;
    statusTone: "failed" | "pending" | "running" | "completed";
    secondaryMeta?: string[];
    description?: string;
    runId: string;
    actionLabel: string;
}

export interface DashboardRunListPanelProps {
    headingId: string;
    title: string;
    emptyText: string;
    items: DashboardRunPanelItem[];
    headerAction?: ReactNode;
}

export type DashboardTrackingRow = DashboardHomeData["trackingOverview"]["rows"][number];

export interface DashboardTrackingTableSectionProps {
    categoryTreeData: CategoryTreeNode[];
    trackingRows: DashboardTrackingRow[];
    selectedCategoryId?: string;
    slotsUsed: number;
    slotsLimit: number | null;
    slotsRemaining: number | null;
    lastCheckedAt?: string;
    isCreatePending: boolean;
    createError?: string | null;
    pendingRowId?: string;
    onCategoryChange: (value?: string) => void;
    onTrackCategory: (categoryId: string) => Promise<void>;
    onUntrack: (row: DashboardTrackingRow) => Promise<void>;
}
