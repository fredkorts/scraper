import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "./auth";

describe("registerSchema", () => {
    it("normalizes email and trims name", () => {
        const parsed = registerSchema.parse({
            email: "  TEST@Example.com ",
            password: "Password123",
            name: "  Test User  ",
        });

        expect(parsed.email).toBe("test@example.com");
        expect(parsed.name).toBe("Test User");
    });

    it("rejects weak passwords", () => {
        expect(() =>
            registerSchema.parse({
                email: "test@example.com",
                password: "weakpass",
                name: "Test User",
            }),
        ).toThrow();
    });
});

describe("loginSchema", () => {
    it("normalizes email", () => {
        const parsed = loginSchema.parse({
            email: " TEST@Example.com ",
            password: "Password123",
        });

        expect(parsed.email).toBe("test@example.com");
    });
});
