import { z } from "zod";

export const listCategoriesQuerySchema = z.object({
    scope: z.enum(["tracked", "all"]).optional(),
});
