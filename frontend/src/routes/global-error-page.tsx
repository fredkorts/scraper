import { Link } from "@tanstack/react-router";
import { AppButton } from "../components/app-button/AppButton";
import styles from "./Page.module.scss";

interface GlobalErrorPageProps {
    error: unknown;
    onRetry: () => void;
}

const toMessage = (error: unknown): string => {
    if (error instanceof Error && error.message.trim().length > 0) {
        return error.message;
    }

    return "An unexpected error occurred.";
};

export const GlobalErrorPage = ({ error, onRetry }: GlobalErrorPageProps) => (
    <main className={styles.page}>
        <h1 className={styles.heading}>Something went wrong</h1>
        <p className={styles.subheading}>
            The app hit an unexpected error. Try reloading this view or return to a stable page.
        </p>
        <p className={styles.errorMessage} role="alert">
            {toMessage(error)}
        </p>
        <div className={styles.actions}>
            <AppButton intent="secondary" onClick={onRetry}>
                Retry
            </AppButton>
            <Link to="/app">Go to dashboard</Link>
            <Link to="/">Go to landing page</Link>
        </div>
    </main>
);
