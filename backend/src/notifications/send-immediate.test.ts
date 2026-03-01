import {
    ChangeType,
    NotificationChannelType,
    NotificationDeliveryStatus,
    ScrapeRunStatus,
    UserRole,
} from "@prisma/client";
import { describe, expect, it } from "vitest";
import { prisma } from "../lib/prisma";
import { useTestDatabase } from "../test/db";
import { sendImmediateNotifications } from "./send-immediate";
import type { EmailMessage, EmailTransport } from "./types";

useTestDatabase();

class FakeTransport implements EmailTransport {
    sentMessages: EmailMessage[] = [];
    shouldFail = false;

    async sendEmail(message: EmailMessage): Promise<void> {
        if (this.shouldFail) {
            throw new Error("transport failed");
        }
        this.sentMessages.push(message);
    }
}

const createCategory = async () =>
    prisma.category.create({
        data: {
            slug: "lauamangud",
            nameEt: "Lauamängud",
            nameEn: "Board Games",
        },
    });

const createUserWithChannel = async (role: UserRole) => {
    const user = await prisma.user.create({
        data: {
            email: `${role.toLowerCase()}@example.com`,
            passwordHash: "hash",
            name: role,
            role,
        },
    });

    const channel = await prisma.notificationChannel.create({
        data: {
            userId: user.id,
            channelType: NotificationChannelType.EMAIL,
            destination: user.email,
            isDefault: true,
            isActive: true,
        },
    });

    return { user, channel };
};

const createReportWithDelivery = async (role: UserRole) => {
    const category = await createCategory();
    const scrapeRun = await prisma.scrapeRun.create({
        data: {
            categoryId: category.id,
            status: ScrapeRunStatus.COMPLETED,
            startedAt: new Date("2026-03-01T10:00:00.000Z"),
            completedAt: new Date("2026-03-01T10:05:00.000Z"),
        },
    });
    const product = await prisma.product.create({
        data: {
            externalUrl: `https://mabrik.ee/toode/${role.toLowerCase()}-game`,
            name: `${role} Game`,
            imageUrl: `https://mabrik.ee/images/${role.toLowerCase()}-game.jpg`,
            currentPrice: "9.99",
            inStock: true,
        },
    });
    const { user, channel } = await createUserWithChannel(role);
    const report = await prisma.changeReport.create({
        data: {
            scrapeRunId: scrapeRun.id,
            totalChanges: 1,
        },
    });
    await prisma.changeItem.create({
        data: {
            changeReportId: report.id,
            productId: product.id,
            changeType: ChangeType.NEW_PRODUCT,
            newPrice: "9.99",
            newStockStatus: true,
        },
    });
    const delivery = await prisma.notificationDelivery.create({
        data: {
            changeReportId: report.id,
            userId: user.id,
            notificationChannelId: channel.id,
            status: NotificationDeliveryStatus.PENDING,
        },
    });

    return { delivery, report, channel };
};

describe("sendImmediateNotifications", () => {
    it("marks paid deliveries as sent on successful transport", async () => {
        const transport = new FakeTransport();
        const { delivery, report } = await createReportWithDelivery(UserRole.PAID);

        const result = await sendImmediateNotifications(report.id, transport);
        const updated = await prisma.notificationDelivery.findUniqueOrThrow({ where: { id: delivery.id } });

        expect(result.sentCount).toBe(1);
        expect(updated.status).toBe(NotificationDeliveryStatus.SENT);
        expect(transport.sentMessages).toHaveLength(1);
    });

    it("marks paid deliveries as failed on transport error", async () => {
        const transport = new FakeTransport();
        transport.shouldFail = true;
        const { delivery, report } = await createReportWithDelivery(UserRole.ADMIN);

        const result = await sendImmediateNotifications(report.id, transport);
        const updated = await prisma.notificationDelivery.findUniqueOrThrow({ where: { id: delivery.id } });

        expect(result.failedCount).toBe(1);
        expect(updated.status).toBe(NotificationDeliveryStatus.FAILED);
    });

    it("leaves free-user deliveries pending", async () => {
        const transport = new FakeTransport();
        const { delivery, report } = await createReportWithDelivery(UserRole.FREE);

        const result = await sendImmediateNotifications(report.id, transport);
        const updated = await prisma.notificationDelivery.findUniqueOrThrow({ where: { id: delivery.id } });

        expect(result.processedCount).toBe(0);
        expect(updated.status).toBe(NotificationDeliveryStatus.PENDING);
        expect(transport.sentMessages).toHaveLength(0);
    });
});
