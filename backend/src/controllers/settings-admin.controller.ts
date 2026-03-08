import type { NextFunction, Request, Response } from "express";
import { categorySettingsParamSchema, triggerRunSchema, updateCategorySettingsSchema } from "../schemas/settings";
import { getAdminSchedulerState, triggerCategoryRun, updateCategorySettings } from "../services/settings-admin.service";

export const updateCategorySettingsHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const params = categorySettingsParamSchema.parse(req.params);
        const input = updateCategorySettingsSchema.parse(req.body);
        const payload = await updateCategorySettings(params.id, input.scrapeIntervalHours);
        res.status(200).json(payload);
    } catch (error) {
        next(error);
    }
};

export const triggerRunHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const input = triggerRunSchema.parse(req.body);
        const payload = await triggerCategoryRun(input.categoryId, req.requestId);
        res.status(202).json(payload);
    } catch (error) {
        next(error);
    }
};

export const getAdminSchedulerStateHandler = async (
    _req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const payload = await getAdminSchedulerState();
        res.status(200).json(payload);
    } catch (error) {
        next(error);
    }
};
