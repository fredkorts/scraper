import { TreeSelect } from "antd";
import type { CategoryTreeSelectProps } from "../types/category-tree-select-props";

export const CategoryTreeSelect = ({
    ariaLabel,
    className,
    disabled,
    id,
    treeData,
    placeholder,
    value,
    allowClear = false,
    onChange,
}: CategoryTreeSelectProps) => (
    <TreeSelect
        allowClear={allowClear}
        aria-label={ariaLabel}
        className={className}
        disabled={disabled}
        id={id}
        placeholder={placeholder}
        popupMatchSelectWidth={false}
        showSearch
        size="large"
        treeData={treeData}
        treeDefaultExpandAll
        treeNodeFilterProp="title"
        value={value}
        onChange={(nextValue) => onChange(nextValue)}
    />
);
