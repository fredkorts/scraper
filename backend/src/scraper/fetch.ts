import { config } from "../config";
import { http } from "../lib/http";

const delay = async (ms: number): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, ms));
};

const randomDelay = (): number => {
    const min = config.SCRAPER_MIN_DELAY_MS;
    const max = config.SCRAPER_MAX_DELAY_MS;
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const buildCategoryUrl = (slug: string): string =>
    new URL(`/tootekategooria/${slug}/`, config.SCRAPER_BASE_URL).toString();

export const fetchCategoryPage = async (url: string): Promise<string> => {
    let attempt = 0;

    while (attempt <= config.SCRAPER_RETRY_COUNT) {
        try {
            const response = await http.get<string>(url);
            return response.data;
        } catch (error) {
            if (attempt >= config.SCRAPER_RETRY_COUNT) {
                throw error;
            }

            await delay(250 * 2 ** attempt);
            attempt += 1;
        }
    }

    throw new Error("Unreachable fetch retry state");
};

export const waitBetweenRequests = async (): Promise<void> => {
    await delay(randomDelay());
};
