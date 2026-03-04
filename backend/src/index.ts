import "dotenv/config";
import { config } from "./config";
import { logger } from "./lib/logger";
import { prisma } from "./lib/prisma";
import { createApp } from "./app";

const app = createApp();

const start = async () => {
    await prisma.$connect();

    app.listen(config.PORT, () => {
        logger.info("api_server_started", {
            port: config.PORT,
            baseUrl: `http://localhost:${config.PORT}`,
        });
    });
};

start().catch(async (error) => {
    logger.error("api_server_start_failed", {
        error,
    });
    await prisma.$disconnect();
    process.exit(1);
});
