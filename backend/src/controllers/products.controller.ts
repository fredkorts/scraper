import type { NextFunction, Request, Response } from "express";
import { productHistoryQuerySchema, productIdParamSchema } from "../schemas/products";
import { getProductDetail, getProductHistory } from "../services/products.service";

export const getProductDetailHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const params = productIdParamSchema.parse(req.params);
        const payload = await getProductDetail(req.auth!.userId, req.auth!.role, params.id);
        res.status(200).json(payload);
    } catch (error) {
        next(error);
    }
};

export const getProductHistoryHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const params = productIdParamSchema.parse(req.params);
        productHistoryQuerySchema.parse(req.query);
        const payload = await getProductHistory(req.auth!.userId, req.auth!.role, params.id);
        res.status(200).json(payload);
    } catch (error) {
        next(error);
    }
};
