import { config } from "../config";
import { logger } from "../lib/logger";
import { http } from "../lib/http";

interface RobotsGroup {
    userAgents: string[];
    allowRules: string[];
    disallowRules: string[];
}

interface CompiledRule {
    path: string;
    regex: RegExp;
    type: "allow" | "disallow";
}

interface RobotsPolicy {
    fetchedAt: number;
    groups: RobotsGroup[];
}

interface CachedPolicy {
    expiresAt: number;
    policy: RobotsPolicy;
}

export class RobotsDisallowedError extends Error {
    readonly pageUrl: string;

    constructor(pageUrl: string) {
        super(`Robots policy disallows scraping URL: ${pageUrl}`);
        this.name = "RobotsDisallowedError";
        this.pageUrl = pageUrl;
    }
}

export class RobotsPolicyUnavailableError extends Error {
    constructor(message: string, cause?: unknown) {
        super(message, {
            cause,
        });
        this.name = "RobotsPolicyUnavailableError";
    }
}

let cachedPolicy: CachedPolicy | null = null;

const normalizePathRule = (input: string): string => {
    const trimmed = input.trim();
    if (trimmed.length === 0) {
        return "";
    }

    return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
};

const toRuleRegex = (pathRule: string): RegExp => {
    const normalizedRule = normalizePathRule(pathRule);
    const isEndAnchored = normalizedRule.endsWith("$");
    const rawRule = isEndAnchored ? normalizedRule.slice(0, -1) : normalizedRule;
    const escaped = rawRule.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");

    return new RegExp(`^${escaped}${isEndAnchored ? "$" : ""}`);
};

const compileRules = (group: RobotsGroup): CompiledRule[] => {
    const allowRules = group.allowRules.map((path) => ({
        path,
        regex: toRuleRegex(path),
        type: "allow" as const,
    }));
    const disallowRules = group.disallowRules.map((path) => ({
        path,
        regex: toRuleRegex(path),
        type: "disallow" as const,
    }));

    return [...allowRules, ...disallowRules];
};

const parseRobotsTxt = (content: string): RobotsGroup[] => {
    const groups: RobotsGroup[] = [];
    const lines = content.split(/\r?\n/);
    let currentGroup: RobotsGroup | null = null;
    let hasRuleInCurrentGroup = false;

    for (const rawLine of lines) {
        const line = rawLine.replace(/#.*/, "").trim();
        if (line.length === 0) {
            continue;
        }

        const separatorIndex = line.indexOf(":");
        if (separatorIndex <= 0) {
            continue;
        }

        const directive = line.slice(0, separatorIndex).trim().toLowerCase();
        const value = line.slice(separatorIndex + 1).trim();

        if (directive === "user-agent") {
            if (!currentGroup || hasRuleInCurrentGroup) {
                currentGroup = {
                    userAgents: [],
                    allowRules: [],
                    disallowRules: [],
                };
                groups.push(currentGroup);
                hasRuleInCurrentGroup = false;
            }

            currentGroup.userAgents.push(value.toLowerCase());
            continue;
        }

        if (!currentGroup) {
            continue;
        }

        if (directive === "allow") {
            hasRuleInCurrentGroup = true;
            currentGroup.allowRules.push(normalizePathRule(value));
            continue;
        }

        if (directive === "disallow") {
            hasRuleInCurrentGroup = true;
            const normalized = normalizePathRule(value);
            if (normalized.length > 0) {
                currentGroup.disallowRules.push(normalized);
            }
        }
    }

    return groups;
};

const getApplicableGroups = (policy: RobotsPolicy, userAgent: string): RobotsGroup[] => {
    const normalizedAgent = userAgent.toLowerCase();
    let strongestTokenLength = 0;

    for (const group of policy.groups) {
        for (const token of group.userAgents) {
            const normalizedToken = token.trim().toLowerCase();
            if (normalizedToken === "*") {
                strongestTokenLength = Math.max(strongestTokenLength, 1);
                continue;
            }

            if (normalizedToken.length > 0 && normalizedAgent.includes(normalizedToken)) {
                strongestTokenLength = Math.max(strongestTokenLength, normalizedToken.length);
            }
        }
    }

    if (strongestTokenLength === 0) {
        return [];
    }

    return policy.groups.filter((group) =>
        group.userAgents.some((token) => {
            const normalizedToken = token.trim().toLowerCase();
            if (normalizedToken === "*") {
                return strongestTokenLength === 1;
            }

            return normalizedToken.length === strongestTokenLength && normalizedAgent.includes(normalizedToken);
        }),
    );
};

const isPathAllowed = (path: string, groups: RobotsGroup[]): boolean => {
    if (groups.length === 0) {
        return true;
    }

    const matchingRules = groups.flatMap((group) => compileRules(group).filter((rule) => rule.regex.test(path)));

    if (matchingRules.length === 0) {
        return true;
    }

    matchingRules.sort((left, right) => {
        if (right.path.length !== left.path.length) {
            return right.path.length - left.path.length;
        }

        if (left.type === right.type) {
            return 0;
        }

        return left.type === "allow" ? -1 : 1;
    });

    return matchingRules[0].type === "allow";
};

const toRobotsUrl = (): string => new URL("/robots.txt", config.SCRAPER_BASE_URL).toString();

const fetchRobotsPolicy = async (): Promise<RobotsPolicy> => {
    const response = await http.get<string>(toRobotsUrl(), {
        timeout: config.SCRAPER_ROBOTS_FETCH_TIMEOUT_MS,
        responseType: "text",
        validateStatus: (status) => status >= 200 && status < 500,
    });

    const body = response.status === 404 ? "" : response.data;

    return {
        fetchedAt: Date.now(),
        groups: parseRobotsTxt(body),
    };
};

const getCachedPolicy = (): RobotsPolicy | null => {
    if (!cachedPolicy) {
        return null;
    }

    if (Date.now() > cachedPolicy.expiresAt) {
        return null;
    }

    return cachedPolicy.policy;
};

const getRobotsPolicy = async (): Promise<RobotsPolicy> => {
    const validCache = getCachedPolicy();
    if (validCache) {
        return validCache;
    }

    try {
        const policy = await fetchRobotsPolicy();
        cachedPolicy = {
            policy,
            expiresAt: Date.now() + config.SCRAPER_ROBOTS_CACHE_TTL_MS,
        };

        return policy;
    } catch (error) {
        const fallbackPolicy = getCachedPolicy();
        if (fallbackPolicy) {
            return fallbackPolicy;
        }

        if (!config.SCRAPER_ROBOTS_STRICT) {
            logger.warn("robots_policy_unavailable_non_strict_mode", {
                error,
            });

            return {
                fetchedAt: Date.now(),
                groups: [],
            };
        }

        throw new RobotsPolicyUnavailableError("Unable to fetch robots.txt policy in strict mode", error);
    }
};

export const assertUrlAllowedByRobots = async (pageUrl: string): Promise<void> => {
    const policy = await getRobotsPolicy();
    const url = new URL(pageUrl);
    const path = `${url.pathname}${url.search}`;
    const groups = getApplicableGroups(policy, config.SCRAPER_USER_AGENT);
    const allowed = isPathAllowed(path, groups);

    if (!allowed) {
        throw new RobotsDisallowedError(pageUrl);
    }
};

export const resetRobotsPolicyCache = (): void => {
    cachedPolicy = null;
};
