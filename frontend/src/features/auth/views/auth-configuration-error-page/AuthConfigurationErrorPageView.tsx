import { Link } from "@tanstack/react-router";
import styles from "../auth-page-view.module.scss";

export const AuthConfigurationErrorPageView = () => (
    <main className={styles.page}>
        <h1 className={styles.heading}>Authentication configuration error</h1>
        <p className={styles.subheading}>
            Sign-in could not be completed because the frontend origin is not allowed by the API configuration.
        </p>
        <p className={styles.errorMessage} role="alert">
            Check `FRONTEND_ORIGINS` on the backend and `VITE_API_BASE_URL` on the frontend.
        </p>
        <div className={styles.actions}>
            <Link to="/login">Back to sign in</Link>
            <Link to="/">Go to landing page</Link>
        </div>
    </main>
);
