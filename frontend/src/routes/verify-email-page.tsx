import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useVerifyEmailMutation } from "../features/auth/mutations";
import styles from "./Page.module.scss";

export const VerifyEmailPage = () => {
    const search = useSearch({ from: "/verify-email" });
    const navigate = useNavigate({ from: "/verify-email" });
    const mutation = useVerifyEmailMutation();
    const [token] = useState<string | null>(() =>
        typeof search.token === "string" && search.token.length > 0 ? search.token : null,
    );

    useEffect(() => {
        if (typeof search.token === "string" && search.token.length > 0) {
            void navigate({
                to: ".",
                replace: true,
                search: {
                    token: undefined,
                },
            });
        }
    }, [navigate, search.token]);

    useEffect(() => {
        if (!token || mutation.isPending || mutation.isSuccess) {
            return;
        }

        mutation.mutate({
            token,
        });
    }, [mutation, token]);

    return (
        <main className={styles.page}>
            <h1 className={styles.heading}>Verify email</h1>
            <p className={styles.subheading}>Confirming your account email.</p>
            {!token ? <p>Verification token is missing or invalid.</p> : null}
            {mutation.isPending ? <p>Verifying...</p> : null}
            {mutation.isSuccess ? <p>Email verified. You can continue using your account.</p> : null}
            {mutation.error ? <p>{mutation.error.message}</p> : null}
            <p>
                Back to <Link to="/login">sign in</Link>
            </p>
        </main>
    );
};
