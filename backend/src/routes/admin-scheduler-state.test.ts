import request from "supertest";
import { UserRole } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app";
import { authCookieNames } from "../lib/cookies";
import { signAccessToken } from "../lib/jwt";
import { prisma } from "../lib/prisma";
import { useTestDatabase } from "../test/db";
import { createUser } from "../test/factories";

const closeQueue = vi.fn();
const getJob = vi.fn();

vi.mock("../queue/queues", () => ({
    createScrapeQueue: () => ({
        getJob,
        close: closeQueue,
    }),
}));

useTestDatabase();

const authCookie = (userId: string, email: string, role: "free" | "paid" | "admin" = "free") => {
    const token = signAccessToken({
        sub: userId,
        email,
        role,
    });

    return `${authCookieNames.accessToken}=${token}`;
};

describe("admin scheduler state route", () => {
    beforeEach(() => {
        closeQueue.mockReset();
        getJob.mockReset();
        closeQueue.mockResolvedValue(undefined);
        getJob.mockResolvedValue(null);
    });

    it("allows admin users and blocks non-admin users", async () => {
        const app = createApp();
        const { user: admin } = await createUser({
            email: "scheduler-admin@example.com",
            role: UserRole.ADMIN,
        });
        const { user: viewer } = await createUser({
            email: "scheduler-viewer@example.com",
        });

        await prisma.category.create({
            data: {
                slug: "scheduler-route-cat",
                nameEt: "Scheduler Route Cat",
                nameEn: "Scheduler Route Cat",
                scrapeIntervalHours: 12,
            },
        });

        const forbidden = await request(app)
            .get("/api/admin/scheduler/state")
            .set("Cookie", authCookie(viewer.id, viewer.email));

        expect(forbidden.status).toBe(403);

        const response = await request(app)
            .get("/api/admin/scheduler/state")
            .set("Cookie", authCookie(admin.id, admin.email, "admin"));

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.items)).toBe(true);
        expect(response.body.generatedAt).toEqual(expect.any(String));
    });
});
