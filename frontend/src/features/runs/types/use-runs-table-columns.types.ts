export interface UseRunsTableColumnsOptions {
    sortBy: "startedAt" | "status" | "totalChanges" | "totalProducts" | "durationMs";
    sortOrder: "asc" | "desc";
    onToggleSort: (sortBy: "startedAt" | "status" | "totalChanges" | "totalProducts" | "durationMs") => void;
    statusBadgeClassName: string;
}
