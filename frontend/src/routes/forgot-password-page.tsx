import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { useForgotPasswordMutation } from "../features/auth/mutations";
import { forgotPasswordFormSchema, type ForgotPasswordFormValues } from "../features/auth/schemas";
import styles from "./Page.module.scss";

export const ForgotPasswordPage = () => {
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

            <form onSubmit={form.handleSubmit(onSubmit)}>
                <label htmlFor="forgot-email">Email</label>
                <input id="forgot-email" type="email" autoComplete="email" {...form.register("email")} />
                {form.formState.errors.email ? <p>{form.formState.errors.email.message}</p> : null}
                <button type="submit" disabled={mutation.isPending}>
                    {mutation.isPending ? "Sending..." : "Send reset link"}
                </button>
                {mutation.isSuccess ? <p>If the account exists, a reset link has been sent.</p> : null}
                {mutation.error ? <p>{mutation.error.message}</p> : null}
            </form>
            <p>
                Back to <Link to="/login">sign in</Link>
            </p>
        </main>
    );
};
