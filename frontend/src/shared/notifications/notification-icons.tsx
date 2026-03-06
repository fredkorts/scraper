import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    InfoCircleOutlined,
    WarningOutlined,
} from "@ant-design/icons";
import type { ReactElement } from "react";
import type { AppNotificationVariant } from "./types/notification.types";

export const NOTIFICATION_ICON_COMPONENT_BY_VARIANT: Record<
    AppNotificationVariant,
    () => ReactElement
> = {
    success: () => <CheckCircleOutlined />,
    error: () => <CloseCircleOutlined />,
    info: () => <InfoCircleOutlined />,
    warning: () => <WarningOutlined />,
};

export const getNotificationIcon = (variant: AppNotificationVariant): ReactElement => {
    return NOTIFICATION_ICON_COMPONENT_BY_VARIANT[variant]();
};
