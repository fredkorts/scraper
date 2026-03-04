import request from "supertest";
import { UserRole } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { createApp } from "../app";
import { authCookieNames } from "../lib/cookies";
import { signAccessToken } from "../lib/jwt";
import { prisma } from "../lib/prisma";
import { useTestDatabase } from "../test/db";
import { createUser } from "../test/factories";

useTestDatabase();

const authCookie = (userId: string, email: string, role: "free" | "paid" | "admin" = "free") => {
    const token = signAccessToken({
        sub: userId,
        email,
        role,
    });

    return `${authCookieNames.accessToken}=${token}`;
};

describe("categories route", () => {
    it("returns hierarchy-aware labels and depth for tracked and all scopes", async () => {
        const app = createApp();
        const { user } = await createUser({
            email: "categories-user@example.com",
            role: UserRole.FREE,
        });

        const parent = await prisma.category.create({
            data: {
                slug: "lauamangud",
                nameEt: "Lauamangud",
                nameEn: "Board Games",
            },
        });
        const child = await prisma.category.create({
            data: {
                slug: "lauamangud/strateegia",
                nameEt: "Strateegia",
                nameEn: "Strategy",
                parentId: parent.id,
            },
        });
        const otherParent = await prisma.category.create({
            data: {
                slug: "miniatuurid",
                nameEt: "Miniatuurid",
                nameEn: "Miniatures",
            },
        });

        await prisma.userSubscription.create({
            data: {
                userId: user.id,
                categoryId: child.id,
            },
        });

        const trackedResponse = await request(app)
            .get("/api/categories")
            .set("Cookie", authCookie(user.id, user.email));

        expect(trackedResponse.status).toBe(200);
        expect(trackedResponse.body.categories).toHaveLength(1);
        expect(trackedResponse.body.categories[0]).toMatchObject({
            id: child.id,
            depth: 1,
            pathNameEt: "Lauamangud / Strateegia",
        });

        const allResponse = await request(app)
            .get("/api/categories?scope=all")
            .set("Cookie", authCookie(user.id, user.email));

        expect(allResponse.status).toBe(200);
        expect(allResponse.body.categories.map((category: { slug: string }) => category.slug)).toEqual([
            "lauamangud",
            "lauamangud/strateegia",
            "miniatuurid",
        ]);
        expect(allResponse.body.categories[0]).toMatchObject({
            id: parent.id,
            depth: 0,
            pathNameEt: "Lauamangud",
        });
        expect(allResponse.body.categories[1]).toMatchObject({
            id: child.id,
            depth: 1,
            pathNameEt: "Lauamangud / Strateegia",
        });
        expect(allResponse.body.categories[2]).toMatchObject({
            id: otherParent.id,
            depth: 0,
            pathNameEt: "Miniatuurid",
        });
    });
});
