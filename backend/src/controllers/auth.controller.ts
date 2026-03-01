import type { NextFunction, Request, Response } from "express";
import { loginSchema, registerSchema } from "../schemas/auth";
import { getCurrentUser, login, logout, refreshSession, register } from "../services/auth.service";
import { clearAuthCookies, setAuthCookies, authCookieNames } from "../lib/cookies";

export const registerHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const input = registerSchema.parse(req.body);
        const result = await register(input);

        setAuthCookies(res, result.accessToken, result.refreshToken);
        res.status(201).json({ user: result.user });
    } catch (error) {
        next(error);
    }
};

export const loginHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const input = loginSchema.parse(req.body);
        const result = await login(input);

        setAuthCookies(res, result.accessToken, result.refreshToken);
        res.status(200).json({ user: result.user });
    } catch (error) {
        next(error);
    }
};

export const refreshHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const refreshToken = req.cookies[authCookieNames.refreshToken] as string | undefined;
        const result = await refreshSession(refreshToken ?? "");

        setAuthCookies(res, result.accessToken, result.refreshToken);
        res.status(200).json({ user: result.user });
    } catch (error) {
        next(error);
    }
};

export const logoutHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const refreshToken = req.cookies[authCookieNames.refreshToken] as string | undefined;
        const result = await logout(refreshToken);

        clearAuthCookies(res);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const meHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await getCurrentUser(req.auth!.userId);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};
