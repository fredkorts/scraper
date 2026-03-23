import { createHash, randomBytes } from "crypto";

// This digest is used for high-entropy random tokens (refresh/reset/verification),
// not for user passwords. Password hashing is handled with bcrypt in auth.service.ts.
export const hashToken = (token: string): string => createHash("sha256").update(token).digest("hex");

export const generateRefreshToken = (): string => randomBytes(48).toString("hex");

export const generateOneTimeToken = (): string => randomBytes(32).toString("hex");
