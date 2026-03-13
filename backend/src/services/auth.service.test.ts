import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../lib/prisma";
import { useTestDatabase } from "../test/db";
import { createRefreshTokenRecord, createUser } from "../test/factories";
import { getCurrentUser, listSessions, login, logout, refreshSession, register } from "./auth.service";

const sendSecurityEventEmail = vi.fn();
const sendVerificationEmail = vi.fn();
const sendPasswordResetEmail = vi.fn();

vi.mock("./auth-email.service", () => ({
    sendSecurityEventEmail: (...args: unknown[]) => sendSecurityEventEmail(...args),
    sendVerificationEmail: (...args: unknown[]) => sendVerificationEmail(...args),
    sendPasswordResetEmail: (...args: unknown[]) => sendPasswordResetEmail(...args),
}));

useTestDatabase();

describe("auth.service", () => {
    beforeEach(() => {
        sendSecurityEventEmail.mockReset();
        sendVerificationEmail.mockReset();
        sendPasswordResetEmail.mockReset();
        sendSecurityEventEmail.mockResolvedValue(undefined);
        sendVerificationEmail.mockResolvedValue(undefined);
        sendPasswordResetEmail.mockResolvedValue(undefined);
    });

    it("registers a user, notification channel, and refresh token in one flow", async () => {
        const result = await register(
            {
                email: "newuser@example.com",
                password: "Password123",
                name: "New User",
            },
            {},
        );

        expect(result.user.email).toBe("newuser@example.com");

        const user = await prisma.user.findUnique({
            where: { email: "newuser@example.com" },
        });
        const channels = await prisma.notificationChannel.findMany({
            where: { userId: user!.id },
        });
        const tokens = await prisma.refreshToken.findMany({
            where: { userId: user!.id },
        });

        expect(user).not.toBeNull();
        expect(channels).toHaveLength(1);
        expect(channels[0]?.destination).toBe("newuser@example.com");
        expect(tokens).toHaveLength(1);
        expect(user?.passwordHash).not.toBe("Password123");
    });

    it("rejects invalid login credentials", async () => {
        await createUser();

        await expect(
            login(
                {
                    email: "user@example.com",
                    password: "WrongPassword123",
                },
                {},
            ),
        ).rejects.toMatchObject({
            statusCode: 401,
            code: "unauthorized",
        });
    });

    it("rotates refresh tokens and links the replacement token", async () => {
        const { user, password } = await createUser();
        const loginResult = await login(
            {
                email: user.email,
                password,
            },
            {},
        );

        const beforeRefresh = await prisma.refreshToken.findFirstOrThrow({
            where: { userId: user.id },
            orderBy: { createdAt: "desc" },
        });

        if ("mfaRequired" in loginResult) {
            throw new Error("Unexpected MFA challenge in test");
        }

        const refreshResult = await refreshSession(loginResult.refreshToken, {});

        expect(refreshResult.user.id).toBe(user.id);

        const updatedOldToken = await prisma.refreshToken.findUniqueOrThrow({
            where: { id: beforeRefresh.id },
        });
        const newToken = await prisma.refreshToken.findUniqueOrThrow({
            where: { id: updatedOldToken.replacedByTokenId! },
        });

        expect(updatedOldToken.revocationReason).toBe("rotated");
        expect(updatedOldToken.revokedAt).not.toBeNull();
        expect(newToken.userId).toBe(user.id);
    });

    it("revokes active sessions when a rotated token is reused", async () => {
        const { user } = await createUser();
        const first = await createRefreshTokenRecord({ userId: user.id });
        const second = await createRefreshTokenRecord({ userId: user.id });

        await prisma.refreshToken.update({
            where: { id: first.record.id },
            data: {
                revokedAt: new Date(),
                revocationReason: "rotated",
                replacedByTokenId: second.record.id,
            },
        });

        await expect(refreshSession(first.rawToken, {})).rejects.toMatchObject({
            statusCode: 401,
            code: "unauthorized",
        });

        const activeTokens = await prisma.refreshToken.findMany({
            where: {
                userId: user.id,
                revokedAt: null,
            },
        });
        const revokedTokens = await prisma.refreshToken.findMany({
            where: {
                userId: user.id,
                revocationReason: "reuse_detected",
            },
        });

        expect(activeTokens).toHaveLength(0);
        expect(revokedTokens.length).toBeGreaterThan(0);
    });

    it("revokes the current refresh token on logout", async () => {
        const { user } = await createUser();
        const token = await createRefreshTokenRecord({ userId: user.id });

        const result = await logout(token.rawToken);

        const revoked = await prisma.refreshToken.findUniqueOrThrow({
            where: { id: token.record.id },
        });

        expect(result.success).toBe(true);
        expect(revoked.revocationReason).toBe("logout");
        expect(revoked.revokedAt).not.toBeNull();
    });

    it("returns the current user when present and active", async () => {
        const { user } = await createUser();

        const result = await getCurrentUser(user.id);

        expect(result.user.email).toBe(user.email);
        expect(result.user).not.toHaveProperty("passwordHash");
    });

    it("returns only active sessions in session listing", async () => {
        const { user } = await createUser();
        const active = await createRefreshTokenRecord({ userId: user.id });
        const revoked = await createRefreshTokenRecord({ userId: user.id });
        const expired = await createRefreshTokenRecord({ userId: user.id });

        await prisma.refreshToken.update({
            where: { id: revoked.record.id },
            data: {
                revokedAt: new Date(),
                revocationReason: "session_revoked",
            },
        });
        await prisma.refreshToken.update({
            where: { id: expired.record.id },
            data: {
                expiresAt: new Date(Date.now() - 60 * 1000),
            },
        });

        const result = await listSessions(user.id, active.rawToken);

        expect(result.sessions).toHaveLength(1);
        expect(result.sessions[0]?.id).toBe(active.record.id);
        expect(result.sessions[0]?.isCurrent).toBe(true);
    });

    it("sends new-login email only once for a previously seen IP", async () => {
        const { user, password } = await createUser({
            email: "login-ip-repeat@example.com",
        });

        await login(
            {
                email: user.email,
                password,
            },
            { ip: "198.51.100.20" },
        );

        await login(
            {
                email: user.email,
                password,
            },
            { ip: "198.51.100.20" },
        );

        expect(sendSecurityEventEmail).toHaveBeenCalledTimes(1);
        expect(sendSecurityEventEmail).toHaveBeenCalledWith(
            user.email,
            "New login",
            "A new login was detected from IP 198.51.100.20.",
        );
    });

    it("sends a new-login email when the user logs in from a new IP", async () => {
        const { user, password } = await createUser({
            email: "login-new-ip@example.com",
        });

        await login(
            {
                email: user.email,
                password,
            },
            { ip: "198.51.100.21" },
        );

        await login(
            {
                email: user.email,
                password,
            },
            { ip: "198.51.100.22" },
        );

        expect(sendSecurityEventEmail).toHaveBeenCalledTimes(2);
        expect(sendSecurityEventEmail).toHaveBeenNthCalledWith(
            2,
            user.email,
            "New login",
            "A new login was detected from IP 198.51.100.22.",
        );
    });
});
