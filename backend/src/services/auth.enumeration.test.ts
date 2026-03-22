import { describe, expect, it } from "vitest";
import { prisma } from "../lib/prisma";
import { useTestDatabase } from "../test/db";
import { createUser } from "../test/factories";
import { login } from "./auth.service";

useTestDatabase();

describe("auth enumeration resistance", () => {
    it("returns the same public login error for unknown user, wrong password, and inactive account", async () => {
        const { user, password } = await createUser({
            email: "enumeration@example.com",
        });
        const inactive = await createUser({
            email: "enumeration-inactive@example.com",
        });
        await prisma.user.update({
            where: { id: inactive.user.id },
            data: { isActive: false },
        });

        const unknownUserError = await login(
            {
                email: "missing-user@example.com",
                password,
            },
            {},
        ).catch((error: unknown) => error as { statusCode: number; message: string; code: string });
        const wrongPasswordError = await login(
            {
                email: user.email,
                password: "wrong-password",
            },
            {},
        ).catch((error: unknown) => error as { statusCode: number; message: string; code: string });
        const inactiveError = await login(
            {
                email: inactive.user.email,
                password: inactive.password,
            },
            {},
        ).catch((error: unknown) => error as { statusCode: number; message: string; code: string });

        expect(unknownUserError).toMatchObject({
            statusCode: 401,
            code: "unauthorized",
            message: "Invalid email or password",
        });
        expect(wrongPasswordError).toMatchObject({
            statusCode: 401,
            code: "unauthorized",
            message: "Invalid email or password",
        });
        expect(inactiveError).toMatchObject({
            statusCode: 401,
            code: "unauthorized",
            message: "Invalid email or password",
        });
    });
});
