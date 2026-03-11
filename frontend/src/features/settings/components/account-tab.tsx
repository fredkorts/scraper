import { useState } from "react";
import { AppButton } from "../../../components/app-button/AppButton";
import { AppInput } from "../../../components/app-input/AppInput";
import { useMeQuery, useSessionsQuery } from "../../auth";
import {
    useConfirmMfaSetupMutation,
    useDisableMfaMutation,
    useRegenerateRecoveryCodesMutation,
    useResendEmailVerificationMutation,
    useRevokeOtherSessionsMutation,
    useRevokeSessionMutation,
    useStartMfaSetupMutation,
} from "../../auth";
import { broadcastAuthEvent } from "../../auth";
import { ROLE_LABELS } from "../constants/settings.constants";
import { getSettingsPanelId, getSettingsTabId } from "../constants/settings-tab-a11y.constants";
import type { SettingsAccountTabProps } from "../types/settings-ui.types";
import styles from "./settings-shared.module.scss";

export const SettingsAccountTab = ({
    form,
    email,
    isActive,
    isSaving,
    role,
    onSubmitProfile,
}: SettingsAccountTabProps) => {
    const session = useMeQuery();
    const sessions = useSessionsQuery();
    const resendVerificationMutation = useResendEmailVerificationMutation();
    const startMfaMutation = useStartMfaSetupMutation();
    const confirmMfaMutation = useConfirmMfaSetupMutation();
    const disableMfaMutation = useDisableMfaMutation();
    const regenerateRecoveryMutation = useRegenerateRecoveryCodesMutation();
    const revokeSessionMutation = useRevokeSessionMutation();
    const revokeOthersMutation = useRevokeOtherSessionsMutation();

    const [mfaCode, setMfaCode] = useState("");
    const [stepUpPassword, setStepUpPassword] = useState("");
    const [setupSecret, setSetupSecret] = useState<string | null>(null);
    const [setupOtpauthUri, setSetupOtpauthUri] = useState<string | null>(null);
    const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

    const onStartMfaSetup = async () => {
        const result = await startMfaMutation.mutateAsync();
        setSetupSecret(result.secret);
        setSetupOtpauthUri(result.otpauthUri);
        setRecoveryCodes([]);
    };

    const onConfirmMfaSetup = async () => {
        const result = await confirmMfaMutation.mutateAsync({
            code: mfaCode,
        });
        setRecoveryCodes(result.recoveryCodes);
        setSetupSecret(null);
        setSetupOtpauthUri(null);
        setMfaCode("");
    };

    return (
        <section
            id={getSettingsPanelId("account")}
            className={styles.section}
            role="tabpanel"
            aria-labelledby={getSettingsTabId("account")}
        >
            <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Account Basics</h2>
            </div>
            <form className={styles.card} onSubmit={onSubmitProfile}>
                <label className={styles.field}>
                    <span className={styles.label}>Name</span>
                    <AppInput className={styles.input} {...form.register("name")} />
                    {form.formState.errors.name ? (
                        <span className={styles.errorText}>{form.formState.errors.name.message}</span>
                    ) : null}
                </label>
                <label className={styles.field}>
                    <span className={styles.label}>Email</span>
                    <AppInput className={styles.input} value={email} readOnly />
                    <span className={styles.subtle}>Email changes are not available in Phase 5.</span>
                </label>
                <div className={styles.metaGrid}>
                    <div>
                        <span className={styles.eyebrow}>Role</span>
                        <div>{ROLE_LABELS[role]}</div>
                    </div>
                    <div>
                        <span className={styles.eyebrow}>Account status</span>
                        <div>{isActive ? "Active" : "Inactive"}</div>
                    </div>
                    <div>
                        <span className={styles.eyebrow}>Email verified</span>
                        <div>{session.data?.emailVerifiedAt ? "Yes" : "No"}</div>
                    </div>
                </div>
                <div className={styles.inlineForm}>
                    <AppButton htmlType="submit" disabled={isSaving}>
                        {isSaving ? "Saving..." : "Save changes"}
                    </AppButton>
                    {!session.data?.emailVerifiedAt ? (
                        <AppButton
                            intent="secondary"
                            htmlType="button"
                            disabled={resendVerificationMutation.isPending}
                            onClick={() => void resendVerificationMutation.mutateAsync()}
                        >
                            {resendVerificationMutation.isPending ? "Sending..." : "Resend verification email"}
                        </AppButton>
                    ) : null}
                </div>
            </form>

            <article className={styles.card}>
                <h3 className={styles.cardTitle}>Security</h3>
                <div className={styles.metaGrid}>
                    <div>
                        <span className={styles.eyebrow}>MFA status</span>
                        <div>{session.data?.mfaEnabled ? "Enabled" : "Disabled"}</div>
                    </div>
                </div>
                {session.data?.mfaEnabled ? (
                    <div className={styles.stack}>
                        <label className={styles.field}>
                            <span className={styles.label}>Current password (step-up)</span>
                            <AppInput
                                className={styles.input}
                                type="password"
                                value={stepUpPassword}
                                onChange={(event) => setStepUpPassword(event.target.value)}
                                autoComplete="current-password"
                            />
                        </label>
                        <div className={styles.inlineForm}>
                            <AppButton
                                intent="secondary"
                                htmlType="button"
                                disabled={!stepUpPassword || regenerateRecoveryMutation.isPending}
                                onClick={() =>
                                    void regenerateRecoveryMutation
                                        .mutateAsync({ currentPassword: stepUpPassword })
                                        .then((result) => setRecoveryCodes(result.recoveryCodes))
                                }
                            >
                                Regenerate recovery codes
                            </AppButton>
                            <AppButton
                                intent="danger"
                                htmlType="button"
                                disabled={!stepUpPassword || disableMfaMutation.isPending}
                                onClick={() =>
                                    void disableMfaMutation.mutateAsync({
                                        currentPassword: stepUpPassword,
                                    })
                                }
                            >
                                Disable MFA
                            </AppButton>
                        </div>
                    </div>
                ) : (
                    <div className={styles.stack}>
                        <AppButton
                            htmlType="button"
                            onClick={() => void onStartMfaSetup()}
                            disabled={startMfaMutation.isPending}
                        >
                            {startMfaMutation.isPending ? "Preparing..." : "Start MFA setup"}
                        </AppButton>
                        {setupSecret ? (
                            <div className={styles.stack}>
                                <p>Secret: {setupSecret}</p>
                                {setupOtpauthUri ? <p>OTPAuth URI: {setupOtpauthUri}</p> : null}
                                <label className={styles.field}>
                                    <span className={styles.label}>Confirm code</span>
                                    <AppInput
                                        className={styles.input}
                                        value={mfaCode}
                                        onChange={(event) => setMfaCode(event.target.value)}
                                        inputMode="numeric"
                                    />
                                </label>
                                <AppButton
                                    htmlType="button"
                                    onClick={() => void onConfirmMfaSetup()}
                                    disabled={confirmMfaMutation.isPending || !mfaCode.trim()}
                                >
                                    {confirmMfaMutation.isPending ? "Confirming..." : "Confirm MFA setup"}
                                </AppButton>
                            </div>
                        ) : null}
                    </div>
                )}
                {recoveryCodes.length > 0 ? <p>Recovery codes: {recoveryCodes.join(", ")}</p> : null}
            </article>

            <article className={styles.card}>
                <h3 className={styles.cardTitle}>Active sessions</h3>
                <label className={styles.field}>
                    <span className={styles.label}>Current password (step-up for revoke)</span>
                    <AppInput
                        className={styles.input}
                        type="password"
                        value={stepUpPassword}
                        onChange={(event) => setStepUpPassword(event.target.value)}
                        autoComplete="current-password"
                    />
                </label>
                <div className={styles.inlineForm}>
                    <AppButton
                        intent="secondary"
                        htmlType="button"
                        disabled={!stepUpPassword || revokeOthersMutation.isPending}
                        onClick={() =>
                            void revokeOthersMutation.mutateAsync({
                                currentPassword: stepUpPassword,
                            })
                        }
                    >
                        Revoke other sessions
                    </AppButton>
                </div>
                <div className={styles.stack}>
                    {sessions.data?.map((sessionItem) => (
                        <div key={sessionItem.id} className={styles.card}>
                            <div>
                                <strong>{sessionItem.isCurrent ? "Current session" : "Session"}</strong>
                            </div>
                            <div>{sessionItem.createdByUserAgent ?? "Unknown device"}</div>
                            <div>{sessionItem.createdByIp ?? "Unknown IP"}</div>
                            <div>Created: {new Date(sessionItem.createdAt).toLocaleString()}</div>
                            <div>
                                Last used:{" "}
                                {sessionItem.lastUsedAt ? new Date(sessionItem.lastUsedAt).toLocaleString() : "N/A"}
                            </div>
                            <AppButton
                                intent="danger"
                                htmlType="button"
                                disabled={!stepUpPassword || revokeSessionMutation.isPending}
                                onClick={() =>
                                    void revokeSessionMutation
                                        .mutateAsync({
                                            id: sessionItem.id,
                                            payload: { currentPassword: stepUpPassword },
                                        })
                                        .then(() => {
                                            if (sessionItem.isCurrent) {
                                                broadcastAuthEvent("session_revoked");
                                            }
                                        })
                                }
                            >
                                Revoke session
                            </AppButton>
                        </div>
                    ))}
                </div>
            </article>
        </section>
    );
};
