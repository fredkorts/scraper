import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { mockUser, renderRouterApp } from "../router-utils";

describe("route a11y smoke checks", () => {
    it("exposes labeled auth controls on login", async () => {
        await renderRouterApp({ initialEntry: "/login", session: null });

        expect(await screen.findByRole("main")).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
        expect(screen.getByLabelText("Email")).toBeInTheDocument();
        expect(screen.getByLabelText("Password")).toBeInTheDocument();
    });

    it("exposes exactly one main landmark in authenticated shell", async () => {
        await renderRouterApp({ initialEntry: "/app", session: mockUser });

        expect(await screen.findByRole("heading", { name: "Dashboard Home" })).toBeInTheDocument();
        expect(screen.getAllByRole("main")).toHaveLength(1);
        expect(screen.getByRole("button", { name: "Open account menu" })).toBeInTheDocument();
    });

    it("does not render nested interactive elements in product detail", async () => {
        await renderRouterApp({
            initialEntry: "/app/products/55555555-5555-4555-8555-555555555555",
            session: mockUser,
            apiResponses: {
                productDetail: {
                    product: {
                        id: "55555555-5555-4555-8555-555555555555",
                        name: "Test Product",
                        imageUrl: "https://mabrik.ee/images/test.jpg",
                        externalUrl: "https://mabrik.ee/toode/test-product",
                        currentPrice: 19.99,
                        originalPrice: 24.99,
                        inStock: true,
                        firstSeenAt: new Date("2026-02-20T10:00:00.000Z").toISOString(),
                        lastSeenAt: new Date("2026-03-01T10:00:00.000Z").toISOString(),
                        historyPointCount: 2,
                        categories: [
                            {
                                id: "22222222-2222-4222-8222-222222222222",
                                slug: "board-games",
                                nameEt: "Board Games",
                                nameEn: "Board Games",
                            },
                        ],
                        recentRuns: [],
                    },
                },
                productHistory: {
                    items: [
                        {
                            id: "77777777-7777-4777-8777-777777777777",
                            scrapeRunId: "11111111-1111-4111-8111-111111111111",
                            categoryId: "22222222-2222-4222-8222-222222222222",
                            categoryName: "Board Games",
                            price: 24.99,
                            originalPrice: 29.99,
                            inStock: true,
                            scrapedAt: new Date("2026-02-20T10:00:00.000Z").toISOString(),
                        },
                    ],
                },
            },
        });

        expect(await screen.findByRole("main")).toBeInTheDocument();
        expect(await screen.findByText(/Loading product detail|Test Product/i)).toBeInTheDocument();
        expect(document.querySelector("a button")).toBeNull();
        expect(document.querySelector("button a")).toBeNull();
    });
});
