import { Link, useRouterState } from "@tanstack/react-router";
import { AppButton } from "../../../../components/app-button/AppButton";
import { GoogleIcon } from "../../../../components/google-icon/GoogleIcon";
import { googleOAuthEnabled, googleOAuthStartUrl } from "../../../../lib/api/config";
import { LoginForm } from "../../login-form";
import styles from "../auth-page-view.module.scss";

const OAUTH_ERROR_MESSAGE_BY_CODE: Record<string, string> = {
    auth_failed: "Google sign-in failed. Please try again.",
    account_inactive: "This account is inactive.",
    account_action_required: "Account action is required before Google sign-in.",
    account_restricted: "Google sign-in is not available for this account.",
    additional_auth_required: "Additional authentication is required before Google sign-in.",
};

export const LoginPageView = () => {
    const locationHref = useRouterState({
        select: (state) => state.location.href,
    });
    const oauthErrorCode = new URL(`http://localhost${locationHref}`).searchParams.get("oauthError");
    const oauthErrorMessage =
        typeof oauthErrorCode === "string" ? OAUTH_ERROR_MESSAGE_BY_CODE[oauthErrorCode] : undefined;

    return (
        <main className={styles.page}>
            <h1 className={styles.heading}>Sign in</h1>
            <p className={styles.subheading}>Use your Mabrik Scraper account credentials.</p>
            {oauthErrorMessage ? <p className={styles.errorMessage}>{oauthErrorMessage}</p> : null}
            {googleOAuthEnabled ? (
                <div className={styles.actions}>
                    <AppButton href={googleOAuthStartUrl} intent="secondary" icon={<GoogleIcon />}>
                        Continue with Google
                    </AppButton>
                </div>
            ) : null}
            <LoginForm />
            <p>
                Need an account? <Link to="/register">Register</Link>
            </p>
        </main>
    );
};
