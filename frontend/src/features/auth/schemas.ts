import { z } from "zod";

export const loginFormSchema = z.object({
    email: z.string().trim().toLowerCase().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
});

export const registerFormSchema = z.object({
    email: z.string().trim().toLowerCase().email("Invalid email address"),
    password: z
        .string()
        .min(10, "Password must be at least 10 characters long")
        .regex(/[a-z]/, "Password must include a lowercase letter")
        .regex(/[A-Z]/, "Password must include an uppercase letter")
        .regex(/[0-9]/, "Password must include a number"),
    name: z
        .string()
        .trim()
        .min(2, "Name must be at least 2 characters long")
        .max(60, "Name must be at most 60 characters long"),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;
export type RegisterFormValues = z.infer<typeof registerFormSchema>;

export const forgotPasswordFormSchema = z.object({
    email: z.string().trim().toLowerCase().email("Invalid email address"),
});

export const resetPasswordFormSchema = z
    .object({
        password: z
            .string()
            .min(10, "Password must be at least 10 characters long")
            .regex(/[a-z]/, "Password must include a lowercase letter")
            .regex(/[A-Z]/, "Password must include an uppercase letter")
            .regex(/[0-9]/, "Password must include a number"),
        confirmPassword: z.string().min(1, "Confirm your password"),
    })
    .refine((value) => value.password === value.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    });

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordFormSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>;
