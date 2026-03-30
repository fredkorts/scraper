import { Cascader } from "antd";
import { useMemo } from "react";

interface CategoryCascaderOption {
    value: string;
    title: string;
    disabled?: boolean;
    children?: CategoryCascaderOption[];
}

interface CascaderOption {
    value: string;
    label: string;
    disabled?: boolean;
    children?: CascaderOption[];
}

export interface CategoryCascaderProps {
    ariaLabel: string;
    className?: string;
    disabled?: boolean;
    id?: string;
    treeData: CategoryCascaderOption[];
    placeholder?: string;
    value?: string;
    allowClear?: boolean;
    onChange: (value: string | undefined) => void;
}

const mapToCascaderOptions = (
    nodes: CategoryCascaderOption[],
    valuePathByCategoryId: Map<string, string[]>,
    parentPath: string[] = [],
): CascaderOption[] =>
    nodes.map((node) => {
        const currentPath = [...parentPath, node.value];
        valuePathByCategoryId.set(node.value, currentPath);

        return {
            value: node.value,
            label: node.title,
            disabled: node.disabled,
            children:
                node.children && node.children.length > 0
                    ? mapToCascaderOptions(node.children, valuePathByCategoryId, currentPath)
                    : undefined,
        };
    });

const filterPathByLabel = (inputValue: string, path: CascaderOption[]): boolean => {
    const normalizedInput = inputValue.trim().toLocaleLowerCase();

    if (!normalizedInput) {
        return true;
    }

    return path.some((option) => option.label.toLocaleLowerCase().includes(normalizedInput));
};

export const CategoryCascader = ({
    ariaLabel,
    className,
    disabled,
    id,
    treeData,
    placeholder,
    value,
    allowClear = false,
    onChange,
}: CategoryCascaderProps) => {
    const { options, valuePathByCategoryId } = useMemo(() => {
        const paths = new Map<string, string[]>();

        return {
            options: mapToCascaderOptions(treeData, paths),
            valuePathByCategoryId: paths,
        };
    }, [treeData]);

    const selectedPath = value ? valuePathByCategoryId.get(value) : undefined;

    return (
        <Cascader
            allowClear={allowClear}
            aria-label={ariaLabel}
            changeOnSelect
            className={className}
            disabled={disabled}
            id={id}
            options={options}
            placeholder={placeholder}
            popupMatchSelectWidth={false}
            showSearch={{ filter: filterPathByLabel }}
            size="large"
            value={selectedPath}
            onChange={(nextValue) => {
                if (!Array.isArray(nextValue) || nextValue.length === 0) {
                    onChange(undefined);
                    return;
                }

                const selectedCategoryId = nextValue[nextValue.length - 1];
                onChange(typeof selectedCategoryId === "string" ? selectedCategoryId : undefined);
            }}
        />
    );
};
