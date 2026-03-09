import {
    LogoutOutlined,
    MenuOutlined,
    MoonOutlined,
    SettingOutlined,
    SunOutlined,
    UserOutlined,
} from "@ant-design/icons";
import { Dropdown } from "antd";
import type { MenuProps } from "antd";
import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { defaultSettingsSearch } from "../../features/settings/search";
import { AppButton } from "../app-button/AppButton";
import type { AppHeaderMenuProps } from "./types/app-header-menu.types";
import styles from "./app-header-menu.module.scss";

export const AppHeaderMenu = ({
    userName,
    isDarkMode,
    onToggleTheme,
    onLogout,
    isLogoutPending = false,
}: AppHeaderMenuProps) => {
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const menuItems = useMemo<MenuProps["items"]>(
        () => [
            {
                key: "user",
                disabled: true,
                label: (
                    <span className={styles.userLabel}>
                        <UserOutlined aria-hidden="true" />
                        {userName ?? "User"}
                    </span>
                ),
            },
            { type: "divider" },
            {
                key: "settings",
                icon: <SettingOutlined aria-hidden="true" />,
                label: "Settings",
            },
            {
                key: "toggle-theme",
                icon: isDarkMode ? <MoonOutlined aria-hidden="true" /> : <SunOutlined aria-hidden="true" />,
                label: `Toggle theme (currently ${isDarkMode ? "Dark" : "Light"})`,
            },
            { type: "divider" },
            {
                key: "logout",
                danger: true,
                disabled: isLogoutPending,
                icon: <LogoutOutlined aria-hidden="true" />,
                label: isLogoutPending ? "Signing out..." : "Log out",
            },
        ],
        [isDarkMode, isLogoutPending, userName],
    );

    const onMenuClick: MenuProps["onClick"] = ({ key }) => {
        if (key === "settings") {
            setIsMenuOpen(false);
            void navigate({
                to: "/app/settings",
                search: defaultSettingsSearch,
            });
            return;
        }

        if (key === "toggle-theme") {
            setIsMenuOpen(false);
            onToggleTheme();
            return;
        }

        if (key === "logout") {
            setIsMenuOpen(false);
            onLogout();
        }
    };

    return (
        <Dropdown
            menu={{ items: menuItems, onClick: onMenuClick }}
            open={isMenuOpen}
            onOpenChange={setIsMenuOpen}
            trigger={["click"]}
        >
            <AppButton
                aria-expanded={isMenuOpen}
                aria-haspopup="menu"
                aria-label="Open account menu"
                className={styles.trigger}
                htmlType="button"
                icon={<MenuOutlined aria-hidden="true" />}
                intent="secondary"
                size="middle"
            >
                Menu
            </AppButton>
        </Dropdown>
    );
};
