import type { DashboardTrackingRow } from "./dashboard-sections.types";

export interface UseDashboardTrackingColumnsOptions {
    pendingRowId?: string;
    onUntrack: (row: DashboardTrackingRow) => Promise<void>;
}
