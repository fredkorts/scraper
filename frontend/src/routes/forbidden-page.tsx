import { Link } from "@tanstack/react-router";
import styles from "./Page.module.scss";

export const ForbiddenPage = () => (
    <main className={styles.page}>
        <h1 className={styles.heading}>Access denied</h1>
        <p className={styles.subheading}>You do not have permission to view this page.</p>
        <div className={styles.actions}>
            <Link to="/app">Back to dashboard</Link>
            <Link to="/login">Sign in as another account</Link>
        </div>
    </main>
);
