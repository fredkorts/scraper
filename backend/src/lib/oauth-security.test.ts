import { afterEach, describe, expect, it, vi } from "vitest";

const loadSecurityModule = async () => {
    vi.resetModules();
    return import("./oauth-security");
};

describe("oauth-security", () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("signs and verifies oauth challenge cookie values", async () => {
        vi.stubEnv("AUTH_OAUTH_COOKIE_SIGNING_KEY", "test-signing-key-test-signing-key-test-signing-key");

        const security = await loadSecurityModule();
        const value = security.signOAuthChallengeCookieValue("challenge-id-1");

        expect(security.verifyOAuthChallengeCookieValue(value)).toBe("challenge-id-1");
    });

    it("accepts previous signing key during rotation", async () => {
        vi.stubEnv("AUTH_OAUTH_COOKIE_SIGNING_KEY", "old-signing-key-old-signing-key-old-signing-key");

        const securityWithOldKey = await loadSecurityModule();
        const oldValue = securityWithOldKey.signOAuthChallengeCookieValue("challenge-id-2");

        vi.stubEnv("AUTH_OAUTH_COOKIE_SIGNING_KEY", "new-signing-key-new-signing-key-new-signing-key");
        vi.stubEnv("AUTH_OAUTH_COOKIE_SIGNING_KEY_PREVIOUS", "old-signing-key-old-signing-key-old-signing-key");

        const securityWithRotation = await loadSecurityModule();
        expect(securityWithRotation.verifyOAuthChallengeCookieValue(oldValue)).toBe("challenge-id-2");
    });

    it("rejects tampered oauth challenge cookie values", async () => {
        vi.stubEnv("AUTH_OAUTH_COOKIE_SIGNING_KEY", "test-signing-key-test-signing-key-test-signing-key");

        const security = await loadSecurityModule();
        const value = security.signOAuthChallengeCookieValue("challenge-id-3");

        expect(security.verifyOAuthChallengeCookieValue(`${value}tampered`)).toBeNull();
    });

    it("encrypts and decrypts code verifiers", async () => {
        vi.stubEnv(
            "AUTH_OAUTH_CODE_VERIFIER_ENCRYPTION_KEY",
            "oauth-verifier-key-oauth-verifier-key-oauth-verifier-key",
        );

        const security = await loadSecurityModule();
        const encrypted = security.encryptOAuthCodeVerifier("verifier-value");
        const decrypted = security.decryptOAuthCodeVerifier(encrypted);

        expect(decrypted).toBe("verifier-value");
    });
});
