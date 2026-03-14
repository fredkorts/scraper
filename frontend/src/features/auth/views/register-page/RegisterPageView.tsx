import { Link } from "@tanstack/react-router";
import { AppButton } from "../../../../components/app-button/AppButton";
import { GoogleIcon } from "../../../../components/google-icon/GoogleIcon";
import { googleOAuthEnabled, googleOAuthStartUrl } from "../../../../lib/api/config";
import { RegisterForm } from "../../register-form";
import styles from "../auth-page-view.module.scss";

export const RegisterPageView = () => (
    <main className={styles.page}>
        <h1 className={styles.heading}>Create account</h1>
        <p className={styles.subheading}>Start with free category tracking and 6-hour digest updates.</p>
        {googleOAuthEnabled ? (
            <div className={styles.actions}>
                <AppButton href={googleOAuthStartUrl} intent="secondary" icon={<GoogleIcon />}>
                    Continue with Google
                </AppButton>
            </div>
        ) : null}
        <RegisterForm />
        <p>
            Already registered? <Link to="/login">Log in</Link>
        </p>
    </main>
);
