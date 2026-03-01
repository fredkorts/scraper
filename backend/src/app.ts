import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { MABRIK_CATEGORIES } from "@mabrik/shared";
import { ZodError } from "zod";
import { config } from "./config";
import { AppError } from "./lib/errors";
import { prisma } from "./lib/prisma";
import { authRouter } from "./routes/auth";

export const createApp = () => {
    const app = express();

    const apiLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: config.NODE_ENV === "test" ? 10_000 : 200,
        standardHeaders: true,
        legacyHeaders: false,
    });

    const authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: config.NODE_ENV === "test" ? 10_000 : 20,
        standardHeaders: true,
        legacyHeaders: false,
    });

    const paymentsLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: config.NODE_ENV === "test" ? 10_000 : 30,
        standardHeaders: true,
        legacyHeaders: false,
    });

    app.use(
        cors({
            origin: config.FRONTEND_URL,
            credentials: true,
        }),
    );
    app.use(helmet());
    app.use(cookieParser());
    app.use(express.json());
    app.use("/api", apiLimiter);
    app.use("/api/auth", authLimiter);
    app.use("/api/payments", paymentsLimiter);
    app.use("/api/auth", authRouter);

    app.get("/api/health", async (_req, res) => {
        try {
            await prisma.$queryRaw`SELECT 1`;

            res.json({
                status: "ok",
                database: "connected",
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
            });
        } catch (error) {
            console.error("Health check failed:", error);

            res.status(503).json({
                status: "error",
                database: "disconnected",
                timestamp: new Date().toISOString(),
            });
        }
    });

    app.get("/api/categories", (_req, res) => {
        res.json({ categories: MABRIK_CATEGORIES });
    });

    app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
        if (error instanceof ZodError) {
            res.status(400).json({
                error: "validation_error",
                message: error.issues[0]?.message ?? "Invalid request",
            });
            return;
        }

        if (error instanceof AppError) {
            res.status(error.statusCode).json({
                error: error.code,
                message: error.message,
            });
            return;
        }

        console.error("Unhandled error:", error);

        res.status(500).json({
            error: "internal_server_error",
            message: "An unexpected error occurred",
        });
    });

    return app;
};
