import { z } from "zod";

export const productIdParamSchema = z.object({
    id: z.string().uuid(),
});

export const productHistoryQuerySchema = z.object({});
