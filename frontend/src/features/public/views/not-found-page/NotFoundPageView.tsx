import { Link } from "@tanstack/react-router";
import styles from "../public-page-view.module.scss";

export const NotFoundPageView = () => (
    <main className={styles.page}>
        <h1 className={styles.heading}>Page not found</h1>
        <p className={styles.subheading}>The page you requested does not exist or has moved.</p>
        <div className={styles.actions}>
            <Link to="/">Go to landing page</Link>
            <Link to="/app">Go to dashboard</Link>
        </div>
    </main>
);
