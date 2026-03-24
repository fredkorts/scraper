import { z } from "zod";

const MAX_PAGE_SIZE = 100;
const MAX_PAGE = 500;
const MAX_OFFSET = 50_000;
const MAX_SEARCH_QUERY_LENGTH = 100;
const CHANGE_TYPE_VALUES = ["price_increase", "price_decrease", "new_product", "sold_out", "back_in_stock"] as const;

const paginationShape = {
    page: z.coerce.number().int().min(1).max(MAX_PAGE).default(1),
    pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(25),
};

const preorderFilterSchema = z.enum(["all", "only", "exclude"]).default("all");
const changeTypeSchema = z.enum(CHANGE_TYPE_VALUES);
const changeTypeListSchema = z.preprocess((value) => {
    const splitAndNormalize = (rawValue: string): string[] =>
        rawValue
            .split(",")
            .map((entry) => entry.trim())
            .filter((entry) => entry.length > 0);

    if (Array.isArray(value)) {
        return value.flatMap((entry) => (typeof entry === "string" ? splitAndNormalize(entry) : []));
    }

    if (typeof value === "string") {
        return splitAndNormalize(value);
    }

    return undefined;
}, z.array(changeTypeSchema).min(1).optional());
const searchQuerySchema = z.preprocess((value) => {
    if (typeof value !== "string") {
        return undefined;
    }

    const normalized = value.trim().replace(/\s+/g, " ");
    return normalized.length > 0 ? normalized : undefined;
}, z.string().max(MAX_SEARCH_QUERY_LENGTH).optional());
const includeSystemNoiseSchema = z
    .union([z.boolean(), z.enum(["true", "false"])])
    .transform((value) => (typeof value === "boolean" ? value : value === "true"))
    .default(false);

const validatePaginationBounds = (value: { page: number; pageSize: number }, context: z.RefinementCtx): void => {
    const offset = (value.page - 1) * value.pageSize;

    if (offset > MAX_OFFSET) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["page"],
            message: `Pagination offset exceeds maximum supported range (${MAX_OFFSET}).`,
        });
    }
};

export const runIdParamSchema = z.object({
    id: z.string().uuid(),
});

export const runDetailQuerySchema = z.object({
    includeSystemNoise: includeSystemNoiseSchema,
});

export const dashboardHomeQuerySchema = z.object({
    categoryId: z.string().uuid().optional(),
});

export const runsListQuerySchema = z
    .object({
        ...paginationShape,
        sortBy: z.enum(["startedAt", "status", "totalChanges", "totalProducts", "durationMs"]).default("startedAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
        status: z.enum(["pending", "running", "completed", "failed"]).optional(),
        categoryId: z.string().uuid().optional(),
        includeSystemNoise: includeSystemNoiseSchema,
    })
    .superRefine(validatePaginationBounds);

export const runProductsQuerySchema = z
    .object({
        ...paginationShape,
        query: searchQuerySchema,
        inStock: z
            .union([z.boolean(), z.enum(["true", "false"])])
            .transform((value) => (typeof value === "boolean" ? value : value === "true"))
            .optional(),
        includeSystemNoise: includeSystemNoiseSchema,
    })
    .superRefine(validatePaginationBounds);

export const runChangesQuerySchema = z
    .object({
        ...paginationShape,
        query: searchQuerySchema,
        changeType: changeTypeSchema.optional(),
        preorder: preorderFilterSchema,
        includeSystemNoise: includeSystemNoiseSchema,
    })
    .superRefine(validatePaginationBounds);

export const changesListQuerySchema = z
    .object({
        ...paginationShape,
        query: searchQuerySchema,
        sortBy: z.enum(["changedAt", "changeType", "productName", "categoryName"]).default("changedAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
        changeType: changeTypeListSchema,
        preorder: preorderFilterSchema,
        categoryId: z.string().uuid().optional(),
        windowDays: z.coerce.number().int().min(1).max(30).default(7),
        includeSystemNoise: includeSystemNoiseSchema,
    })
    .superRefine(validatePaginationBounds);

export type RunsListQuery = z.infer<typeof runsListQuerySchema>;
export type RunDetailQuery = z.infer<typeof runDetailQuerySchema>;
export type RunProductsQuery = z.infer<typeof runProductsQuerySchema>;
export type RunChangesQuery = z.infer<typeof runChangesQuerySchema>;
export type ChangesListQuery = z.infer<typeof changesListQuerySchema>;
export type DashboardHomeQuery = z.infer<typeof dashboardHomeQuerySchema>;
