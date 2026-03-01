import type { UserRole } from "@mabrik/shared";

declare global {
    namespace Express {
        interface Request {
            auth?: {
                userId: string;
                email: string;
                role: UserRole;
                tokenType: "access";
            };
        }
    }
}

export {};
