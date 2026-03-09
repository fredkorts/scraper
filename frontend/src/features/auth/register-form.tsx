import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { AppInput } from "../../components/app-input/AppInput";
import { getFieldA11yProps, getFieldErrorProps } from "../../shared/forms/a11y";
import { useRegisterMutation } from "./mutations";
import { registerFormSchema, type RegisterFormValues } from "./schemas";
import styles from "./AuthForm.module.scss";

export const RegisterForm = () => {
    const formId = "register";
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
                <AppInput
                    className={styles.input}
                    id="name"
                    autoComplete="name"
                    {...getFieldA11yProps({
                        formId,
                        fieldName: "name",
                        hasError: Boolean(errors.name),
                    })}
                    {...register("name")}
                />
                {errors.name ? (
                    <p {...getFieldErrorProps(formId, "name")} className={styles.error}>
                        {errors.name.message}
                    </p>
                ) : null}
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
                    {...getFieldA11yProps({
                        formId,
                        fieldName: "email",
                        hasError: Boolean(errors.email),
                    })}
                    {...register("email")}
                />
                {errors.email ? (
                    <p {...getFieldErrorProps(formId, "email")} className={styles.error}>
                        {errors.email.message}
                    </p>
                ) : null}
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
                    {...getFieldA11yProps({
                        formId,
                        fieldName: "password",
                        hasError: Boolean(errors.password),
                    })}
                    {...register("password")}
                />
                {errors.password ? (
                    <p {...getFieldErrorProps(formId, "password")} className={styles.error}>
                        {errors.password.message}
                    </p>
                ) : null}
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
