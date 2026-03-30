import { CategoryCascader } from "../../../components/category-cascader/CategoryCascader";
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
    <CategoryCascader
        allowClear={allowClear}
        ariaLabel={ariaLabel}
        className={className}
        disabled={disabled}
        id={id}
        placeholder={placeholder}
        treeData={treeData}
        value={value}
        onChange={onChange}
    />
);
