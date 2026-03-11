import { Link } from "@tanstack/react-router";
import { LoginForm } from "../../login-form";
import styles from "../auth-page-view.module.scss";

export const LoginPageView = () => (
    <main className={styles.page}>
        <h1 className={styles.heading}>Sign in</h1>
        <p className={styles.subheading}>Use your Mabrik Scraper account credentials.</p>
        <LoginForm />
        <p>
            Need an account? <Link to="/register">Register</Link>
        </p>
    </main>
);
