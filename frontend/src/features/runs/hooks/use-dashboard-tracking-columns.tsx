import { CloseCircleOutlined } from "@ant-design/icons";
import { Tooltip, Popconfirm } from "antd";
import { Link } from "@tanstack/react-router";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { AppButton } from "../../../components/app-button/AppButton";
import { defaultProductHistoryControls } from "../../products";
import { defaultRunsListSearch } from "../search";
import { formatLastChangeLabel } from "../formatters";
import type { DashboardTrackingRow } from "../types/dashboard-sections.types";
import type { UseDashboardTrackingColumnsOptions } from "../types/use-dashboard-tracking-columns.types";
import styles from "./use-dashboard-tracking-columns.module.scss";

const columnHelper = createColumnHelper<DashboardTrackingRow>();

const toTypeLabel = (value: DashboardTrackingRow["type"]) => (value === "category" ? "Category" : "Product");

export const useDashboardTrackingColumns = ({ pendingRowId, onUntrack }: UseDashboardTrackingColumnsOptions) =>
    useMemo(
        () =>
            [
                columnHelper.accessor("type", {
                    header: "Type",
                    cell: (info) => toTypeLabel(info.getValue()),
                }),
                columnHelper.accessor("name", {
                    header: "Name",
                    cell: (info) => {
                        const row = info.row.original;

                        if (row.type === "product" && row.productId) {
                            return (
                                <Link
                                    params={{ productId: row.productId }}
                                    search={defaultProductHistoryControls}
                                    to="/app/products/$productId"
                                >
                                    {row.name}
                                </Link>
                            );
                        }

                        if (row.type === "category" && row.categoryId) {
                            return (
                                <Link
                                    search={{
                                        ...defaultRunsListSearch,
                                        categoryId: row.categoryId,
                                    }}
                                    to="/app/runs"
                                >
                                    {row.name}
                                </Link>
                            );
                        }

                        return row.name;
                    },
                }),
                columnHelper.accessor("lastChangeAt", {
                    header: "Last Change",
                    cell: (info) => formatLastChangeLabel(info.getValue()),
                }),
                columnHelper.display({
                    id: "actions",
                    header: "Actions",
                    cell: (info) => {
                        const row = info.row.original;
                        const isPending = pendingRowId === row.rowId;
                        const ariaLabel =
                            row.type === "category"
                                ? `Cancel category tracking for ${row.name}`
                                : `Cancel product tracking for ${row.name}`;
                        const confirmTitle =
                            row.type === "category"
                                ? `Stop tracking category "${row.name}"?`
                                : `Stop tracking product "${row.name}"?`;
                        const confirmDescription =
                            row.type === "category"
                                ? "Tracked products reachable only through this category may be auto-disabled."
                                : "You can track this product again later.";

                        return (
                            <Popconfirm
                                title={confirmTitle}
                                description={confirmDescription}
                                okText="Yes"
                                cancelText="No"
                                onConfirm={() => void onUntrack(row)}
                            >
                                <Tooltip title="Cancel tracking">
                                    <AppButton
                                        aria-label={ariaLabel}
                                        className={styles.cancelTrackingButton}
                                        icon={<CloseCircleOutlined aria-hidden />}
                                        intent="danger"
                                        size="small"
                                        disabled={isPending}
                                    />
                                </Tooltip>
                            </Popconfirm>
                        );
                    },
                }),
            ] satisfies Array<ColumnDef<DashboardTrackingRow, unknown>>,
        [onUntrack, pendingRowId],
    );
