import type { NextFunction, Request, Response } from "express";
import { listCategoriesQuerySchema } from "../schemas/categories";
import { listCategories } from "../services/categories.service";

export const listCategoriesHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const query = listCategoriesQuerySchema.parse(req.query);
        const payload = await listCategories(req.auth!.userId, req.auth!.role, query.scope ?? "tracked");
        res.status(200).json(payload);
    } catch (error) {
        next(error);
    }
};
