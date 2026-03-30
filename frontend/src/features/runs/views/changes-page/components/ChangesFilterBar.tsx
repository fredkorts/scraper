import { DownOutlined, UpOutlined } from "@ant-design/icons";
import { AppButton } from "../../../../../components/app-button/AppButton";
import { AppSelect } from "../../../../../components/app-select/AppSelect";
import { CategoryCascader } from "../../../../../components/category-cascader/CategoryCascader";
import { TableSearchInput } from "../../../../../components/table-search-input/TableSearchInput";
import { TABLE_SEARCH_QUERY_MAX_LENGTH } from "../../../../../shared/search/query";
import {
    RUN_CHANGE_TYPE_FILTER_OPTIONS,
    RUN_CHANGE_WINDOW_OPTIONS,
    RUN_PAGE_SIZE_OPTIONS,
    RUN_PREORDER_FILTER_OPTIONS,
} from "../../../constants/run-filters.constants";
import type { runChangeTypeValues } from "../../../search";
import type { CategoryTreeNode } from "../../../../categories";
import styles from "./changes-filter-bar.module.scss";

interface ChangesFilterBarProps {
    query: string;
    categoryId?: string;
    changeTypes: Array<(typeof runChangeTypeValues)[number]>;
    preorder: "all" | "only" | "exclude";
    windowDays: 1 | 7 | 30;
    pageSize: number;
    categoryTreeData: CategoryTreeNode[];
    isAdvancedOpen: boolean;
    activeAdvancedCount: number;
    onQueryChange: (value: string) => void;
    onCategoryChange: (value?: string) => void;
    onChangeTypeChange: (value: Array<(typeof runChangeTypeValues)[number]>) => void;
    onPreorderChange: (value: "all" | "only" | "exclude") => void;
    onWindowDaysChange: (value: 1 | 7 | 30) => void;
    onPageSizeChange: (value: number) => void;
    onToggleAdvanced: () => void;
    onReset: () => void;
}

export const ChangesFilterBar = ({
    query,
    categoryId,
    changeTypes,
    preorder,
    windowDays,
    pageSize,
    categoryTreeData,
    isAdvancedOpen,
    activeAdvancedCount,
    onQueryChange,
    onCategoryChange,
    onChangeTypeChange,
    onPreorderChange,
    onWindowDaysChange,
    onPageSizeChange,
    onToggleAdvanced,
    onReset,
}: ChangesFilterBarProps) => (
    <section className={styles.filterPanel}>
        <div className={styles.primaryRow}>
            <div className={[styles.filterGroup, styles.searchGroup].join(" ")}>
                <label className={styles.label} htmlFor="changes-query-filter">
                    Search
                </label>
                <TableSearchInput
                    id="changes-query-filter"
                    ariaLabel="Search change results"
                    placeholder="Search products, categories, or change type"
                    value={query}
                    maxLength={TABLE_SEARCH_QUERY_MAX_LENGTH}
                    onChange={onQueryChange}
                />
            </div>

            <div className={styles.primaryTrailing}>
                <div className={styles.filterGroup}>
                    <label className={styles.label} htmlFor="changes-change-type-filter">
                        Change type
                    </label>
                    <AppSelect
                        allowClear
                        ariaLabel="Change type"
                        className={styles.select}
                        id="changes-change-type-filter"
                        mode="multiple"
                        hideSelectionTags
                        options={RUN_CHANGE_TYPE_FILTER_OPTIONS}
                        placeholder="All change types"
                        value={changeTypes}
                        onChange={(value) =>
                            onChangeTypeChange(
                                value as Array<
                                    "price_increase" | "price_decrease" | "new_product" | "sold_out" | "back_in_stock"
                                >,
                            )
                        }
                    />
                </div>

                <div className={styles.filterGroup}>
                    <label className={styles.label} htmlFor="changes-category-filter">
                        Category
                    </label>
                    <CategoryCascader
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

                <AppButton
                    aria-controls="changes-advanced-filters"
                    aria-expanded={isAdvancedOpen}
                    htmlType="button"
                    icon={isAdvancedOpen ? <UpOutlined /> : <DownOutlined />}
                    intent="secondary"
                    size="large"
                    onClick={onToggleAdvanced}
                >
                    Advanced filters
                    {activeAdvancedCount > 0 ? ` (${activeAdvancedCount})` : ""}
                </AppButton>

                <AppButton htmlType="button" intent="secondary" size="large" onClick={onReset}>
                    Reset all filters
                </AppButton>
            </div>
        </div>

        {isAdvancedOpen ? (
            <div className={styles.advancedRow} id="changes-advanced-filters">
                <div className={styles.filterGroup}>
                    <label className={styles.label} htmlFor="changes-preorder-filter">
                        Preorder
                    </label>
                    <AppSelect
                        ariaLabel="Preorder"
                        className={styles.select}
                        id="changes-preorder-filter"
                        options={RUN_PREORDER_FILTER_OPTIONS}
                        value={preorder}
                        onChange={(value) => onPreorderChange((value as "all" | "only" | "exclude") || "all")}
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
                        onChange={(value) => onWindowDaysChange(Number(value ?? "7") as 1 | 7 | 30)}
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
                        onChange={(value) => onPageSizeChange(Number(value ?? "25"))}
                    />
                </div>
            </div>
        ) : null}
    </section>
);
