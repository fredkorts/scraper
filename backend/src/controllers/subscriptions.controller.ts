import type { NextFunction, Request, Response } from "express";
import { createSubscriptionSchema, subscriptionIdParamSchema } from "../schemas/settings";
import { createSubscription, deleteSubscription, listSubscriptions } from "../services/subscription.service";

export const listSubscriptionsHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const payload = await listSubscriptions(req.auth!.userId, req.auth!.role);
        res.status(200).json(payload);
    } catch (error) {
        next(error);
    }
};

export const createSubscriptionHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const input = createSubscriptionSchema.parse(req.body);
        const item = await createSubscription(req.auth!.userId, req.auth!.role, input.categoryId);
        res.status(201).json({ item });
    } catch (error) {
        next(error);
    }
};

export const deleteSubscriptionHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const params = subscriptionIdParamSchema.parse(req.params);
        const result = await deleteSubscription(req.auth!.userId, req.auth!.role, params.id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};
