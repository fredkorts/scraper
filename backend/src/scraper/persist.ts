import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import type { ParsedProduct, PersistedScrapeStats } from "./types";

const toDecimal = (value: string | undefined): Prisma.Decimal | undefined =>
    value === undefined ? undefined : new Prisma.Decimal(value);

interface PersistScrapeResultsInput {
    scrapeRunId: string;
    categoryId: string;
    products: ParsedProduct[];
    pagesScraped: number;
    parserWarnings: string[];
}

const hasTrackedChanges = (
    existing: {
        name: string;
        imageUrl: string;
        currentPrice: Prisma.Decimal;
        originalPrice: Prisma.Decimal | null;
        inStock: boolean;
    },
    incoming: ParsedProduct,
): boolean => {
    const incomingCurrentPrice = toDecimal(incoming.currentPrice)!;
    const incomingOriginalPrice = toDecimal(incoming.originalPrice) ?? null;

    return (
        existing.name !== incoming.name ||
        existing.imageUrl !== incoming.imageUrl ||
        existing.inStock !== incoming.inStock ||
        !existing.currentPrice.equals(incomingCurrentPrice) ||
        (existing.originalPrice === null
            ? incomingOriginalPrice !== null
            : incomingOriginalPrice === null || !existing.originalPrice.equals(incomingOriginalPrice))
    );
};

export const persistScrapeResults = async (
    input: PersistScrapeResultsInput,
): Promise<PersistedScrapeStats> => {
    const uniqueProducts = new Map<string, ParsedProduct>();
    for (const product of input.products) {
        uniqueProducts.set(product.externalUrl, product);
    }

    const scrapedUrls = [...uniqueProducts.keys()];
    let newProducts = 0;
    let priceChanges = 0;
    let missingProductUrls: string[] = [];

    await prisma.$transaction(
        async (tx) => {
            for (const product of uniqueProducts.values()) {
                const existing = await tx.product.findUnique({
                    where: { externalUrl: product.externalUrl },
                });

                const currentPrice = toDecimal(product.currentPrice)!;
                const originalPrice = toDecimal(product.originalPrice) ?? null;

                if (!existing) {
                    const created = await tx.product.create({
                        data: {
                            externalUrl: product.externalUrl,
                            name: product.name,
                            imageUrl: product.imageUrl,
                            currentPrice,
                            originalPrice,
                            inStock: product.inStock,
                            firstSeenAt: new Date(),
                            lastSeenAt: new Date(),
                        },
                    });

                    await tx.productCategory.upsert({
                        where: {
                            productId_categoryId: {
                                productId: created.id,
                                categoryId: input.categoryId,
                            },
                        },
                        update: {},
                        create: {
                            productId: created.id,
                            categoryId: input.categoryId,
                        },
                    });

                    await tx.productSnapshot.create({
                        data: {
                            scrapeRunId: input.scrapeRunId,
                            productId: created.id,
                            name: created.name,
                            price: created.currentPrice,
                            originalPrice: created.originalPrice,
                            inStock: created.inStock,
                            imageUrl: created.imageUrl,
                        },
                    });

                    newProducts += 1;
                    continue;
                }

                await tx.productCategory.upsert({
                    where: {
                        productId_categoryId: {
                            productId: existing.id,
                            categoryId: input.categoryId,
                        },
                    },
                    update: {},
                    create: {
                        productId: existing.id,
                        categoryId: input.categoryId,
                    },
                });

                const changed = hasTrackedChanges(existing, product);
                const currentPriceChanged = !existing.currentPrice.equals(currentPrice);

                await tx.product.update({
                    where: { id: existing.id },
                    data: {
                        name: product.name,
                        imageUrl: product.imageUrl,
                        currentPrice,
                        originalPrice,
                        inStock: product.inStock,
                        lastSeenAt: new Date(),
                    },
                });

                if (changed) {
                    await tx.productSnapshot.create({
                        data: {
                            scrapeRunId: input.scrapeRunId,
                            productId: existing.id,
                            name: product.name,
                            price: currentPrice,
                            originalPrice,
                            inStock: product.inStock,
                            imageUrl: product.imageUrl,
                        },
                    });
                }

                if (currentPriceChanged) {
                    priceChanges += 1;
                }
            }

            const missingProductLinks = await tx.productCategory.findMany({
                where: {
                    categoryId: input.categoryId,
                    product: {
                        externalUrl: {
                            notIn: scrapedUrls.length > 0 ? scrapedUrls : ["__none__"],
                        },
                    },
                },
                include: {
                    product: {
                        select: {
                            externalUrl: true,
                        },
                    },
                },
            });

            missingProductUrls = missingProductLinks.map((entry) => entry.product.externalUrl);
        },
        {
            maxWait: 10_000,
            timeout: 60_000,
        },
    );

    return {
        totalProducts: uniqueProducts.size,
        newProducts,
        priceChanges,
        pagesScraped: input.pagesScraped,
        parserWarnings: input.parserWarnings,
        missingProductUrls,
    };
};
