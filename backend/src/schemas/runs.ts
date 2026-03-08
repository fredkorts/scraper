import { z } from "zod";

const MAX_PAGE_SIZE = 100;
const MAX_PAGE = 500;
const MAX_OFFSET = 50_000;

const paginationShape = {
    page: z.coerce.number().int().min(1).max(MAX_PAGE).default(1),
    pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(25),
};

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
    })
    .superRefine(validatePaginationBounds);

export const runProductsQuerySchema = z
    .object({
        ...paginationShape,
        inStock: z
            .union([z.boolean(), z.enum(["true", "false"])])
            .transform((value) => (typeof value === "boolean" ? value : value === "true"))
            .optional(),
    })
    .superRefine(validatePaginationBounds);

export const runChangesQuerySchema = z
    .object({
        ...paginationShape,
        changeType: z.enum(["price_increase", "price_decrease", "new_product", "sold_out", "back_in_stock"]).optional(),
    })
    .superRefine(validatePaginationBounds);

export const changesListQuerySchema = z
    .object({
        ...paginationShape,
        sortBy: z.enum(["changedAt", "changeType", "productName", "categoryName"]).default("changedAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
        changeType: z.enum(["price_increase", "price_decrease", "new_product", "sold_out", "back_in_stock"]).optional(),
        categoryId: z.string().uuid().optional(),
        windowDays: z.coerce.number().int().min(1).max(30).default(7),
    })
    .superRefine(validatePaginationBounds);

export type RunsListQuery = z.infer<typeof runsListQuerySchema>;
export type RunProductsQuery = z.infer<typeof runProductsQuerySchema>;
export type RunChangesQuery = z.infer<typeof runChangesQuerySchema>;
export type ChangesListQuery = z.infer<typeof changesListQuerySchema>;
export type DashboardHomeQuery = z.infer<typeof dashboardHomeQuerySchema>;
