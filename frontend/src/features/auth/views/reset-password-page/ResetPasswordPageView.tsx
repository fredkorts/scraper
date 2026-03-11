import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { AppInput } from "../../../../components/app-input/AppInput";
import { getFieldA11yProps, getFieldErrorProps } from "../../../../shared/forms/a11y";
import formStyles from "../../AuthForm.module.scss";
import { useResetPasswordMutation } from "../../mutations";
import { resetPasswordFormSchema, type ResetPasswordFormValues } from "../../schemas";
import styles from "../auth-page-view.module.scss";

export const ResetPasswordPageView = () => {
    const formId = "reset-password";
    const search = useSearch({ from: "/reset-password" });
    const navigate = useNavigate({ from: "/reset-password" });
    const mutation = useResetPasswordMutation();
    const [token] = useState<string | null>(() =>
        typeof search.token === "string" && search.token.length > 0 ? search.token : null,
    );

    const form = useForm<ResetPasswordFormValues>({
        resolver: zodResolver(resetPasswordFormSchema),
        defaultValues: {
            password: "",
            confirmPassword: "",
        },
    });

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

    const onSubmit = async (values: ResetPasswordFormValues) => {
        if (!token) {
            return;
        }

        await mutation.mutateAsync({
            token,
            password: values.password,
        });
        await navigate({ to: "/login" });
    };

    return (
        <main className={styles.page}>
            <h1 className={styles.heading}>Reset password</h1>
            <p className={styles.subheading}>Set a new password for your account.</p>
            {!token ? <p>Reset token is missing or invalid.</p> : null}
            <form className={formStyles.form} onSubmit={form.handleSubmit(onSubmit)} noValidate>
                <div className={formStyles.field}>
                    <label className={formStyles.label} htmlFor="password">
                        New password
                    </label>
                    <AppInput
                        className={formStyles.input}
                        id="password"
                        type="password"
                        autoComplete="new-password"
                        {...getFieldA11yProps({
                            formId,
                            fieldName: "password",
                            hasError: Boolean(form.formState.errors.password),
                        })}
                        {...form.register("password")}
                    />
                    {form.formState.errors.password ? (
                        <p {...getFieldErrorProps(formId, "password")} className={formStyles.error}>
                            {form.formState.errors.password.message}
                        </p>
                    ) : null}
                </div>
                <div className={formStyles.field}>
                    <label className={formStyles.label} htmlFor="confirm-password">
                        Confirm password
                    </label>
                    <AppInput
                        className={formStyles.input}
                        id="confirm-password"
                        type="password"
                        autoComplete="new-password"
                        {...getFieldA11yProps({
                            formId,
                            fieldName: "confirm-password",
                            hasError: Boolean(form.formState.errors.confirmPassword),
                        })}
                        {...form.register("confirmPassword")}
                    />
                    {form.formState.errors.confirmPassword ? (
                        <p {...getFieldErrorProps(formId, "confirm-password")} className={formStyles.error}>
                            {form.formState.errors.confirmPassword.message}
                        </p>
                    ) : null}
                </div>
                <div className={formStyles.actions}>
                    <button type="submit" disabled={mutation.isPending || !token}>
                        {mutation.isPending ? "Resetting..." : "Reset password"}
                    </button>
                </div>
                {mutation.error ? <p className={formStyles.error}>{mutation.error.message}</p> : null}
            </form>
            <p>
                Back to <Link to="/login">sign in</Link>
            </p>
        </main>
    );
};
