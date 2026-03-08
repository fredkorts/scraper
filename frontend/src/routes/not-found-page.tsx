import { Link } from "@tanstack/react-router";
import styles from "./Page.module.scss";

export const NotFoundPage = () => (
    <main className={styles.page}>
        <h1 className={styles.heading}>Page not found</h1>
        <p className={styles.subheading}>The page you requested does not exist or has moved.</p>
        <div className={styles.actions}>
            <Link to="/">Go to landing page</Link>
            <Link to="/app">Go to dashboard</Link>
        </div>
    </main>
);
