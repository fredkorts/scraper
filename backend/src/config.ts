import { z } from "zod";

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3001),
    DATABASE_URL: z.string().url(),
    JWT_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    JWT_ISSUER: z.string().min(1).default("mabrik-backend"),
    JWT_AUDIENCE: z.string().min(1).default("mabrik-app"),
    ACCESS_TOKEN_TTL: z.string().regex(/^\d+[smhd]$/).default("15m"),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
    BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(14).default(12),
    FRONTEND_URL: z.string().url(),
});

export const config = envSchema.parse(process.env);
