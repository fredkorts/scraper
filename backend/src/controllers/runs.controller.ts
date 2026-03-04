import type { NextFunction, Request, Response } from "express";
import {
    dashboardHomeQuerySchema,
    runChangesQuerySchema,
    runIdParamSchema,
    runProductsQuerySchema,
    runsListQuerySchema,
} from "../schemas/runs";
import { getDashboardHome, getRunDetail, listRunChanges, listRunProducts, listRuns } from "../services/runs.service";

export const getDashboardHomeHandler = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const query = dashboardHomeQuerySchema.parse(req.query);
        const payload = await getDashboardHome(req.auth!.userId, req.auth!.role, query);
        res.status(200).json(payload);
    } catch (error) {
        next(error);
    }
};

export const listRunsHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const query = runsListQuerySchema.parse(req.query);
        const payload = await listRuns(req.auth!.userId, req.auth!.role, query);
        res.status(200).json(payload);
    } catch (error) {
        next(error);
    }
};

export const getRunDetailHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const params = runIdParamSchema.parse(req.params);
        const payload = await getRunDetail(req.auth!.userId, req.auth!.role, params.id);
        res.status(200).json(payload);
    } catch (error) {
        next(error);
    }
};

export const listRunProductsHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const params = runIdParamSchema.parse(req.params);
        const query = runProductsQuerySchema.parse(req.query);
        const payload = await listRunProducts(req.auth!.userId, req.auth!.role, params.id, query);
        res.status(200).json(payload);
    } catch (error) {
        next(error);
    }
};

export const listRunChangesHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const params = runIdParamSchema.parse(req.params);
        const query = runChangesQuerySchema.parse(req.query);
        const payload = await listRunChanges(req.auth!.userId, req.auth!.role, params.id, query);
        res.status(200).json(payload);
    } catch (error) {
        next(error);
    }
};
