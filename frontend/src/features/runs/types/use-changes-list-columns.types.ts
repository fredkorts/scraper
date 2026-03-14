export interface UseChangesListColumnsOptions {
    sortBy: "changedAt" | "productName" | "categoryName";
    sortOrder: "asc" | "desc";
    onToggleSort: (value: "changedAt" | "productName" | "categoryName") => void;
}
