import { z } from "zod";
import { normalizeEmailAddress } from "../lib/email";

const passwordSchema = z
    .string()
    .min(10, "Password must be at least 10 characters long")
    .max(128, "Password must be at most 128 characters long")
    .regex(/[a-z]/, "Password must include a lowercase letter")
    .regex(/[A-Z]/, "Password must include an uppercase letter")
    .regex(/[0-9]/, "Password must include a number");

export const registerSchema = z.object({
    email: z.string().transform(normalizeEmailAddress).pipe(z.string().email("Invalid email address")),
    password: passwordSchema,
    name: z
        .string()
        .trim()
        .min(2, "Name must be at least 2 characters long")
        .max(60, "Name must be at most 60 characters long"),
});

export const loginSchema = z.object({
    email: z.string().transform(normalizeEmailAddress).pipe(z.string().email("Invalid email address")),
    password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
    email: z.string().transform(normalizeEmailAddress).pipe(z.string().email("Invalid email address")),
});

export const resetPasswordSchema = z.object({
    token: z.string().trim().min(1, "Token is required"),
    password: passwordSchema,
});

export const emailVerificationVerifySchema = z.object({
    token: z.string().trim().min(1, "Token is required"),
});

export const mfaSetupConfirmSchema = z.object({
    code: z
        .string()
        .trim()
        .regex(/^\d{6}$/, "MFA code must be 6 digits"),
});

const stepUpSchema = z
    .object({
        currentPassword: z.string().min(1).optional(),
        mfaCode: z
            .string()
            .trim()
            .regex(/^\d{6}$/)
            .optional(),
        recoveryCode: z.string().trim().min(6).optional(),
    })
    .refine(
        (value) => Boolean(value.currentPassword) || Boolean(value.mfaCode) || Boolean(value.recoveryCode),
        "Provide currentPassword, mfaCode, or recoveryCode",
    );

export const mfaDisableSchema = stepUpSchema;

export const mfaVerifyLoginSchema = z
    .object({
        challengeToken: z.string().trim().min(1, "Challenge token is required"),
        code: z
            .string()
            .trim()
            .regex(/^\d{6}$/)
            .optional(),
        recoveryCode: z.string().trim().min(6).optional(),
    })
    .refine((value) => Boolean(value.code) || Boolean(value.recoveryCode), {
        message: "Provide MFA code or recovery code",
    });

export const sessionRevokeSchema = stepUpSchema;
export const sessionRevokeOthersSchema = stepUpSchema;

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
