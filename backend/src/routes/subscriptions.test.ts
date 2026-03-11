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

describe("subscription routes", () => {
    it("lists only the authenticated user's active subscriptions", async () => {
        const app = createApp();
        const { user: userA } = await createUser({ email: "subs-a@example.com" });
        const { user: userB } = await createUser({ email: "subs-b@example.com" });
        const categoryA = await prisma.category.create({
            data: {
                slug: "subs-a",
                nameEt: "Subs A",
                nameEn: "Subs A",
            },
        });
        const categoryB = await prisma.category.create({
            data: {
                slug: "subs-b",
                nameEt: "Subs B",
                nameEn: "Subs B",
            },
        });

        await prisma.userSubscription.createMany({
            data: [
                { userId: userA.id, categoryId: categoryA.id, isActive: true },
                { userId: userB.id, categoryId: categoryB.id, isActive: true },
            ],
        });

        const response = await request(app).get("/api/subscriptions").set("Cookie", authCookie(userA.id, userA.email));

        expect(response.status).toBe(200);
        expect(response.body.items).toHaveLength(1);
        expect(response.body.items[0].category.id).toBe(categoryA.id);
        expect(response.body.used).toBe(1);
        expect(response.body.limit).toBe(3);
    });

    it("creates subscriptions and enforces plan limits", async () => {
        const app = createApp();
        const { user } = await createUser({ email: "subs-create@example.com" });
        const categories = await Promise.all(
            ["one", "two", "three", "four"].map((slug) =>
                prisma.category.create({
                    data: {
                        slug: `cat-${slug}`,
                        nameEt: `Cat ${slug}`,
                        nameEn: `Cat ${slug}`,
                    },
                }),
            ),
        );

        for (const category of categories.slice(0, 3)) {
            const response = await request(app)
                .post("/api/subscriptions")
                .set("Cookie", authCookie(user.id, user.email))
                .send({ categoryId: category.id });

            expect(response.status).toBe(201);
        }

        const limitResponse = await request(app)
            .post("/api/subscriptions")
            .set("Cookie", authCookie(user.id, user.email))
            .send({ categoryId: categories[3].id });

        expect(limitResponse.status).toBe(409);
        expect(limitResponse.body.error).toBe("tracking_limit_reached");
    });

    it("allows admin users unlimited subscriptions and supports deletion", async () => {
        const app = createApp();
        const { user } = await createUser({
            email: "subs-admin@example.com",
            role: UserRole.ADMIN,
        });
        const categories = await Promise.all(
            Array.from({ length: 7 }, (_, index) =>
                prisma.category.create({
                    data: {
                        slug: `admin-sub-${index}`,
                        nameEt: `Admin Sub ${index}`,
                        nameEn: `Admin Sub ${index}`,
                    },
                }),
            ),
        );

        for (const category of categories) {
            const response = await request(app)
                .post("/api/subscriptions")
                .set("Cookie", authCookie(user.id, user.email, "admin"))
                .send({ categoryId: category.id });

            expect(response.status).toBe(201);
        }

        const listResponse = await request(app)
            .get("/api/subscriptions")
            .set("Cookie", authCookie(user.id, user.email, "admin"));

        expect(listResponse.status).toBe(200);
        expect(listResponse.body.limit).toBeNull();
        expect(listResponse.body.items).toHaveLength(7);

        const deleteResponse = await request(app)
            .delete(`/api/subscriptions/${listResponse.body.items[0].id}`)
            .set("Cookie", authCookie(user.id, user.email, "admin"));

        expect(deleteResponse.status).toBe(200);
        expect(deleteResponse.body.success).toBe(true);
        expect(deleteResponse.body.autoDisabledWatchCount).toBe(0);
    });
});
