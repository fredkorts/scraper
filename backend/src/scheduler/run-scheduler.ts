import "dotenv/config";
import cron from "node-cron";
import { config } from "../config";
import { isMainModule } from "../lib/is-main-module";
import { logger } from "../lib/logger";
import { prisma } from "../lib/prisma";
import { createScrapeQueue } from "../queue/queues";
import { enqueueDueCategories } from "./enqueue-due-categories";

const runScheduler = async (): Promise<void> => {
    await prisma.$connect();
    const queue = createScrapeQueue();

    let isTickRunning = false;

    const tick = async () => {
        if (isTickRunning) {
            logger.warn("scheduler_tick_skipped_previous_running");
            return;
        }

        isTickRunning = true;
        try {
            const result = await enqueueDueCategories({ queue });
            logger.info("scheduler_tick_completed", {
                ...result,
            });
        } catch (error) {
            logger.error("scheduler_tick_failed", {
                error,
            });
        } finally {
            isTickRunning = false;
        }
    };

    const task = cron.schedule(config.SCHEDULER_CRON, () => {
        void tick();
    });

    const shutdown = async (signal: NodeJS.Signals) => {
        logger.info("scheduler_shutdown_signal_received", {
            signal,
        });
        task.stop();
        await queue.close();
        await prisma.$disconnect();
        process.exit(0);
    };

    process.on("SIGINT", () => {
        void shutdown("SIGINT");
    });

    process.on("SIGTERM", () => {
        void shutdown("SIGTERM");
    });

    logger.info("scheduler_started", {
        cron: config.SCHEDULER_CRON,
    });
    await tick();
};

if (isMainModule(import.meta.url)) {
    runScheduler().catch(async (error) => {
        logger.error("scheduler_startup_failed", {
            error,
        });
        await prisma.$disconnect();
        process.exit(1);
    });
}
