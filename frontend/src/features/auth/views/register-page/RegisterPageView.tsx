import { Link } from "@tanstack/react-router";
import { RegisterForm } from "../../register-form";
import styles from "../auth-page-view.module.scss";

export const RegisterPageView = () => (
    <main className={styles.page}>
        <h1 className={styles.heading}>Create account</h1>
        <p className={styles.subheading}>Start with free category tracking and 6-hour digest updates.</p>
        <RegisterForm />
        <p>
            Already registered? <Link to="/login">Log in</Link>
        </p>
    </main>
);
