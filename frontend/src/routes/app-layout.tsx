import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useMeQuery } from "../features/auth/queries";
import { useLogoutMutation } from "../features/auth/mutations";
import { defaultDashboardHomeSearch, defaultRunsListSearch } from "../features/runs/search";
import { defaultSettingsSearch } from "../features/settings/search";
import styles from "./app-layout.module.scss";

export const AppLayout = () => {
    const navigate = useNavigate();
    const logoutMutation = useLogoutMutation();
    const session = useMeQuery();

    const onLogout = async () => {
        await logoutMutation.mutateAsync();
        await navigate({ to: "/login" });
    };

    return (
        <div className={styles.shell}>
            <header className={styles.header}>
                <span className={styles.brand}>Mabrik Dashboard</span>
                <nav className={styles.nav} aria-label="Main">
                    <Link search={defaultDashboardHomeSearch} to="/app">
                        Home
                    </Link>
                    <Link search={defaultRunsListSearch} to="/app/runs">
                        Runs
                    </Link>
                    <Link search={defaultSettingsSearch} to="/app/settings">
                        Settings
                    </Link>
                </nav>
                <div className={styles.actions}>
                    <span>{session.data?.name ?? "User"}</span>
                    <button onClick={() => void onLogout()} disabled={logoutMutation.isPending}>
                        {logoutMutation.isPending ? "Signing out..." : "Log out"}
                    </button>
                </div>
            </header>
            <Outlet />
        </div>
    );
};
