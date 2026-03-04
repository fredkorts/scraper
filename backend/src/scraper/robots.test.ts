import { beforeEach, describe, expect, it, vi } from "vitest";

const httpGet = vi.fn();

vi.mock("../lib/http", () => ({
    http: {
        get: (...args: unknown[]) => httpGet(...args),
    },
}));

import { config } from "../config";
import {
    RobotsDisallowedError,
    RobotsPolicyUnavailableError,
    assertUrlAllowedByRobots,
    resetRobotsPolicyCache,
} from "./robots";

describe("robots policy", () => {
    beforeEach(() => {
        resetRobotsPolicyCache();
        httpGet.mockReset();
        (config as { SCRAPER_ROBOTS_STRICT: boolean }).SCRAPER_ROBOTS_STRICT = false;
    });

    it("allows URLs that are not disallowed", async () => {
        httpGet.mockResolvedValue({
            status: 200,
            data: `User-agent: *\nDisallow: /private/`,
        });

        await expect(assertUrlAllowedByRobots("https://mabrik.ee/tootekategooria/lauamangud/")).resolves.toBeUndefined();
    });

    it("blocks URLs disallowed for the scraper user-agent", async () => {
        httpGet.mockResolvedValue({
            status: 200,
            data: `User-agent: MabrikScraper\nDisallow: /tootekategooria/lauamangud/`,
        });

        await expect(assertUrlAllowedByRobots("https://mabrik.ee/tootekategooria/lauamangud/")).rejects.toBeInstanceOf(
            RobotsDisallowedError,
        );
    });

    it("fails closed in strict mode when robots policy cannot be loaded", async () => {
        (config as { SCRAPER_ROBOTS_STRICT: boolean }).SCRAPER_ROBOTS_STRICT = true;
        httpGet.mockRejectedValue(new Error("network down"));

        await expect(assertUrlAllowedByRobots("https://mabrik.ee/tootekategooria/lauamangud/")).rejects.toBeInstanceOf(
            RobotsPolicyUnavailableError,
        );
    });
});
