import "dotenv/config";
import express from "express";
import cors from "cors";
import { MABRIK_CATEGORIES } from "@mabrik/shared";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/api/health", (_req, res) => {
    res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

// Categories endpoint (reference data)
app.get("/api/categories", (_req, res) => {
    res.json({ categories: MABRIK_CATEGORIES });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Mabrik Scraper API running on http://localhost:${PORT}`);
    console.log(`📦 Tracking ${MABRIK_CATEGORIES.length} categories`);
});
