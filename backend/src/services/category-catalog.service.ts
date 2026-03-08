import { load, type Cheerio } from "cheerio";
import type { Element } from "domhandler";
import { DEFAULT_SCRAPE_INTERVAL } from "@mabrik/shared";
import { config } from "../config";
import { http } from "../lib/http";
import { prisma } from "../lib/prisma";

const CATEGORY_PATH_PREFIX = "/tootekategooria/";
const DEFAULT_MAX_DEACTIVATE_RATIO = 0.5;

export interface DiscoveredCategory {
    slug: string;
    nameEt: string;
    parentSlug: string | null;
    depth: number;
    sourceOrder: number;
}

export interface CategoryCatalogRefreshSummary {
    applied: boolean;
    discoveredCount: number;
    createdCount: number;
    updatedCount: number;
    reactivatedCount: number;
    reparentedCount: number;
    deactivatedCount: number;
    deactivatedSlugs: string[];
}

interface RefreshCategoryCatalogOptions {
    apply?: boolean;
    maxDeactivateRatio?: number;
}

const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, " ").trim();

export const normalizeCategorySlug = (href: string): string | null => {
    let url: URL;

    try {
        url = new URL(href, config.SCRAPER_BASE_URL);
    } catch {
        return null;
    }

    const decodedPath = decodeURIComponent(url.pathname).replace(/\/{2,}/g, "/");

    if (!decodedPath.startsWith(CATEGORY_PATH_PREFIX)) {
        return null;
    }

    const slug = decodedPath
        .slice(CATEGORY_PATH_PREFIX.length)
        .replace(/^\/+|\/+$/g, "")
        .toLowerCase();

    return slug || null;
};

const getDirectCategoryAnchor = ($: ReturnType<typeof load>, item: Element): Cheerio<Element> => {
    const children = $(item).children().not("ul,ol");
    const directAnchor = children.filter("a[href]").first();

    if (directAnchor.length > 0) {
        return directAnchor;
    }

    return children.find("a[href]").first();
};

const extractCategoriesFromList = (
    $: ReturnType<typeof load>,
    listElement: Element,
    parentSlug: string | null,
    depth: number,
    seenSlugs: Set<string>,
    state: { order: number },
): DiscoveredCategory[] => {
    const discovered: DiscoveredCategory[] = [];
    const items = $(listElement).children("li");

    items.each((_, item) => {
        const directAnchor = getDirectCategoryAnchor($, item);
        const slug = directAnchor.length > 0 ? normalizeCategorySlug(directAnchor.attr("href") ?? "") : null;
        const nameEt = directAnchor.length > 0 ? normalizeWhitespace(directAnchor.text()) : "";
        const nestedLists = $(item).children("ul,ol");

        let currentParentSlug = parentSlug;
        let currentDepth = depth;

        if (slug && nameEt && !seenSlugs.has(slug)) {
            seenSlugs.add(slug);
            currentParentSlug = parentSlug;
            currentDepth = depth;
            discovered.push({
                slug,
                nameEt,
                parentSlug,
                depth,
                sourceOrder: state.order++,
            });
        } else if (slug && nameEt) {
            currentParentSlug = slug;
            currentDepth = depth;
        }

        if (slug && nameEt) {
            currentParentSlug = slug;
            currentDepth = depth + 1;
        }

        nestedLists.each((__, nestedList) => {
            discovered.push(
                ...extractCategoriesFromList($, nestedList, currentParentSlug, currentDepth, seenSlugs, state),
            );
        });
    });

    return discovered;
};

export const parseCategoryCatalog = (html: string): DiscoveredCategory[] => {
    const $ = load(html);
    const candidates = $("ul,ol")
        .toArray()
        .map((listElement) => {
            const seenSlugs = new Set<string>();
            const state = { order: 0 };
            const categories = extractCategoriesFromList($, listElement, null, 0, seenSlugs, state);
            const maxDepth = categories.reduce((highest, category) => Math.max(highest, category.depth), 0);

            return {
                categories,
                score: {
                    count: categories.length,
                    maxDepth,
                },
            };
        })
        .filter((candidate) => candidate.score.count > 0)
        .sort((left, right) => {
            if (right.score.count !== left.score.count) {
                return right.score.count - left.score.count;
            }

            return right.score.maxDepth - left.score.maxDepth;
        });

    const bestCandidate = candidates[0];

    if (!bestCandidate || bestCandidate.score.count < 3) {
        throw new Error("Could not discover a reliable category catalog from the fetched HTML.");
    }

    return bestCandidate.categories.map((category, index) => ({
        ...category,
        sourceOrder: index,
    }));
};

