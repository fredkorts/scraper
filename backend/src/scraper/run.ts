import { ScrapeRunStatus } from "@prisma/client";
import { config } from "../config";
import { runDiffEngine } from "../diff/run";
import { isMainModule } from "../lib/is-main-module";
import { logger } from "../lib/logger";
import { prisma } from "../lib/prisma";
import { buildCategoryUrl, fetchCategoryPage, waitBetweenRequests } from "./fetch";
import { ScrapeExecutionError } from "./execution-error";
import { mapScrapeFailure, type ScrapeFailurePhase } from "./failure";
import { parseCategoryPage } from "./parse";
import { persistScrapeResults } from "./persist";
import { assertUrlAllowedByRobots } from "./robots";
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
    const scrapeLogger = logger.child({
        categoryId: category.id,
        scrapeRunId: scrapeRun.id,
    });
    let currentPageUrl: string | undefined;
    let currentPhase: ScrapeFailurePhase | undefined;

    try {
        const productsByUrl = new Map<string, ParsedProduct>();
        const parserWarnings: string[] = [];
        const visitedPageUrls = new Set<string>();
        let nextPageUrl: string | undefined = buildCategoryUrl(category.slug);
        let pagesScraped = 0;
        currentPageUrl = nextPageUrl;
        currentPhase = "robots";
        await assertUrlAllowedByRobots(nextPageUrl);
        currentPhase = undefined;

        while (nextPageUrl) {
            currentPageUrl = nextPageUrl;
            currentPhase = "fetch";

            if (visitedPageUrls.has(nextPageUrl)) {
                break;
            }

            if (pagesScraped >= config.SCRAPER_MAX_PAGES) {
                throw new Error("Scraper safety limit reached");
            }

            visitedPageUrls.add(nextPageUrl);
            const html = await fetchCategoryPage(nextPageUrl);
            currentPhase = "parse";
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

        currentPhase = "persist";

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
                errorMessage: null,
                failureCode: null,
                failurePhase: null,
                failurePageUrl: null,
                failurePageNumber: null,
                failureIsRetryable: null,
                failureTechnicalMessage: null,
                failureSummary: null,
                completedAt: new Date(),
            },
        });

        currentPhase = undefined;
        await runDiffEngine(scrapeRun.id);
        scrapeLogger.info("scrape_completed", {
            status: "completed",
            totalProducts: persisted.totalProducts,
            pagesScraped: persisted.pagesScraped,
            parserWarnings: persisted.parserWarnings.length,
        });

        return {
            scrapeRunId: scrapeRun.id,
            status: "completed",
            ...persisted,
        };
    } catch (error) {
        const failure = mapScrapeFailure(error, {
            pageUrl: currentPageUrl,
            phase: currentPhase,
        });

        await prisma.scrapeRun.update({
            where: { id: scrapeRun.id },
            data: {
                status: ScrapeRunStatus.FAILED,
                errorMessage: failure.summary,
                failureCode: failure.code,
                failurePhase: failure.phase ?? null,
                failurePageUrl: failure.pageUrl ?? null,
                failurePageNumber: failure.pageNumber ?? null,
                failureIsRetryable: failure.isRetryable,
                failureTechnicalMessage: failure.technicalMessage ?? null,
                failureSummary: failure.summary,
                durationMs: Date.now() - startedAt,
                completedAt: new Date(),
            },
        });
        scrapeLogger.error("scrape_failed", {
            failureCode: failure.code,
            failureSummary: failure.summary,
            failurePhase: failure.phase,
            failurePageUrl: failure.pageUrl,
            isRetryable: failure.isRetryable,
            error,
        });

        throw new ScrapeExecutionError({
            scrapeRunId: scrapeRun.id,
            failure,
            cause: error,
        });
    }
};

if (isMainModule(import.meta.url)) {
    prisma
        .$connect()
        .then(async () => {
            const cliCategoryArg = process.argv[2];

            if (!cliCategoryArg) {
                throw new Error("Expected category slug or UUID as the first argument");
            }

            const result = await scrapeCategory(cliCategoryArg);
            logger.info("scrape_cli_completed", {
                categoryIdOrSlug: cliCategoryArg,
                result,
            });
        })
        .catch((error) => {
            logger.error("scrape_cli_failed", {
                categoryIdOrSlug: process.argv[2],
                error,
            });
            process.exitCode = 1;
        })
        .finally(async () => {
            await prisma.$disconnect();
        });
}
