import axios from "axios";
import { config } from "../config";

export const http = axios.create({
    timeout: config.SCRAPER_REQUEST_TIMEOUT_MS,
    headers: {
        "User-Agent": config.SCRAPER_USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
    },
});
