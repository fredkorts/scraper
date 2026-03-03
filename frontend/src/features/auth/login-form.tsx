import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { useLoginMutation } from "./mutations";
import { loginFormSchema, type LoginFormValues } from "./schemas";
import styles from "./AuthForm.module.scss";

export const LoginForm = () => {
    const navigate = useNavigate();
    const loginMutation = useLoginMutation();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormValues>({
        resolver: zodResolver(loginFormSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    const onSubmit = async (values: LoginFormValues) => {
        await loginMutation.mutateAsync(values);
        await navigate({ to: "/app" });
    };

    return (
        <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className={styles.field}>
                <label className={styles.label} htmlFor="email">
                    Email
                </label>
                <input className={styles.input} id="email" type="email" autoComplete="email" {...register("email")} />
                {errors.email ? <p className={styles.error}>{errors.email.message}</p> : null}
            </div>

            <div className={styles.field}>
                <label className={styles.label} htmlFor="password">
                    Password
                </label>
                <input
                    className={styles.input}
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    {...register("password")}
                />
                {errors.password ? <p className={styles.error}>{errors.password.message}</p> : null}
            </div>

            <div className={styles.actions}>
                <button type="submit" disabled={loginMutation.isPending}>
                    {loginMutation.isPending ? "Signing in..." : "Sign in"}
                </button>
                {loginMutation.error ? <p className={styles.error}>{loginMutation.error.message}</p> : null}
            </div>
        </form>
    );
};
