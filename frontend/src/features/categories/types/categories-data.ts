import type { z } from "zod";
import { categoriesResponseSchema } from "../schemas";

export type CategoriesData = z.infer<typeof categoriesResponseSchema>;
