import { z } from "zod";

export const authUserSchema = z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string(),
    role: z.enum(["free", "paid", "admin"]),
    isActive: z.boolean(),
    emailVerifiedAt: z.string().optional(),
    mfaEnabled: z.boolean(),
    mfaEnabledAt: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
});

export const authResponseSchema = z.object({
    user: authUserSchema,
});

export const mfaChallengeResponseSchema = z.object({
    mfaRequired: z.literal(true),
    challengeToken: z.string(),
    user: authUserSchema,
});

export const logoutResponseSchema = z.object({
    success: z.literal(true),
});

export const successResponseSchema = z.object({
    success: z.literal(true),
});

export const mfaSetupStartResponseSchema = z.object({
    secret: z.string(),
    otpauthUri: z.string(),
});

export const mfaRecoveryCodesResponseSchema = z.object({
    recoveryCodes: z.array(z.string()),
});

export const authSessionSchema = z.object({
    id: z.string(),
    createdAt: z.string(),
    lastUsedAt: z.string().optional(),
    expiresAt: z.string(),
    revokedAt: z.string().optional(),
    createdByIp: z.string().optional(),
    createdByUserAgent: z.string().optional(),
    label: z.string().optional(),
    isCurrent: z.boolean(),
});

export const authSessionListResponseSchema = z.object({
    sessions: z.array(authSessionSchema),
});

export const notificationChannelSchema = z.object({
    id: z.string(),
    userId: z.string(),
    channelType: z.enum(["email", "discord", "whatsapp", "signal", "sms"]),
    destination: z.string(),
    isDefault: z.boolean(),
    isActive: z.boolean(),
    createdAt: z.string(),
});

export const notificationChannelsResponseSchema = z.object({
    channels: z.array(notificationChannelSchema),
});

export const notificationChannelResponseSchema = z.object({
    channel: notificationChannelSchema,
});

export type AuthUserSchema = z.infer<typeof authUserSchema>;
