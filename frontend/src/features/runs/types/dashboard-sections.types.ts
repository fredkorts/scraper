import type { DashboardHomeData } from "../schemas";

import type { ReactNode } from "react";

export interface DashboardSummaryGridProps {
    summary: DashboardHomeData["recentChangeSummary"];
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
