import "dotenv/config";
import cron from "node-cron";
import { config } from "../config";
import { prisma } from "../lib/prisma";
import { createScrapeQueue } from "../queue/queues";
import { enqueueDueCategories } from "./enqueue-due-categories";

const runScheduler = async (): Promise<void> => {
    await prisma.$connect();
    const queue = createScrapeQueue();

    let isTickRunning = false;

    const tick = async () => {
        if (isTickRunning) {
            console.log("[scheduler] skipping tick because previous tick is still running");
            return;
        }

        isTickRunning = true;
        try {
            const result = await enqueueDueCategories({ queue });
            console.log(
                JSON.stringify(
                    {
                        scope: "scheduler",
                        event: "tick",
                        ...result,
                        timestamp: new Date().toISOString(),
                    },
                    null,
                    2,
                ),
            );
        } catch (error) {
            console.error("[scheduler] tick failed", error);
        } finally {
            isTickRunning = false;
        }
    };

    const task = cron.schedule(config.SCHEDULER_CRON, () => {
        void tick();
    });

    const shutdown = async (signal: NodeJS.Signals) => {
        console.log(`[scheduler] received ${signal}, shutting down`);
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

    console.log(`[scheduler] started with cron expression: ${config.SCHEDULER_CRON}`);
    await tick();
};

runScheduler().catch(async (error) => {
    console.error("[scheduler] startup failed", error);
    await prisma.$disconnect();
    process.exit(1);
});
