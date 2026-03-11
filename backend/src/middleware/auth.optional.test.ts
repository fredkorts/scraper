import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { authCookieNames } from "../lib/cookies";
import { signAccessToken } from "../lib/jwt";
import { hydrateAuthOptional } from "./auth";

const buildRequest = (token?: string): Request =>
    ({
        cookies: token ? { [authCookieNames.accessToken]: token } : {},
    }) as Request;

const noopResponse = {} as Response;

describe("hydrateAuthOptional", () => {
    it("sets req.auth when a valid access token exists", () => {
        const accessToken = signAccessToken({
            sub: "11111111-1111-4111-8111-111111111111",
            email: "user@example.com",
            role: "paid",
        });
        const request = buildRequest(accessToken);
        const next = vi.fn() as unknown as NextFunction;

        hydrateAuthOptional(request, noopResponse, next);

        expect(request.auth).toMatchObject({
            userId: "11111111-1111-4111-8111-111111111111",
            email: "user@example.com",
            role: "paid",
            tokenType: "access",
        });
        expect(next).toHaveBeenCalledTimes(1);
    });

    it("does not set auth when token is missing", () => {
        const request = buildRequest();
        const next = vi.fn() as unknown as NextFunction;

        hydrateAuthOptional(request, noopResponse, next);

        expect(request.auth).toBeUndefined();
        expect(next).toHaveBeenCalledTimes(1);
    });

    it("fails open when token is invalid", () => {
        const request = buildRequest("invalid-token");
        const next = vi.fn() as unknown as NextFunction;

        hydrateAuthOptional(request, noopResponse, next);

        expect(request.auth).toBeUndefined();
        expect(next).toHaveBeenCalledTimes(1);
    });
});
