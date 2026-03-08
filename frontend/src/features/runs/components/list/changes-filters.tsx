import { AppButton } from "../../../../components/app-button/AppButton";
import { AppSelect } from "../../../../components/app-select/AppSelect";
import { CategoryTreeSelect } from "../../../categories/components/category-tree-select";
import {
    RUN_CHANGE_TYPE_FILTER_OPTIONS,
    RUN_CHANGE_WINDOW_OPTIONS,
    RUN_PAGE_SIZE_OPTIONS,
} from "../../constants/run-filters.constants";
import styles from "./run-list-sections.module.scss";
import type { ChangesFiltersProps } from "../../types/run-list-sections.types";

export const ChangesFilters = ({
    categoryId,
    changeType,
    pageSize,
    windowDays,
    categoryTreeData,
    onCategoryChange,
    onChangeTypeChange,
    onWindowDaysChange,
    onPageSizeChange,
    onReset,
}: ChangesFiltersProps) => (
    <div className={styles.filterRow}>
        <div className={styles.filterGroup}>
            <label className={styles.label} htmlFor="changes-change-type-filter">
                Change type
            </label>
            <AppSelect
                allowClear
                ariaLabel="Change type"
                className={styles.select}
                id="changes-change-type-filter"
                options={RUN_CHANGE_TYPE_FILTER_OPTIONS}
                placeholder="All change types"
                value={changeType}
                onChange={(value) =>
                    onChangeTypeChange(
                        (value as "price_increase" | "price_decrease" | "new_product" | "sold_out" | "back_in_stock") ||
                            undefined,
                    )
                }
            />
        </div>

        <div className={styles.filterGroup}>
            <label className={styles.label} htmlFor="changes-category-filter">
                Category
            </label>
            <CategoryTreeSelect
                allowClear
                ariaLabel="Category"
                className={styles.select}
                id="changes-category-filter"
                treeData={categoryTreeData}
                placeholder="All tracked categories"
                value={categoryId}
                onChange={(value) => onCategoryChange(value || undefined)}
            />
        </div>

        <div className={styles.filterGroup}>
            <label className={styles.label} htmlFor="changes-window-filter">
                Window
            </label>
            <AppSelect
                ariaLabel="Window"
                className={styles.select}
                id="changes-window-filter"
                options={RUN_CHANGE_WINDOW_OPTIONS}
                value={String(windowDays)}
                onChange={(value) => onWindowDaysChange(Number(value ?? "7"))}
            />
        </div>

        <div className={styles.filterGroup}>
            <label className={styles.label} htmlFor="changes-page-size">
                Page size
            </label>
            <AppSelect
                ariaLabel="Page size"
                className={styles.select}
                id="changes-page-size"
                options={RUN_PAGE_SIZE_OPTIONS}
                value={String(pageSize)}
                onChange={(value) => onPageSizeChange(value ?? "25")}
            />
        </div>

        <AppButton htmlType="button" intent="secondary" size="large" onClick={onReset}>
            Reset all filters
        </AppButton>
    </div>
);
