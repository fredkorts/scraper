import type { NextFunction, Request, Response } from "express";
import { createTrackedProductSchema, trackedProductByProductParamsSchema } from "../schemas/tracked-products";
import { listTrackedProducts, trackProduct, untrackProductByProductId } from "../services/tracked-product.service";

export const listTrackedProductsHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const payload = await listTrackedProducts(req.auth!.userId, req.auth!.role);
        res.status(200).json(payload);
    } catch (error) {
        next(error);
    }
};

export const trackProductHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const input = createTrackedProductSchema.parse(req.body);
        const payload = await trackProduct(req.auth!.userId, req.auth!.role, input.productId);
        res.status(201).json(payload);
    } catch (error) {
        next(error);
    }
};

export const untrackProductByProductIdHandler = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const params = trackedProductByProductParamsSchema.parse(req.params);
        const payload = await untrackProductByProductId(req.auth!.userId, params.productId);
        res.status(200).json(payload);
    } catch (error) {
        next(error);
    }
};
