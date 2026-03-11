import { z } from "zod";

const MAX_SEARCH_QUERY_LENGTH = 100;

export const productIdParamSchema = z.object({
    id: z.string().uuid(),
});

const includeSystemNoiseSchema = z
    .union([z.boolean(), z.enum(["true", "false"])])
    .transform((value) => (typeof value === "boolean" ? value : value === "true"))
    .default(false);

export const productDetailQuerySchema = z.object({
    includeSystemNoise: includeSystemNoiseSchema,
});

export const productHistoryQuerySchema = z.object({
    includeSystemNoise: includeSystemNoiseSchema,
});

const productSearchQueryValueSchema = z.preprocess((value) => {
    if (typeof value !== "string") {
        return undefined;
    }

    const normalized = value.trim().replace(/\s+/g, " ");
    return normalized.length > 0 ? normalized : undefined;
}, z.string().min(2).max(MAX_SEARCH_QUERY_LENGTH));

export const productSearchQuerySchema = z.object({
    query: productSearchQueryValueSchema,
    limit: z.coerce.number().int().min(1).max(10).default(8),
});

export type ProductDetailQuery = z.infer<typeof productDetailQuerySchema>;
export type ProductHistoryQuery = z.infer<typeof productHistoryQuerySchema>;
export type ProductSearchQuery = z.infer<typeof productSearchQuerySchema>;
