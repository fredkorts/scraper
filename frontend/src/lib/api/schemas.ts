import { z } from "zod";

export const authUserSchema = z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string(),
    role: z.enum(["free", "paid", "admin"]),
    isActive: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
});

export const authResponseSchema = z.object({
    user: authUserSchema,
});

export const logoutResponseSchema = z.object({
    success: z.literal(true),
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
