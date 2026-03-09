export interface AppHeaderMenuProps {
    userName?: string;
    isDarkMode: boolean;
    onToggleTheme: () => void;
    onLogout: () => void;
    isLogoutPending?: boolean;
}
