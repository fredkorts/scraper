import { config } from "../config";
import { logger } from "../lib/logger";
import { createEmailTransport } from "../notifications/transport";

const frontendOrigin = new URL(config.FRONTEND_URL).origin;

const sendAuthEmail = async (to: string, subject: string, text: string, html: string): Promise<void> => {
    const transport = createEmailTransport();
    await transport.sendEmail({
        to,
        subject,
        text,
        html,
    });
};

export const sendVerificationEmail = async (email: string, token: string): Promise<void> => {
    const verificationUrl = `${frontendOrigin}/verify-email?token=${encodeURIComponent(token)}`;
    const subject = "Verify your PricePulse account";
    const text = `Verify your account by opening this link: ${verificationUrl}`;
    const html = `<p>Verify your account by opening this link:</p><p><a href="${verificationUrl}">${verificationUrl}</a></p>`;

    try {
        await sendAuthEmail(email, subject, text, html);
    } catch (error) {
        logger.error("auth_email_verification_send_failed", { email, error });
    }
};

export const sendPasswordResetEmail = async (email: string, token: string): Promise<void> => {
    const resetUrl = `${frontendOrigin}/reset-password?token=${encodeURIComponent(token)}`;
    const subject = "Reset your PricePulse password";
    const text = `Use this link to reset your password: ${resetUrl}`;
    const html = `<p>Use this link to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`;

    try {
        await sendAuthEmail(email, subject, text, html);
    } catch (error) {
        logger.error("auth_password_reset_send_failed", { email, error });
    }
};

export const sendSecurityEventEmail = async (email: string, eventTitle: string, eventBody: string): Promise<void> => {
    try {
        await sendAuthEmail(email, `Security alert: ${eventTitle}`, eventBody, `<p>${eventBody}</p>`);
    } catch (error) {
        logger.error("auth_security_event_email_failed", {
            email,
            eventTitle,
            error,
        });
    }
};
