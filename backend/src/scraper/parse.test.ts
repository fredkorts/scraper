import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { normalizeExternalUrl, parseCategoryPage, parsePriceToDecimal } from "./parse";

const fixture = readFileSync(join(import.meta.dirname, "__fixtures__", "category-page.html"), "utf8");
const templateFixture = readFileSync(
    join(import.meta.dirname, "__fixtures__", "category-page-template.html"),
    "utf8",
);
const liveTemplateFixture = readFileSync(
    join(import.meta.dirname, "__fixtures__", "mabrik-live-category-snippet.html"),
    "utf8",
);

describe("scraper parse helpers", () => {
    it("parses prices into two-decimal strings", () => {
        expect(parsePriceToDecimal("12,99 €")).toBe("12.99");
        expect(parsePriceToDecimal("12.99")).toBe("12.99");
        expect(parsePriceToDecimal("1.299,00 €")).toBe("1299.00");
    });

    it("normalizes relative product URLs", () => {
        expect(normalizeExternalUrl("/toode/test-game/")).toBe("https://mabrik.ee/toode/test-game");
        expect(normalizeExternalUrl("https://mabrik.ee/toode/test-game/")).toBe(
            "https://mabrik.ee/toode/test-game",
        );
    });

    it("parses product cards and next page link", () => {
        const result = parseCategoryPage(fixture);

        expect(result.parserWarnings).toHaveLength(0);
        expect(result.products).toHaveLength(3);
        expect(result.nextPageUrl).toBe("https://mabrik.ee/tootekategooria/lauamangud/page/2/");
        expect(result.products[0]).toMatchObject({
            externalUrl: "https://mabrik.ee/toode/test-game",
            name: "Test Game",
            currentPrice: "29.99",
            inStock: true,
        });
        expect(result.products[1]).toMatchObject({
            name: "Sale Game",
            currentPrice: "24.99",
            originalPrice: "39.99",
        });
        expect(result.products[2]).toMatchObject({
            name: "Out Of Stock Game",
            currentPrice: "12.99",
            inStock: false,
        });
    });

    it("parses product cards from embedded template markup", () => {
        const result = parseCategoryPage(templateFixture);

        expect(result.parserWarnings).toHaveLength(0);
        expect(result.products).toHaveLength(2);
        expect(result.nextPageUrl).toBe("https://mabrik.ee/tootekategooria/lauamangud/page/2/");
        expect(result.products[0]).toMatchObject({
            externalUrl: "https://mabrik.ee/toode/template-game",
            name: "Template Game",
            currentPrice: "16.90",
            inStock: true,
        });
        expect(result.products[1]).toMatchObject({
            externalUrl: "https://mabrik.ee/toode/template-sold-out",
            name: "Template Sold Out",
            currentPrice: "9.90",
            inStock: false,
        });
    });

    it("parses the live Mabrik archive template structure", () => {
        const result = parseCategoryPage(liveTemplateFixture);

        expect(result.parserWarnings).toHaveLength(0);
        expect(result.products).toHaveLength(2);
        expect(result.nextPageUrl).toBe("https://mabrik.ee/tootekategooria/lauamangud/page/2/");
        expect(result.products[0]).toMatchObject({
            externalUrl: "https://mabrik.ee/toode/flip-7-with-a-vengeance",
            name: "Flip 7: With A Vengeance",
            currentPrice: "16.90",
            inStock: true,
        });
        expect(result.products[1]).toMatchObject({
            externalUrl: "https://mabrik.ee/toode/enemies-lovers-the-crown-of-elfhame",
            name: "Enemies & Lovers: The Crown of Elfhame",
            currentPrice: "36.90",
            inStock: true,
        });
    });
});
