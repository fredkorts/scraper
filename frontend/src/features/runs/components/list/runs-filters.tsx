import { AppSelect } from "../../../../components/app-select/AppSelect";
import { CategoryTreeSelect } from "../../../categories/components/category-tree-select";
import {
    RUN_PAGE_SIZE_OPTIONS,
    RUN_STATUS_FILTER_OPTIONS,
} from "../../constants/run-filters.constants";
import styles from "./run-list-sections.module.scss";
import type { RunsFiltersProps } from "../../types/run-list-sections.types";

export const RunsFilters = ({
    categoryId,
    categoryTreeData,
    pageSize,
    status,
    onCategoryChange,
    onPageSizeChange,
    onStatusChange,
}: RunsFiltersProps) => (
    <div className={styles.filterRow}>
        <div className={styles.filterGroup}>
            <label className={styles.label} htmlFor="status-filter">
                Status
            </label>
            <AppSelect
                allowClear
                ariaLabel="Status"
                className={styles.select}
                id="status-filter"
                options={RUN_STATUS_FILTER_OPTIONS}
                placeholder="All statuses"
                value={status}
                onChange={(value) => onStatusChange(value || undefined)}
            />
        </div>

        <div className={styles.filterGroup}>
            <label className={styles.label} htmlFor="category-filter">
                Category
            </label>
            <CategoryTreeSelect
                allowClear
                ariaLabel="Category"
                className={styles.select}
                id="category-filter"
                treeData={categoryTreeData}
                placeholder="All tracked categories"
                value={categoryId}
                onChange={(value) => onCategoryChange(value || undefined)}
            />
        </div>

        <div className={styles.filterGroup}>
            <label className={styles.label} htmlFor="page-size">
                Page size
            </label>
            <AppSelect
                ariaLabel="Page size"
                className={styles.select}
                id="page-size"
                options={RUN_PAGE_SIZE_OPTIONS}
                value={String(pageSize)}
                onChange={(value) => onPageSizeChange(value ?? "25")}
            />
        </div>
    </div>
);
