import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { MABRIK_CATEGORIES } from "@mabrik/shared";
import { config } from "./config";
import { prisma } from "./lib/prisma";

const app = express();

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 200,
    standardHeaders: true,
    legacyHeaders: false,
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
});

const paymentsLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
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

const start = async () => {
    await prisma.$connect();

    app.listen(config.PORT, () => {
        console.log(`Mabrik Scraper API running on http://localhost:${config.PORT}`);
        console.log(`Tracking ${MABRIK_CATEGORIES.length} categories`);
    });
};

start().catch(async (error) => {
    console.error("Failed to start server:", error);
    await prisma.$disconnect();
    process.exit(1);
});
