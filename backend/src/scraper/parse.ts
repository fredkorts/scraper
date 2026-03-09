import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import { config } from "../config";
import { productSelectors } from "./selectors";
import { extractPreorderEtaDate, hasPreorderMarker } from "./preorder";
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

type PriceExtractionSource = "sale_pair" | "regular" | "fallback";

interface PriceExtractionResult {
    currentPriceText: string;
    originalPriceText?: string;
    source: PriceExtractionSource;
    warning?: string;
}

const canonicalPriceAmountSelector = ".woocommerce-Price-amount.amount, .amount, bdi, .woocommerce-Price-amount";

const nonPriceMarkerPattern = /%|save|campaign|allahindlus|soodus|liikme|member/i;

const extractNodeText = (node: cheerio.Cheerio<AnyNode>): string => node.text().trim();

const parseComparablePrice = (value: string): number => Number.parseFloat(parsePriceToDecimal(value));

const extractPriceFromCard = (card: cheerio.Cheerio<AnyNode>, $: cheerio.CheerioAPI): PriceExtractionResult => {
    const priceContainer = card.find(".price").first();
    if (priceContainer.length === 0) {
        throw new Error("Missing product price");
    }

    const candidateNodes = priceContainer.find(canonicalPriceAmountSelector).toArray();
    const firstParseableText = (nodes: AnyNode[]): string | undefined => {
        for (const node of nodes) {
            const text = extractNodeText($(node));
            if (!text || nonPriceMarkerPattern.test(text)) {
                continue;
            }

            try {
                parsePriceToDecimal(text);
                return text;
            } catch {
                continue;
            }
        }

        return undefined;
    };
    const insText = firstParseableText(candidateNodes.filter((node) => $(node).closest("ins").length > 0));
    const delText = firstParseableText(candidateNodes.filter((node) => $(node).closest("del").length > 0));

    if (insText && delText) {
        try {
            const insValue = parseComparablePrice(insText);
            const delValue = parseComparablePrice(delText);

            if (Number.isFinite(insValue) && Number.isFinite(delValue) && delValue > insValue) {
                return {
                    currentPriceText: insText,
                    originalPriceText: delText,
                    source: "sale_pair",
                };
            }
        } catch {
            // Fall through to regular-price detection.
        }
    }

    const regularNodes = candidateNodes.filter((node) => {
        const wrapped = $(node);
        return wrapped.closest("ins").length === 0 && wrapped.closest("del").length === 0;
    });

    for (const node of regularNodes) {
        const wrapped = $(node);
        const text = extractNodeText(wrapped);
        if (!text || nonPriceMarkerPattern.test(text)) {
            continue;
        }

        try {
            parsePriceToDecimal(text);
            return {
                currentPriceText: text,
                source: "regular",
            };
        } catch {
            continue;
        }
    }

    for (const node of candidateNodes) {
        const wrapped = $(node);
        const text = extractNodeText(wrapped);
        if (!text || nonPriceMarkerPattern.test(text)) {
            continue;
        }

        try {
            parsePriceToDecimal(text);
            return {
                currentPriceText: text,
                source: "fallback",
                warning: "Price extraction used fallback strategy",
            };
        } catch {
            continue;
        }
    }

    throw new Error("Missing product price");
};

const parseProductCard = (element: AnyNode, $: cheerio.CheerioAPI, parserWarnings: string[]): ParsedProduct => {
    const card = $(element);

    const linkHref =
        card.find(productSelectors.productLink).first().attr("href") ?? card.find("a").first().attr("href");
    const name = card.find(productSelectors.title).first().text().trim();
    const imageUrl =
        card.find(productSelectors.image).first().attr("data-lazy-src") ??
        card.find(productSelectors.image).first().attr("data-src") ??
        card.find(productSelectors.image).first().attr("src");

    if (!linkHref || !name || !imageUrl) {
        throw new Error("Missing required product fields");
    }

    const priceExtraction = extractPriceFromCard(card, $);
    if (priceExtraction.warning) {
        parserWarnings.push(`${priceExtraction.warning}: ${name} (${priceExtraction.source})`);
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

    const cardText = card.text();
    const cardEtaCandidate = extractPreorderEtaDate(cardText);
    const titleEtaCandidate = cardEtaCandidate ? null : extractPreorderEtaDate(name);
    const preorderEtaCandidate = cardEtaCandidate ?? titleEtaCandidate;
    const hasCardPreorderMarker = hasPreorderMarker(cardText);
    const hasTitlePreorderMarker = hasPreorderMarker(name);
    const isPreorderCandidate = preorderEtaCandidate !== null || hasCardPreorderMarker || hasTitlePreorderMarker;
    const preorderDetectedFromCandidate =
        cardEtaCandidate || hasCardPreorderMarker
            ? "DESCRIPTION"
            : titleEtaCandidate || hasTitlePreorderMarker
              ? "TITLE"
              : undefined;

    return {
        externalUrl: normalizeExternalUrl(linkHref),
        name,
        imageUrl: buildAbsoluteUrl(imageUrl),
        currentPrice: parsePriceToDecimal(priceExtraction.currentPriceText),
        originalPrice: priceExtraction.originalPriceText
            ? parsePriceToDecimal(priceExtraction.originalPriceText)
            : undefined,
        inStock,
        isPreorderCandidate,
        preorderEtaCandidate: preorderEtaCandidate ?? undefined,
        preorderDetectedFromCandidate,
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
        return templateText.replace(/^"|"$/g, "").replace(/\\"/g, '"').replace(/\\\//g, "/");
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
            products.push(parseProductCard(element, productDom, parserWarnings));
        } catch (error) {
            parserWarnings.push(error instanceof Error ? error.message : "Unknown product parse error");
        }
    });

    const nextHref = $(productSelectors.nextPage).first().attr("href");

    return {
        products,
        nextPageUrl: nextHref ? buildAbsoluteUrl(nextHref) : undefined,
        parserWarnings,
    };
};
