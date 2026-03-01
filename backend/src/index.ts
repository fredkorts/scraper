import "dotenv/config";
import { config } from "./config";
import { prisma } from "./lib/prisma";
import { createApp } from "./app";

const app = createApp();

const start = async () => {
    await prisma.$connect();

    app.listen(config.PORT, () => {
        console.log(`Mabrik Scraper API running on http://localhost:${config.PORT}`);
    });
};

start().catch(async (error) => {
    console.error("Failed to start server:", error);
    await prisma.$disconnect();
    process.exit(1);
});
