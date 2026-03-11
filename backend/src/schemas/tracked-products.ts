import { z } from "zod";

export const createTrackedProductSchema = z.object({
    productId: z.string().uuid(),
});

export const trackedProductByProductParamsSchema = z.object({
    productId: z.string().uuid(),
});
