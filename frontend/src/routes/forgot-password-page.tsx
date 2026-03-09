import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { AppInput } from "../components/app-input/AppInput";
import formStyles from "../features/auth/AuthForm.module.scss";
import { useForgotPasswordMutation } from "../features/auth/mutations";
import { forgotPasswordFormSchema, type ForgotPasswordFormValues } from "../features/auth/schemas";
import { getFieldA11yProps, getFieldErrorProps } from "../shared/forms/a11y";
import styles from "./Page.module.scss";

export const ForgotPasswordPage = () => {
    const formId = "forgot-password";
    const mutation = useForgotPasswordMutation();
    const form = useForm<ForgotPasswordFormValues>({
        resolver: zodResolver(forgotPasswordFormSchema),
        defaultValues: {
            email: "",
        },
    });

    const onSubmit = async (values: ForgotPasswordFormValues) => {
        await mutation.mutateAsync({
            email: values.email,
        });
    };

    return (
        <main className={styles.page}>
            <h1 className={styles.heading}>Forgot password</h1>
            <p className={styles.subheading}>Enter your account email to receive a reset link.</p>

            <form className={formStyles.form} onSubmit={form.handleSubmit(onSubmit)} noValidate>
                <div className={formStyles.field}>
                    <label className={formStyles.label} htmlFor="forgot-email">
                        Email
                    </label>
                    <AppInput
                        className={formStyles.input}
                        id="forgot-email"
                        type="email"
                        autoComplete="email"
                        {...getFieldA11yProps({
                            formId,
                            fieldName: "email",
                            hasError: Boolean(form.formState.errors.email),
                        })}
                        {...form.register("email")}
                    />
                    {form.formState.errors.email ? (
                        <p {...getFieldErrorProps(formId, "email")} className={formStyles.error}>
                            {form.formState.errors.email.message}
                        </p>
                    ) : null}
                </div>
                <div className={formStyles.actions}>
                    <button type="submit" disabled={mutation.isPending}>
                        {mutation.isPending ? "Sending..." : "Send reset link"}
                    </button>
                </div>
                {mutation.isSuccess ? <p>If the account exists, a reset link has been sent.</p> : null}
                {mutation.error ? <p className={formStyles.error}>{mutation.error.message}</p> : null}
            </form>
            <p>
                Back to <Link to="/login">sign in</Link>
            </p>
        </main>
    );
};
