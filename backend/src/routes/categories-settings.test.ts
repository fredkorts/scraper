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

describe("category settings route", () => {
    it("allows admins to update scrape interval and blocks non-admin users", async () => {
        const app = createApp();
        const { user: admin } = await createUser({
            email: "cat-admin@example.com",
            role: UserRole.ADMIN,
        });
        const { user: viewer } = await createUser({
            email: "cat-viewer@example.com",
        });
        const category = await prisma.category.create({
            data: {
                slug: "admin-settings-cat",
                nameEt: "Admin Settings Cat",
                nameEn: "Admin Settings Cat",
                scrapeIntervalHours: 12,
            },
        });

        const forbidden = await request(app)
            .patch(`/api/categories/${category.id}/settings`)
            .set("Cookie", authCookie(viewer.id, viewer.email))
            .send({ scrapeIntervalHours: 24 });

        expect(forbidden.status).toBe(403);

        const response = await request(app)
            .patch(`/api/categories/${category.id}/settings`)
            .set("Cookie", authCookie(admin.id, admin.email, "admin"))
            .send({ scrapeIntervalHours: 24 });

        expect(response.status).toBe(200);
        expect(response.body.category.scrapeIntervalHours).toBe(24);
    });
});
