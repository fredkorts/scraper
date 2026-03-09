import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useMeQuery } from "../features/auth/queries";
import { useLogoutMutation } from "../features/auth/mutations";
import { subscribeAuthEvents } from "../features/auth/auth-events";
import { defaultDashboardHomeSearch } from "../features/runs/search";
import { queryKeys } from "../lib/query/query-keys";
import { NOTIFICATION_MESSAGES } from "../shared/constants/notification-messages";
import { useAppNotification } from "../shared/hooks/use-app-notification";
import { normalizeUserError } from "../shared/utils/normalize-user-error";
import { PricePulseLogo } from "../components/price-pulse-logo/PricePulseLogo";
import { AppHeaderMenu } from "../components/app-header-menu/AppHeaderMenu";
import { useAppTheme } from "../app/theme/context/app-theme-context";
import styles from "./app-layout.module.scss";

export const AppLayout = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const logoutMutation = useLogoutMutation();
    const session = useMeQuery();
    const theme = useAppTheme();
    const { notify } = useAppNotification();

    useEffect(() => {
        const unsubscribe = subscribeAuthEvents(() => {
            queryClient.setQueryData(queryKeys.auth.me(), null);
            queryClient.removeQueries();
            void navigate({ to: "/login" });
        });

        return unsubscribe;
    }, [navigate, queryClient]);

    const onLogout = async () => {
        try {
            await logoutMutation.mutateAsync();
            await navigate({ to: "/login" });
        } catch (error) {
            notify({
                variant: "error",
                message: NOTIFICATION_MESSAGES.session.logoutFailed.message,
                description: normalizeUserError(error, "Failed to sign out"),
                key: "session:logout",
            });
        }
    };

    return (
        <div className={styles.shell}>
            <header className={styles.header}>
                <Link className={styles.logoLink} search={defaultDashboardHomeSearch} to="/app">
                    <PricePulseLogo />
                </Link>
                <div className={styles.actions}>
                    <AppHeaderMenu
                        isDarkMode={theme.isDarkMode}
                        isLogoutPending={logoutMutation.isPending}
                        userName={session.data?.name}
                        onLogout={() => void onLogout()}
                        onToggleTheme={() => theme.setDarkMode(!theme.isDarkMode)}
                    />
                </div>
            </header>
            <main className={styles.main} id="app-main">
                <Outlet />
            </main>
        </div>
    );
};
