import { QueryClient } from "@tanstack/react-query";
import type { AuthUser } from "@mabrik/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../lib/api/errors";
import { queryKeys } from "../../lib/query/query-keys";
import { createAppQueryClient } from "../../lib/query/query-client";

const mocks = vi.hoisted(() => ({
    apiGet: vi.fn(),
    resetAuthClientState: vi.fn(),
}));

vi.mock("../../lib/api/client", () => ({
    apiGet: mocks.apiGet,
    resetAuthClientState: mocks.resetAuthClientState,
}));

import { ensureSession } from "./queries";

const buildUser = (): AuthUser => ({
    id: "11111111-1111-4111-8111-111111111111",
    email: "user@example.com",
    name: "User Example",
    role: "paid",
    isActive: true,
    mfaEnabled: false,
    createdAt: "2026-03-10T10:00:00.000Z",
    updatedAt: "2026-03-10T10:00:00.000Z",
});

describe("ensureSession rate-limit behavior", () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = createAppQueryClient();
        mocks.apiGet.mockReset();
        mocks.resetAuthClientState.mockReset();
    });

    it("keeps cached session when bootstrap /auth/me is rate-limited", async () => {
        const existingUser = buildUser();
        queryClient.setQueryData(queryKeys.auth.me(), existingUser);
        mocks.apiGet.mockRejectedValue(
            new ApiError({
                status: 429,
                code: "rate_limit_exceeded",
                message: "Too many requests, please try again later.",
                retryAfterSeconds: 45,
            }),
        );

        const session = await ensureSession(queryClient);

        expect(session).toEqual(existingUser);
        expect(queryClient.getQueryData(queryKeys.auth.me())).toEqual(existingUser);
        expect(mocks.resetAuthClientState).not.toHaveBeenCalled();
    });

    it("returns null when bootstrap /auth/me is rate-limited and no cached session exists", async () => {
        mocks.apiGet.mockRejectedValue(
            new ApiError({
                status: 429,
                code: "rate_limit_exceeded",
                message: "Too many requests, please try again later.",
                retryAfterSeconds: 30,
            }),
        );

        const session = await ensureSession(queryClient);

        expect(session).toBeNull();
        expect(queryClient.getQueryData(queryKeys.auth.me())).toBeNull();
        expect(mocks.resetAuthClientState).not.toHaveBeenCalled();
    });
});
