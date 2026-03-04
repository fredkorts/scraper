import type { UserRole } from "@mabrik/shared";
import type { logger } from "../lib/logger";

type RequestLogger = typeof logger;

declare global {
    namespace Express {
        interface Request {
            auth?: {
                userId: string;
                email: string;
                role: UserRole;
                tokenType: "access";
            };
            requestId?: string;
            log?: RequestLogger;
        }
    }
}

export {};
