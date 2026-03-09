import { z } from "zod";

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

export type ProductDetailQuery = z.infer<typeof productDetailQuerySchema>;
export type ProductHistoryQuery = z.infer<typeof productHistoryQuerySchema>;
