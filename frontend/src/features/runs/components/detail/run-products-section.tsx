import { AppSelect } from "../../../../components/app-select/AppSelect";
import { DataTable } from "../../../../components/data-table/DataTable";
import { PaginationControls } from "../../../../components/pagination/PaginationControls";
import { TableSearchInput } from "../../../../components/table-search-input/TableSearchInput";
import { TABLE_SEARCH_QUERY_MAX_LENGTH } from "../../../../shared/search/query";
import { RUN_PRODUCT_STOCK_FILTER_OPTIONS } from "../../constants/run-filters.constants";
import styles from "./run-detail-sections.module.scss";
import type { RunProductsSectionProps } from "../../types/run-detail-sections.types";

export const RunProductsSection = ({
    errorMessage,
    isFetching,
    isLoading,
    page,
    pageSize,
    productColumns,
    products,
    productsInStock,
    query,
    onRowClick,
    isRowClickable,
    onPageChange,
    onQueryChange,
    onProductsStockChange,
}: RunProductsSectionProps) => (
    <section aria-labelledby="products-heading" className={styles.section}>
        <div className={[styles.sectionHeader, styles.stackedSectionHeader].join(" ")}>
            <h2 className={styles.sectionTitle} id="products-heading">
                Product Snapshots
            </h2>
            <div className={styles.filterRow}>
                <div className={[styles.filterGroup, styles.searchFilterGroup].join(" ")}>
                    <label className={styles.label} htmlFor="run-products-search-filter">
                        Search
                    </label>
                    <TableSearchInput
                        id="run-products-search-filter"
                        ariaLabel="Search product snapshots"
                        placeholder="Search product snapshots"
                        value={query}
                        maxLength={TABLE_SEARCH_QUERY_MAX_LENGTH}
                        onChange={onQueryChange}
                    />
                </div>
                <div className={styles.filterTrailingGroup}>
                    <div className={styles.filterGroup}>
                        <label className={styles.label} htmlFor="stock-filter">
                            Stock filter
                        </label>
                        <AppSelect
                            allowClear
                            ariaLabel="Stock filter"
                            className={styles.select}
                            id="stock-filter"
                            options={RUN_PRODUCT_STOCK_FILTER_OPTIONS}
                            placeholder="All stock states"
                            value={productsInStock}
                            onChange={(value) => onProductsStockChange(value || undefined)}
                        />
                    </div>
                </div>
            </div>
        </div>

        {errorMessage ? (
            <p className={styles.errorState} role="alert">
                {errorMessage}
            </p>
        ) : products ? (
            <>
                {products.items.length === 0 ? (
                    <p className={styles.emptyState}>No product snapshots matched the current filter.</p>
                ) : (
                    <DataTable
                        columns={productColumns}
                        data={products.items}
                        onRowClick={onRowClick}
                        isRowClickable={isRowClickable}
                    />
                )}
                <PaginationControls
                    page={page}
                    pageSize={pageSize}
                    totalPages={products.totalPages}
                    totalItems={products.totalItems}
                    ariaLabel="Run products pagination"
                    isLoading={isFetching}
                    onPageChange={onPageChange}
                />
            </>
        ) : isLoading ? (
            <p className={styles.emptyState}>Loading product snapshots...</p>
        ) : (
            <p className={styles.emptyState}>Loading product snapshots...</p>
        )}
    </section>
);
