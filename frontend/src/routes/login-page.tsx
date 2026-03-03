import { Link } from "@tanstack/react-router";
import { LoginForm } from "../features/auth/login-form";
import styles from "./Page.module.scss";

export const LoginPage = () => (
    <main className={styles.page}>
        <h1 className={styles.heading}>Sign in</h1>
        <p className={styles.subheading}>Use your Mabrik Scraper account credentials.</p>
        <LoginForm />
        <p>
            Need an account? <Link to="/register">Register</Link>
        </p>
    </main>
);
