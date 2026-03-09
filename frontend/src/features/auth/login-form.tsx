import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { AppInput } from "../../components/app-input/AppInput";
import { getFieldA11yProps, getFieldErrorProps } from "../../shared/forms/a11y";
import { useAppNotification } from "../../shared/hooks/use-app-notification";
import { normalizeUserError } from "../../shared/utils/normalize-user-error";
import { useLoginMutation, useVerifyMfaLoginMutation } from "./mutations";
import { loginFormSchema, type LoginFormValues } from "./schemas";
import styles from "./AuthForm.module.scss";

export const LoginForm = () => {
    const formId = "login";
    const navigate = useNavigate();
    const { notify } = useAppNotification();
    const loginMutation = useLoginMutation();
    const verifyMfaMutation = useVerifyMfaLoginMutation();
    const [challengeToken, setChallengeToken] = useState<string | null>(null);
    const [mfaCode, setMfaCode] = useState("");
    const [recoveryCode, setRecoveryCode] = useState("");

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
        try {
            const result = await loginMutation.mutateAsync(values);

            if ("mfaRequired" in result && result.mfaRequired) {
                setChallengeToken(result.challengeToken);
                return;
            }

            await navigate({ to: "/app" });
        } catch (error) {
            notify({
                variant: "error",
                message: "Sign in failed",
                description: normalizeUserError(error, "Invalid email or password"),
                key: "auth:login:failed",
            });
        }
    };

    const onSubmitMfa = async () => {
        if (!challengeToken) {
            return;
        }

        await verifyMfaMutation.mutateAsync({
            challengeToken,
            ...(mfaCode.trim() ? { code: mfaCode.trim() } : {}),
            ...(recoveryCode.trim() ? { recoveryCode: recoveryCode.trim() } : {}),
        });
        await navigate({ to: "/app" });
    };

    return (
        <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
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
                    autoComplete="current-password"
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
                <button type="submit" disabled={loginMutation.isPending}>
                    {loginMutation.isPending ? "Signing in..." : "Sign in"}
                </button>
                <Link to="/forgot-password">Forgot password?</Link>
            </div>

            {challengeToken ? (
                <div className={styles.field}>
                    <label className={styles.label} htmlFor="mfa-code">
                        MFA code
                    </label>
                    <AppInput
                        id="mfa-code"
                        className={styles.input}
                        value={mfaCode}
                        onChange={(event) => setMfaCode(event.target.value)}
                        placeholder="123456"
                        inputMode="numeric"
                    />
                    <label className={styles.label} htmlFor="recovery-code">
                        Recovery code (optional)
                    </label>
                    <AppInput
                        id="recovery-code"
                        className={styles.input}
                        value={recoveryCode}
                        onChange={(event) => setRecoveryCode(event.target.value)}
                        placeholder="ABCDE-FGHIJ"
                    />
                    <button
                        type="button"
                        onClick={() => void onSubmitMfa()}
                        disabled={verifyMfaMutation.isPending || (!mfaCode.trim() && !recoveryCode.trim())}
                    >
                        {verifyMfaMutation.isPending ? "Verifying..." : "Verify and continue"}
                    </button>
                    {verifyMfaMutation.error ? <p className={styles.error}>{verifyMfaMutation.error.message}</p> : null}
                </div>
            ) : null}
        </form>
    );
};
