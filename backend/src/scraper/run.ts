import { ScrapeRunStatus } from "@prisma/client";
import { config } from "../config";
import { prisma } from "../lib/prisma";
import { buildCategoryUrl, fetchCategoryPage, waitBetweenRequests } from "./fetch";
import { parseCategoryPage } from "./parse";
import { persistScrapeResults } from "./persist";
import type { ParsedProduct, ScrapeCategoryResult } from "./types";

const PARSER_WARNING_LIMIT = 5;

export const scrapeCategory = async (categoryIdOrSlug: string): Promise<ScrapeCategoryResult> => {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        categoryIdOrSlug,
    );

    const category = isUuid
        ? await prisma.category.findUnique({
              where: { id: categoryIdOrSlug },
          })
        : await prisma.category.findUnique({
              where: { slug: categoryIdOrSlug },
          });

    if (!category) {
        throw new Error(`Category not found: ${categoryIdOrSlug}`);
    }

    const startedAt = Date.now();
    const scrapeRun = await prisma.scrapeRun.create({
        data: {
            categoryId: category.id,
            status: ScrapeRunStatus.RUNNING,
        },
    });

    try {
        const productsByUrl = new Map<string, ParsedProduct>();
        const parserWarnings: string[] = [];
        const visitedPageUrls = new Set<string>();
        let nextPageUrl: string | undefined = buildCategoryUrl(category.slug);
        let pagesScraped = 0;

        while (nextPageUrl) {
            if (visitedPageUrls.has(nextPageUrl)) {
                break;
            }

            if (pagesScraped >= config.SCRAPER_MAX_PAGES) {
                throw new Error("Scraper safety limit reached");
            }

            visitedPageUrls.add(nextPageUrl);
            const html = await fetchCategoryPage(nextPageUrl);
            const parsed = parseCategoryPage(html);

            parserWarnings.push(...parsed.parserWarnings);

            if (parsed.products.length === 0 && pagesScraped === 0) {
                throw new Error("Parser produced zero valid products on the first page");
            }

            if (parsed.parserWarnings.length > PARSER_WARNING_LIMIT) {
                throw new Error("Too many parser warnings on a single page");
            }

            for (const product of parsed.products) {
                productsByUrl.set(product.externalUrl, product);
            }

            pagesScraped += 1;
            nextPageUrl = parsed.nextPageUrl;

            if (nextPageUrl) {
                await waitBetweenRequests();
            }
        }

        const persisted = await persistScrapeResults({
            scrapeRunId: scrapeRun.id,
            categoryId: category.id,
            products: [...productsByUrl.values()],
            pagesScraped,
            parserWarnings,
        });

        await prisma.scrapeRun.update({
            where: { id: scrapeRun.id },
            data: {
                status: ScrapeRunStatus.COMPLETED,
                totalProducts: persisted.totalProducts,
                newProducts: persisted.newProducts,
                priceChanges: persisted.priceChanges,
                soldOut: 0,
                backInStock: 0,
                pagesScraped: persisted.pagesScraped,
                durationMs: Date.now() - startedAt,
                completedAt: new Date(),
            },
        });

        return {
            scrapeRunId: scrapeRun.id,
            status: "completed",
            ...persisted,
        };
    } catch (error) {
        await prisma.scrapeRun.update({
            where: { id: scrapeRun.id },
            data: {
                status: ScrapeRunStatus.FAILED,
                errorMessage: error instanceof Error ? error.message : "Unknown scraper error",
                durationMs: Date.now() - startedAt,
                completedAt: new Date(),
            },
        });

        throw error;
    }
};

const cliCategoryArg = process.argv[2];

if (cliCategoryArg) {
    prisma
        .$connect()
        .then(async () => {
            const result = await scrapeCategory(cliCategoryArg);
            console.log(JSON.stringify(result, null, 2));
        })
        .catch((error) => {
            console.error(error);
            process.exitCode = 1;
        })
        .finally(async () => {
            await prisma.$disconnect();
        });
}
