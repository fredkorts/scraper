import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { AppInput } from "../../components/app-input/AppInput";
import { useRegisterMutation } from "./mutations";
import { registerFormSchema, type RegisterFormValues } from "./schemas";
import styles from "./AuthForm.module.scss";

export const RegisterForm = () => {
    const navigate = useNavigate();
    const registerMutation = useRegisterMutation();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<RegisterFormValues>({
        resolver: zodResolver(registerFormSchema),
        defaultValues: {
            email: "",
            password: "",
            name: "",
        },
    });

    const onSubmit = async (values: RegisterFormValues) => {
        await registerMutation.mutateAsync(values);
        await navigate({ to: "/app" });
    };

    return (
        <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className={styles.field}>
                <label className={styles.label} htmlFor="name">
                    Name
                </label>
                <AppInput className={styles.input} id="name" autoComplete="name" {...register("name")} />
                {errors.name ? <p className={styles.error}>{errors.name.message}</p> : null}
            </div>

            <div className={styles.field}>
                <label className={styles.label} htmlFor="email">
                    Email
                </label>
                <AppInput
                    className={styles.input}
                    id="email"
                    type="email"
                    autoComplete="email"
                    {...register("email")}
                />
                {errors.email ? <p className={styles.error}>{errors.email.message}</p> : null}
            </div>

            <div className={styles.field}>
                <label className={styles.label} htmlFor="password">
                    Password
                </label>
                <AppInput
                    className={styles.input}
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    {...register("password")}
                />
                {errors.password ? <p className={styles.error}>{errors.password.message}</p> : null}
            </div>

            <div className={styles.actions}>
                <button type="submit" disabled={registerMutation.isPending}>
                    {registerMutation.isPending ? "Creating account..." : "Create account"}
                </button>
                {registerMutation.error ? <p className={styles.error}>{registerMutation.error.message}</p> : null}
            </div>
        </form>
    );
};
