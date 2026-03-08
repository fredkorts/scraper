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
    it("renders grouped immediate email with context, caps, and CTA links", () => {
        const groupedPayload: ImmediateDeliveryPayload = {
            ...immediatePayload,
            report: {
                ...immediatePayload.report,
                totalChanges: 4,
            },
            changeItems: [
                {
                    ...immediatePayload.changeItems[0],
                    id: "item-new",
                    changeType: ChangeType.NEW_PRODUCT,
                    oldPrice: null,
                    newPrice: 14.99 as never,
                    oldStockStatus: null,
                    newStockStatus: false,
                    product: {
                        ...immediatePayload.changeItems[0].product,
                        name: "A New Product",
                        externalUrl: "https://mabrik.ee/toode/new-product",
                    },
                },
                {
                    ...immediatePayload.changeItems[0],
                    id: "item-stock",
                    changeType: ChangeType.BACK_IN_STOCK,
                    oldPrice: null,
                    newPrice: null,
                    oldStockStatus: false,
                    newStockStatus: true,
                    product: {
                        ...immediatePayload.changeItems[0].product,
                        name: "B Stock Product",
                        externalUrl: "https://mabrik.ee/toode/stock-product",
                    },
                },
                {
                    ...immediatePayload.changeItems[0],
                    id: "item-drop-big",
                    changeType: ChangeType.PRICE_DECREASE,
                    oldPrice: 100 as never,
                    newPrice: 50 as never,
                    product: {
                        ...immediatePayload.changeItems[0].product,
                        name: "C Price Big",
                        externalUrl: "https://mabrik.ee/toode/price-big",
                    },
                },
                {
                    ...immediatePayload.changeItems[0],
                    id: "item-drop-small",
                    changeType: ChangeType.PRICE_DECREASE,
                    oldPrice: 100 as never,
                    newPrice: 95 as never,
                    product: {
                        ...immediatePayload.changeItems[0].product,
                        name: "D Price Small",
                        externalUrl: "https://mabrik.ee/toode/price-small",
                    },
                },
            ],
        };

        const email = renderImmediateEmail(groupedPayload);

        expect(email.subject).toContain("Lauamängud");
        expect(email.text).toContain("Category: Lauamängud");
        expect(email.text).toContain("Run time: 2026-03-01 10:05 UTC");
        expect(email.text).toContain("Sections: 3");
        expect(email.text).toContain("Summary: New products: 1, Back in stock: 1, Price drops: 2");
        expect(email.text).toContain("View all changes in dashboard:");
        expect(email.text).toContain(
            "/app/runs?page=1&pageSize=25&sortBy=startedAt&sortOrder=desc&categoryId=category-1",
        );
        expect(email.text).toContain("Open category runs:");
        expect(email.text).toContain("/app?categoryId=category-1");
        expect(email.text).toContain("Stock: Out of stock -> In stock");
        expect(email.html).toContain("New products (1)");
        expect(email.html).toContain("Back in stock (1)");
        expect(email.html).toContain("Price drops (2)");
        expect(email.html).toContain("Unknown -> Out of stock");
        expect(email.html.indexOf("C Price Big")).toBeLessThan(email.html.indexOf("D Price Small"));
    });

    it("applies section cap overflow indicators for immediate email", () => {
        const cappedPayload: ImmediateDeliveryPayload = {
            ...immediatePayload,
            report: {
                ...immediatePayload.report,
                totalChanges: 21,
            },
            changeItems: Array.from({ length: 21 }).map((_, index) => ({
                ...immediatePayload.changeItems[0],
                id: `cap-item-${index}`,
                changeType: ChangeType.NEW_PRODUCT,
                product: {
                    ...immediatePayload.changeItems[0].product,
                    name: `Cap Item ${index + 1}`,
                    externalUrl: `https://mabrik.ee/toode/cap-item-${index + 1}`,
                },
            })),
        };

        const email = renderImmediateEmail(cappedPayload);

        expect(email.text).toContain("New products (21)");
        expect(email.text).toContain("+1 more in this section");
        expect(email.html).toContain("+1 more in this section");
    });

    it("renders the digest grouped by category and grouped sections", () => {
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
                    changeItems: [
                        {
                            ...immediatePayload.changeItems[0],
                            id: "digest-item-1",
                            changeType: ChangeType.BACK_IN_STOCK,
                            oldStockStatus: false,
                            newStockStatus: true,
                            oldPrice: null,
                            newPrice: null,
                            product: {
                                ...immediatePayload.changeItems[0].product,
                                name: "Digest Stock Item",
                                externalUrl: "https://mabrik.ee/toode/digest-stock-item",
                            },
                        },
                        {
                            ...immediatePayload.changeItems[0],
                            id: "digest-item-2",
                            changeType: ChangeType.PRICE_INCREASE,
                            oldPrice: 40 as never,
                            newPrice: 59 as never,
                            oldStockStatus: null,
                            newStockStatus: null,
                            product: {
                                ...immediatePayload.changeItems[0].product,
                                name: "Digest Price Item",
                                externalUrl: "https://mabrik.ee/toode/digest-price-item",
                            },
                        },
                    ],
                },
            ],
        };

        const email = renderDigestEmail(digestPayload);

        expect(email.subject).toContain("1 reports across 1 categories");
        expect(email.text).toContain("View all changes in dashboard:");
        expect(email.text).toContain("/app/runs?page=1&pageSize=25&sortBy=startedAt&sortOrder=desc");
        expect(email.text).toContain("Run time: 2026-03-01 10:05 UTC");
        expect(email.text).toContain("Back in stock (1)");
        expect(email.text).toContain("Price increases (1)");
        expect(email.html).toContain("View all changes in dashboard");
        expect(email.html).toContain("Open category runs");
    });

    it("applies digest section cap overflow indicators", () => {
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
                    report: {
                        ...immediatePayload.report,
                        totalChanges: 11,
                    },
                    changeItems: Array.from({ length: 11 }).map((_, index) => ({
                        ...immediatePayload.changeItems[0],
                        id: `digest-cap-item-${index}`,
                        changeType: ChangeType.PRICE_INCREASE,
                        oldPrice: 10 as never,
                        newPrice: 20 as never,
                        product: {
                            ...immediatePayload.changeItems[0].product,
                            name: `Digest Cap Item ${index + 1}`,
                            externalUrl: `https://mabrik.ee/toode/digest-cap-item-${index + 1}`,
                        },
                    })),
                },
            ],
        };

        const email = renderDigestEmail(digestPayload);

        expect(email.text).toContain("Price increases (11)");
        expect(email.text).toContain("+1 more in this section");
        expect(email.html).toContain("+1 more in this section");
    });

    it("renders the immediate email with category, product, and prices", () => {
        const email = renderImmediateEmail(immediatePayload);

        expect(email.subject).toContain("Lauamängud");
        expect(email.html).toContain("Catan &amp; Friends");
        expect(email.html).toContain("19.99 EUR -> 14.99 EUR");
        expect(email.text).toContain("Catan & Friends");
        expect(email.text).toContain("https://mabrik.ee/toode/catan-friends");
    });
});
