import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import { config } from "../config";
import { productSelectors } from "./selectors";
import type { ParsedCategoryPage, ParsedProduct } from "./types";

const buildAbsoluteUrl = (value: string): string => new URL(value, config.SCRAPER_BASE_URL).toString();

export const normalizeExternalUrl = (value: string): string => {
    const url = new URL(buildAbsoluteUrl(value));
    url.hash = "";
    if (url.pathname !== "/" && url.pathname.endsWith("/")) {
        url.pathname = url.pathname.slice(0, -1);
    }
    return url.toString();
};

export const parsePriceToDecimal = (value: string): string => {
    const normalized = value
        .replace(/\s/g, "")
        .replace("EUR", "")
        .replace("€", "")
        .replace(/(\d)\.(?=\d{3}\b)/g, "$1")
        .replace(",", ".");

    const match = normalized.match(/-?\d+(?:\.\d{1,2})?/);
    if (!match) {
        throw new Error(`Unable to parse price value: ${value}`);
    }

    return Number(match[0]).toFixed(2);
};

const parseProductCard = (element: AnyNode, $: cheerio.CheerioAPI): ParsedProduct => {
    const card = $(element);

    const linkHref =
        card.find(productSelectors.productLink).first().attr("href") ??
        card.find("a").first().attr("href");
    const name = card.find(productSelectors.title).first().text().trim();
    const imageUrl =
        card.find(productSelectors.image).first().attr("data-lazy-src") ??
        card.find(productSelectors.image).first().attr("data-src") ??
        card.find(productSelectors.image).first().attr("src");

    if (!linkHref || !name || !imageUrl) {
        throw new Error("Missing required product fields");
    }

    const originalPriceText = card.find(productSelectors.originalPrice).first().text().trim();
    const salePriceText = card.find(productSelectors.salePrice).first().text().trim();
    const priceText = card.find(productSelectors.currentPrice).first().text().trim();
    const effectiveCurrentPrice = salePriceText || priceText;

    if (!effectiveCurrentPrice) {
        throw new Error("Missing product price");
    }

    const inStock = (() => {
        const cardClass = card.attr("class")?.toLowerCase() ?? "";
        if (cardClass.includes("outofstock") || cardClass.includes("out-of-stock")) {
            return false;
        }

        if (cardClass.includes("instock") || cardClass.includes("in-stock")) {
            return true;
        }

        if (card.find(productSelectors.outOfStock).length > 0) {
            return false;
        }

        if (card.find(productSelectors.inStock).length > 0) {
            return true;
        }

        const cardText = card.text().toLowerCase();
        if (cardText.includes("out of stock") || cardText.includes("laost otsas")) {
            return false;
        }
        if (cardText.includes("in stock") || cardText.includes("laos")) {
            return true;
        }

        throw new Error("Unable to determine stock state");
    })();

    return {
        externalUrl: normalizeExternalUrl(linkHref),
        name,
        imageUrl: buildAbsoluteUrl(imageUrl),
        currentPrice: parsePriceToDecimal(effectiveCurrentPrice),
        originalPrice: originalPriceText ? parsePriceToDecimal(originalPriceText) : undefined,
        inStock,
    };
};

const extractTemplateProductMarkup = ($: cheerio.CheerioAPI): string | undefined => {
    const templateText = $(productSelectors.productTemplateScript).first().html()?.trim();
    if (!templateText) {
        return undefined;
    }

    try {
        return JSON.parse(templateText) as string;
    } catch {
        return templateText.replace(/^"|"$/g, "").replace(/\\"/g, "\"").replace(/\\\//g, "/");
    }
};

export const parseCategoryPage = (html: string): ParsedCategoryPage => {
    const $ = cheerio.load(html);
    const parserWarnings: string[] = [];
    const products: ParsedProduct[] = [];

    const templateMarkup = extractTemplateProductMarkup($);
    const productDom = templateMarkup ? cheerio.load(templateMarkup) : $;

    productDom(productSelectors.productCard).each((_index, element) => {
        try {
            products.push(parseProductCard(element, productDom));
        } catch (error) {
            parserWarnings.push(
                error instanceof Error ? error.message : "Unknown product parse error",
            );
        }
    });

    const nextHref = $(productSelectors.nextPage).first().attr("href");

    return {
        products,
        nextPageUrl: nextHref ? buildAbsoluteUrl(nextHref) : undefined,
        parserWarnings,
    };
};
