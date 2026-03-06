export interface SortHeaderProps {
    label: string;
    isActive: boolean;
    order: "asc" | "desc";
    onToggle: () => void;
}
