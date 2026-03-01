import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import { config } from "../config";
import { signAccessToken, verifyAccessToken } from "./jwt";

describe("jwt helpers", () => {
    it("signs and verifies a valid access token", () => {
        const token = signAccessToken({
            sub: "user-id",
            email: "user@example.com",
            role: "free",
        });

        const payload = verifyAccessToken(token);

        expect(payload.sub).toBe("user-id");
        expect(payload.email).toBe("user@example.com");
        expect(payload.role).toBe("free");
        expect(payload.type).toBe("access");
    });

    it("rejects a token with the wrong issuer", () => {
        const token = jwt.sign(
            {
                sub: "user-id",
                email: "user@example.com",
                role: "free",
                type: "access",
            },
            config.JWT_SECRET,
            {
                expiresIn: "15m",
                issuer: "wrong-issuer",
                audience: config.JWT_AUDIENCE,
            },
        );

        expect(() => verifyAccessToken(token)).toThrow();
    });
});
