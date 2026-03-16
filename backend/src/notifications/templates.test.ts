import { ChangeType, UserRole } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { renderDigestEmail, renderImmediateEmail, renderImmediateTelegram } from "./templates";
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
                isPreorder: false,
                preorderEta: null,
                preorderDetectedFrom: null,
            },
        },
    ],
};

describe("notification templates", () => {
    it("renders immediate telegram with watched-priority highlights, overflow, and CTA", () => {
        const payload: ImmediateDeliveryPayload = {
            ...immediatePayload,
            report: {
                ...immediatePayload.report,
                totalChanges: 5,
            },
            changeItems: [
                {
                    ...immediatePayload.changeItems[0],
                    id: "watched-sold-out",
                    isWatchedAtSend: true,
                    changeType: ChangeType.SOLD_OUT,
                    oldStockStatus: true,
                    newStockStatus: false,
                    oldPrice: null,
                    newPrice: null,
                    product: {
                        ...immediatePayload.changeItems[0].product,
                        name: "Watched Sold Out Product",
                    },
                },
                {
                    ...immediatePayload.changeItems[0],
                    id: "watched-drop",
                    isWatchedAtSend: true,
                    changeType: ChangeType.PRICE_DECREASE,
                    oldPrice: 99.99 as never,
                    newPrice: 79.99 as never,
                    product: {
                        ...immediatePayload.changeItems[0].product,
                        name: "Watched Drop Product",
                    },
                },
                {
                    ...immediatePayload.changeItems[0],
                    id: "regular-back-in-stock",
                    isWatchedAtSend: false,
                    changeType: ChangeType.BACK_IN_STOCK,
                    oldStockStatus: false,
                    newStockStatus: true,
                    oldPrice: null,
                    newPrice: null,
                    product: {
                        ...immediatePayload.changeItems[0].product,
                        name: "Regular Back In Stock Product",
                    },
                },
                {
                    ...immediatePayload.changeItems[0],
                    id: "regular-new",
                    isWatchedAtSend: false,
                    changeType: ChangeType.NEW_PRODUCT,
                    oldPrice: null,
                    newPrice: 14.99 as never,
                    oldStockStatus: null,
                    newStockStatus: true,
                    product: {
                        ...immediatePayload.changeItems[0].product,
                        name: "Regular New Product",
                    },
                },
                {
                    ...immediatePayload.changeItems[0],
                    id: "regular-increase",
                    isWatchedAtSend: false,
                    changeType: ChangeType.PRICE_INCREASE,
                    oldPrice: 10 as never,
                    newPrice: 19.5 as never,
                    product: {
                        ...immediatePayload.changeItems[0].product,
                        name: "Regular Increase Product",
                    },
                },
            ],
        };

        const telegram = renderImmediateTelegram(payload);
        const lines = telegram.text.split("\n");
        const highlightLines = lines.filter(
            (line) => line.startsWith("⭐") || line.startsWith("🟢") || line.startsWith("⬇"),
        );

        expect(telegram.parseMode).toBe("HTML");
        expect(lines[0]).toContain("PricePulse");
        expect(highlightLines).toHaveLength(3);
        expect(highlightLines[0]).toContain("⭐ 🔴 Watched Sold Out Product");
        expect(highlightLines[1]).toContain("⭐ ⬇ Watched Drop Product");
        expect(highlightLines[2]).toContain("🟢 Regular Back In Stock Product");
        expect(telegram.text).toContain("+2 more changes");
        expect(telegram.text).toContain("View all changes in PricePulse");
        expect(telegram.text.length).toBeLessThanOrEqual(700);
    });

    it("escapes unsafe product names and keeps telegram highlight lines compact", () => {
        const payload: ImmediateDeliveryPayload = {
            ...immediatePayload,
            report: {
                ...immediatePayload.report,
                totalChanges: 1,
            },
            changeItems: [
                {
                    ...immediatePayload.changeItems[0],
                    id: "unsafe-name",
                    isWatchedAtSend: true,
                    changeType: ChangeType.PRICE_DECREASE,
                    oldPrice: 50 as never,
                    newPrice: 10 as never,
                    product: {
                        ...immediatePayload.changeItems[0].product,
                        name: 'Family 👨‍👩‍👧‍👦 Bundle <script>alert("x")</script> & Deluxe Super Extended Edition Name',
                    },
                },
            ],
        };

        const telegram = renderImmediateTelegram(payload);
        const highlightLine = telegram.text
            .split("\n")
            .find(
                (line) =>
                    line.startsWith("⭐") || line.startsWith("⬇") || line.startsWith("🔴") || line.startsWith("🟢"),
            );

        expect(telegram.text).toContain("&lt;script&gt;");
        expect(telegram.text).not.toContain("<script>");
        expect(highlightLine).toBeDefined();
        expect(highlightLine!.length).toBeLessThanOrEqual(90);
    });

    it("falls back to legacy telegram template when v2 flag is disabled", async () => {
        vi.resetModules();
        vi.doMock("../config", async () => {
            const actual = await vi.importActual<typeof import("../config")>("../config");

            return {
                config: {
                    ...actual.config,
                    NOTIFICATIONS_TELEGRAM_TEMPLATE_V2: false,
                },
            };
        });

        const { renderImmediateTelegram: renderLegacyTelegram } = await import("./templates");
        const telegram = renderLegacyTelegram(immediatePayload);

        expect(telegram.parseMode).toBeUndefined();
        expect(telegram.text).toContain("PricePulse alert");
        expect(telegram.text).toContain("View in PricePulse");

        vi.doUnmock("../config");
        vi.resetModules();
    });

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
        expect(email.text).toContain("Preorders in this report: 0");
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
        expect(email.text).toContain("Preorders in this report: 0");
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
        expect(email.html).toContain("Preorders in this report:");
        expect(email.text).toContain("Catan & Friends");
        expect(email.text).toContain("https://mabrik.ee/toode/catan-friends");
    });

    it("renders watched changes section at the top when watched items exist", () => {
        const payloadWithWatched: ImmediateDeliveryPayload = {
            ...immediatePayload,
            report: {
                ...immediatePayload.report,
                totalChanges: 2,
            },
            changeItems: [
                {
                    ...immediatePayload.changeItems[0],
                    id: "watched-item",
                    isWatchedAtSend: true,
                    product: {
                        ...immediatePayload.changeItems[0].product,
                        name: "Watched Product",
                    },
                },
                {
                    ...immediatePayload.changeItems[0],
                    id: "regular-item",
                    isWatchedAtSend: false,
                    product: {
                        ...immediatePayload.changeItems[0].product,
                        name: "Regular Product",
                    },
                },
            ],
        };

        const email = renderImmediateEmail(payloadWithWatched);

        expect(email.text).toContain("Watched products changed (1)");
        expect(email.html).toContain("Watched products changed (1)");
        expect(email.html.indexOf("Watched products changed (1)")).toBeLessThan(email.html.indexOf("Price drops (2)"));
    });

    it("does not render watched section when no watched items exist", () => {
        const email = renderImmediateEmail({
            ...immediatePayload,
            changeItems: immediatePayload.changeItems.map((item) => ({
                ...item,
                isWatchedAtSend: false,
            })),
        });

        expect(email.text).not.toContain("Watched products changed");
        expect(email.html).not.toContain("Watched products changed");
    });
});
