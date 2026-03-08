import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import { ZodError } from "zod";
import { config } from "./config";
import { AppError } from "./lib/errors";
import { logger, requestContextMiddleware } from "./lib/logger";
import { prisma } from "./lib/prisma";
import { apiReadLimiter, paymentsMutationLimiter } from "./middleware/rate-limit";
import { authRouter } from "./routes/auth";
import { adminRouter } from "./routes/admin";
import { categoriesRouter } from "./routes/categories";
import { changesRouter } from "./routes/changes";
import { dashboardRouter } from "./routes/dashboard";
import { notificationsRouter } from "./routes/notifications";
import { productsRouter } from "./routes/products";
import { runsRouter } from "./routes/runs";
import { subscriptionsRouter } from "./routes/subscriptions";

export const createApp = () => {
    const app = express();
    const frontendOrigin = new URL(config.FRONTEND_URL).origin;

    app.set("trust proxy", config.TRUST_PROXY_HOPS);

    app.use(
        cors({
            origin: frontendOrigin,
            credentials: true,
        }),
    );
    app.use(helmet());
    app.use(cookieParser());
    app.use(express.json());
    app.use(requestContextMiddleware);
    app.use("/api", apiReadLimiter);
    app.use("/api/payments", paymentsMutationLimiter);
    app.use("/api/auth", authRouter);
    app.use("/api/admin", adminRouter);
    app.use("/api/categories", categoriesRouter);
    app.use("/api/changes", changesRouter);
    app.use("/api/dashboard", dashboardRouter);
    app.use("/api/runs", runsRouter);
    app.use("/api/products", productsRouter);
    app.use("/api/notifications", notificationsRouter);
    app.use("/api/subscriptions", subscriptionsRouter);

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
            logger.error("health_check_failed", {
                error,
                requestId: _req.requestId,
            });

            res.status(503).json({
                status: "error",
                database: "disconnected",
                timestamp: new Date().toISOString(),
            });
        }
    });

    app.use((error: unknown, _req: Request, res: Response, next: NextFunction) => {
        void next;

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

        logger.error("unhandled_error", {
            error,
            requestId: _req.requestId,
        });

        res.status(500).json({
            error: "internal_server_error",
            message: "An unexpected error occurred",
        });
    });

    return app;
};
