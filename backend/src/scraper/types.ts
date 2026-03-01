export interface ParsedProduct {
    externalUrl: string;
    name: string;
    imageUrl: string;
    currentPrice: string;
    originalPrice?: string;
    inStock: boolean;
}

export interface ParsedCategoryPage {
    products: ParsedProduct[];
    nextPageUrl?: string;
    parserWarnings: string[];
}

export interface PersistedScrapeStats {
    totalProducts: number;
    newProducts: number;
    priceChanges: number;
    pagesScraped: number;
    parserWarnings: string[];
    missingProductUrls: string[];
}

export interface ScrapeCategoryResult extends PersistedScrapeStats {
    scrapeRunId: string;
    status: "completed" | "failed";
}