export const fetchCategoryCatalogHtml = async (): Promise<string> => {
    const response = await http.get<string>(config.SCRAPER_BASE_URL);
    return response.data;
};

const deriveUpdatedEnglishName = (existingNameEt: string, existingNameEn: string, discoveredNameEt: string): string => {
    if (existingNameEn === existingNameEt) {
        return discoveredNameEt;
    }

    return existingNameEn;
};

export const refreshCategoryCatalog = async (
    options: RefreshCategoryCatalogOptions = {},
): Promise<CategoryCatalogRefreshSummary> => {
    const apply = options.apply ?? false;
    const maxDeactivateRatio = options.maxDeactivateRatio ?? DEFAULT_MAX_DEACTIVATE_RATIO;
    const html = await fetchCategoryCatalogHtml();
    const discoveredCategories = parseCategoryCatalog(html);
    const existingCategories = await prisma.category.findMany();

    const existingBySlug = new Map(existingCategories.map((category) => [category.slug, category] as const));
    const discoveredBySlug = new Map(discoveredCategories.map((category) => [category.slug, category] as const));
    const activeExistingCategories = existingCategories.filter((category) => category.isActive);
    const categoriesToDeactivate = activeExistingCategories.filter((category) => !discoveredBySlug.has(category.slug));
    const deactivateRatio =
        activeExistingCategories.length === 0 ? 0 : categoriesToDeactivate.length / activeExistingCategories.length;

    if (categoriesToDeactivate.length > 0 && deactivateRatio > maxDeactivateRatio) {
        throw new Error(
            `Category refresh aborted because ${categoriesToDeactivate.length} of ${activeExistingCategories.length} active categories would be deactivated.`,
        );
    }

    let createdCount = 0;
    let updatedCount = 0;
    let reactivatedCount = 0;
    let reparentedCount = 0;

    for (const discovered of discoveredCategories) {
        const existing = existingBySlug.get(discovered.slug);

        if (!existing) {
            createdCount += 1;
            continue;
        }

        if (!existing.isActive) {
            reactivatedCount += 1;
        }

        if (existing.nameEt !== discovered.nameEt) {
            updatedCount += 1;
        }

        const existingParentSlug = existing.parentId
            ? (existingCategories.find((category) => category.id === existing.parentId)?.slug ?? null)
            : null;

        if (existingParentSlug !== discovered.parentSlug) {
            reparentedCount += 1;
        }
    }

    if (apply) {
        await prisma.$transaction(
            async (tx) => {
                const categoryIdsBySlug = new Map<string, string>();

                for (const discovered of discoveredCategories) {
                    const existing = existingBySlug.get(discovered.slug);
                    const record = await tx.category.upsert({
                        where: { slug: discovered.slug },
                        update: {
                            nameEt: discovered.nameEt,
                            nameEn: existing
                                ? deriveUpdatedEnglishName(existing.nameEt, existing.nameEn, discovered.nameEt)
                                : discovered.nameEt,
                            isActive: true,
                        },
                        create: {
                            slug: discovered.slug,
                            nameEt: discovered.nameEt,
                            nameEn: discovered.nameEt,
                            isActive: true,
                            scrapeIntervalHours: existing?.scrapeIntervalHours ?? DEFAULT_SCRAPE_INTERVAL,
                        },
                    });

                    categoryIdsBySlug.set(discovered.slug, record.id);
                }

                for (const discovered of discoveredCategories) {
                    await tx.category.update({
                        where: { slug: discovered.slug },
                        data: {
                            parentId: discovered.parentSlug
                                ? (categoryIdsBySlug.get(discovered.parentSlug) ?? null)
                                : null,
                        },
                    });
                }

                if (categoriesToDeactivate.length > 0) {
                    await tx.category.updateMany({
                        where: {
                            slug: {
                                in: categoriesToDeactivate.map((category) => category.slug),
                            },
                        },
                        data: {
                            isActive: false,
                        },
                    });
                }
            },
            {
                maxWait: 10_000,
                timeout: 120_000,
            },
        );
    }

    return {
        applied: apply,
        discoveredCount: discoveredCategories.length,
        createdCount,
        updatedCount,
        reactivatedCount,
        reparentedCount,
        deactivatedCount: categoriesToDeactivate.length,
        deactivatedSlugs: categoriesToDeactivate.map((category) => category.slug),
    };
};
