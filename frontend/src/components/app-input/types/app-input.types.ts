import type { InputProps } from "antd";

export interface AppInputProps extends Omit<InputProps, "size" | "ref"> {
    ariaLabel?: string;
    size?: InputProps["size"];
}
