import { ChangeType, UserRole } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { renderDigestEmail, renderImmediateEmail } from "./templates";
import type { DigestRecipientPayload, ImmediateDeliveryPayload } from "./types";

const immediatePayload: ImmediateDeliveryPayload = {
    delivery: { id: "delivery-1", status: "PENDING" },
    user: { id: "user-1", email: "user@example.com", name: "Alice", role: UserRole.PAID, isActive: true },
    channel: {
        id: "channel-1",
        destination: "user@example.com",
        isActive: true,
        channelType: "EMAIL",
    },
    report: {
        id: "report-1",
        createdAt: new Date("2026-03-01T10:05:00.000Z"),
        totalChanges: 1,
        scrapeRun: {
            id: "run-1",
            completedAt: new Date("2026-03-01T10:05:00.000Z"),
            category: {
                id: "category-1",
                nameEt: "Lauamängud",
                slug: "lauamangud",
            },
        },
    },
    changeItems: [
        {
            id: "item-1",
            changeType: ChangeType.PRICE_DECREASE,
            oldPrice: 19.99 as never,
            newPrice: 14.99 as never,
            oldStockStatus: null,
            newStockStatus: null,
            product: {
                id: "product-1",
                name: "Catan & Friends",
                externalUrl: "https://mabrik.ee/toode/catan-friends",
                imageUrl: "https://mabrik.ee/images/catan-friends.jpg",
            },
        },
    ],
};

describe("notification templates", () => {
    it("renders the immediate email with category, product, and prices", () => {
        const email = renderImmediateEmail(immediatePayload);

        expect(email.subject).toContain("Lauamängud");
        expect(email.html).toContain("Catan &amp; Friends");
        expect(email.html).toContain("19.99 EUR -> 14.99 EUR");
        expect(email.text).toContain("Catan & Friends");
        expect(email.text).toContain("https://mabrik.ee/toode/catan-friends");
    });

    it("renders the digest grouped by category", () => {
        const digestPayload: DigestRecipientPayload = {
            user: {
                id: "user-1",
                email: "free@example.com",
                name: "Bob",
                role: UserRole.FREE,
                lastDigestSentAt: null,
                isActive: true,
            },
            channel: {
                id: "channel-1",
                destination: "free@example.com",
                isActive: true,
                channelType: "EMAIL",
            },
            deliveries: [
                {
                    deliveryId: "delivery-1",
                    report: immediatePayload.report,
                    changeItems: immediatePayload.changeItems,
                },
            ],
        };

        const email = renderDigestEmail(digestPayload);

        expect(email.subject).toContain("1 reports across 1 categories");
        expect(email.html).toContain("Lauamängud");
        expect(email.text).toContain("Report report-1");
    });
});
