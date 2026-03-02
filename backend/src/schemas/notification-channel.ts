import { z } from "zod";

const emailWithTrimSchema = z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().email());

export const channelIdParamSchema = z.object({
    id: z.string().uuid(),
});

export const createNotificationChannelSchema = z.object({
    channelType: z.enum(["email", "discord", "whatsapp", "signal", "sms"]),
    destination: emailWithTrimSchema,
    isDefault: z.boolean().optional(),
    isActive: z.boolean().optional(),
});

export const updateNotificationChannelSchema = z
    .object({
        destination: emailWithTrimSchema.optional(),
        isDefault: z.boolean().optional(),
        isActive: z.boolean().optional(),
    })
    .refine((value) => value.destination !== undefined || value.isDefault !== undefined || value.isActive !== undefined, {
        message: "At least one field must be provided",
    });
