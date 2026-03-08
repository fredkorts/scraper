export interface UseChangesListColumnsOptions {
    sortBy: "changedAt" | "changeType" | "productName" | "categoryName";
    sortOrder: "asc" | "desc";
    onToggleSort: (value: "changedAt" | "changeType" | "productName" | "categoryName") => void;
    productLinkClassName: string;
}
