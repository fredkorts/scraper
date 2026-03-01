import { describe, expect, it, vi } from "vitest";
import { authCookieNames, clearAuthCookies, setAuthCookies } from "./cookies";

const createMockResponse = () => {
    const res = {
        cookie: vi.fn(),
        clearCookie: vi.fn(),
    };

    return res;
};

describe("cookie helpers", () => {
    it("sets auth cookies with the expected names", () => {
        const res = createMockResponse();

        setAuthCookies(res as never, "access-token", "refresh-token");

        expect(res.cookie).toHaveBeenCalledTimes(2);
        expect(res.cookie).toHaveBeenCalledWith(
            authCookieNames.accessToken,
            "access-token",
            expect.objectContaining({
                httpOnly: true,
                sameSite: "strict",
                path: "/",
            }),
        );
        expect(res.cookie).toHaveBeenCalledWith(
            authCookieNames.refreshToken,
            "refresh-token",
            expect.objectContaining({
                httpOnly: true,
                sameSite: "strict",
                path: "/",
            }),
        );
    });

    it("clears auth cookies with the expected names", () => {
        const res = createMockResponse();

        clearAuthCookies(res as never);

        expect(res.clearCookie).toHaveBeenCalledWith(
            authCookieNames.accessToken,
            expect.objectContaining({
                httpOnly: true,
                sameSite: "strict",
                path: "/",
            }),
        );
        expect(res.clearCookie).toHaveBeenCalledWith(
            authCookieNames.refreshToken,
            expect.objectContaining({
                httpOnly: true,
                sameSite: "strict",
                path: "/",
            }),
        );
    });
});
