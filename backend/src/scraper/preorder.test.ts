import { describe, expect, it } from "vitest";
import { classifyPreorder, extractPreorderEtaDate } from "./preorder";
import type { ParsedProduct } from "./types";

const buildParsedProduct = (overrides: Partial<ParsedProduct> = {}): ParsedProduct => ({
    externalUrl: "https://mabrik.ee/toode/test-item",
    name: "Test Item",
    imageUrl: "https://mabrik.ee/images/test-item.jpg",
    currentPrice: "19.99",
    inStock: true,
    ...overrides,
});

describe("preorder classification", () => {
    it("extracts ETA date from estonian text", () => {
        const parsed = extractPreorderEtaDate("Tegemist on eeltellimusega! Saabumise kuupäev: 19/06/2026");
        expect(parsed?.toISOString().slice(0, 10)).toBe("2026-06-19");
    });

    it("marks products as preorder when title includes preorder marker", () => {
        const result = classifyPreorder(buildParsedProduct({ name: "Pokemon Preorder Box" }), "kaardimangud");
        expect(result.isPreorder).toBe(true);
        expect(result.preorderDetectedFrom).toBe("TITLE");
    });

    it("marks products as preorder when category slug indicates preorder", () => {
        const result = classifyPreorder(buildParsedProduct({ name: "Pokemon Box" }), "eeltellimused");
        expect(result.isPreorder).toBe(true);
        expect(result.preorderDetectedFrom).toBe("CATEGORY_SLUG");
    });

    it("does not mark products as preorder when no signal is present", () => {
        const result = classifyPreorder(buildParsedProduct({ name: "Pokemon Box" }), "kaardimangud");
        expect(result.isPreorder).toBe(false);
        expect(result.preorderEta).toBeNull();
        expect(result.preorderDetectedFrom).toBeNull();
    });
});
