export interface AppThemeSwitchProps {
    isDarkMode: boolean;
    disabled?: boolean;
    ariaLabel?: string;
    onToggle: (nextIsDarkMode: boolean) => void;
}
