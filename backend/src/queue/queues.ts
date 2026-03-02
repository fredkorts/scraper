import { Queue } from "bullmq";
import { getRedisConnectionOptions } from "./connection";
import { SCRAPE_QUEUE_NAME, type ScrapeCategoryJobData } from "./job-types";

export const createScrapeQueue = (queueName: string = SCRAPE_QUEUE_NAME) => {
    return new Queue<ScrapeCategoryJobData>(queueName, {
        connection: getRedisConnectionOptions(),
    });
};
