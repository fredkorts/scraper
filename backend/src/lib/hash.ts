import { createHash, randomBytes } from "crypto";

export const hashToken = (token: string): string =>
    createHash("sha256").update(token).digest("hex");

export const generateRefreshToken = (): string => randomBytes(48).toString("hex");
