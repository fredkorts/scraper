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
import { sendPendingDigests } from "./send-digest";
import type { EmailMessage, EmailTransport } from "./types";

useTestDatabase();

class FakeTransport implements EmailTransport {
    sentMessages: EmailMessage[] = [];
    shouldFail = false;

    async sendEmail(message: EmailMessage): Promise<void> {
        if (this.shouldFail) {
            throw new Error("digest transport failed");
        }
        this.sentMessages.push(message);
    }
}

const createDigestFixture = async (options?: { lastDigestSentAt?: Date | null; channelActive?: boolean }) => {
    const category = await prisma.category.create({
        data: {
            slug: "card-games",
            nameEt: "Kaardimängud",
            nameEn: "Card Games",
        },
    });
    const user = await prisma.user.create({
        data: {
            email: "free@example.com",
            passwordHash: "hash",
            name: "Free User",
            role: UserRole.FREE,
            lastDigestSentAt: options?.lastDigestSentAt ?? null,
        },
    });
    const channel = await prisma.notificationChannel.create({
        data: {
            userId: user.id,
            channelType: NotificationChannelType.EMAIL,
            destination: user.email,
            isDefault: true,
            isActive: options?.channelActive ?? true,
        },
    });
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
            externalUrl: "https://mabrik.ee/toode/digest-game",
            name: "Digest Game",
            imageUrl: "https://mabrik.ee/images/digest-game.jpg",
            currentPrice: "11.99",
            inStock: true,
        },
    });
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
            newPrice: "11.99",
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

    return { user, channel, delivery };
};

describe("sendPendingDigests", () => {
    it("sends one digest and marks deliveries sent for an eligible free user", async () => {
        const transport = new FakeTransport();
        const { user, delivery } = await createDigestFixture();
        const now = new Date("2026-03-01T18:00:00.000Z");

        const result = await sendPendingDigests(now, transport);
        const updatedDelivery = await prisma.notificationDelivery.findUniqueOrThrow({
            where: { id: delivery.id },
        });
        const updatedUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });

        expect(result.sentCount).toBe(1);
        expect(updatedDelivery.status).toBe(NotificationDeliveryStatus.SENT);
        expect(updatedUser.lastDigestSentAt?.toISOString()).toBe(now.toISOString());
        expect(transport.sentMessages).toHaveLength(1);
    });

    it("keeps deliveries pending on transient transport failure", async () => {
        const transport = new FakeTransport();
        transport.shouldFail = true;
        const { delivery } = await createDigestFixture();

        const result = await sendPendingDigests(new Date("2026-03-01T18:00:00.000Z"), transport);
        const updatedDelivery = await prisma.notificationDelivery.findUniqueOrThrow({
            where: { id: delivery.id },
        });

        expect(result.pendingCount).toBe(1);
        expect(updatedDelivery.status).toBe(NotificationDeliveryStatus.PENDING);
    });

    it("blocks digest sends within the 6-hour window", async () => {
        const transport = new FakeTransport();
        const recent = new Date("2026-03-01T16:30:00.000Z");
        const { delivery } = await createDigestFixture({ lastDigestSentAt: recent });

        const result = await sendPendingDigests(new Date("2026-03-01T18:00:00.000Z"), transport);
        const updatedDelivery = await prisma.notificationDelivery.findUniqueOrThrow({
            where: { id: delivery.id },
        });

        expect(result.sentCount).toBe(0);
        expect(updatedDelivery.status).toBe(NotificationDeliveryStatus.PENDING);
    });
});
