import { Link } from "@tanstack/react-router";
import styles from "../public-page-view.module.scss";

export const LandingPageView = () => (
    <main className={styles.page}>
        <h1 className={styles.heading}>Track Mabrik products with less noise</h1>
        <p className={styles.subheading}>
            Monitor category changes, spot price movement quickly, and choose how alerts are delivered.
        </p>
        <div className={styles.actions}>
            <Link to="/login">Log in</Link>
            <Link to="/register">Create account</Link>
        </div>
    </main>
);
