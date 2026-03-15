import nodemailer from "nodemailer";
import { Resend } from "resend";
import { config } from "../config";
import type { EmailMessage, EmailTransport, TelegramMessage, TelegramTransport } from "./types";

class SmtpEmailTransport implements EmailTransport {
    async sendEmail(message: EmailMessage): Promise<void> {
        const transport =
            config.SMTP_HOST && config.SMTP_PORT
                ? nodemailer.createTransport({
                      host: config.SMTP_HOST,
                      port: config.SMTP_PORT,
                      secure: config.SMTP_PORT === 465,
                      auth:
                          config.SMTP_USER && config.SMTP_PASS
                              ? {
                                    user: config.SMTP_USER,
                                    pass: config.SMTP_PASS,
                                }
                              : undefined,
                  })
                : nodemailer.createTransport({
                      jsonTransport: true,
                  });

        await transport.sendMail({
            from: config.EMAIL_FROM,
            to: message.to,
            subject: message.subject,
            html: message.html,
            text: message.text,
        });
    }
}

class ResendEmailTransport implements EmailTransport {
    async sendEmail(message: EmailMessage): Promise<void> {
        const resend = new Resend(config.RESEND_API_KEY);

        const response = await resend.emails.send({
            from: config.EMAIL_FROM,
            to: message.to,
            subject: message.subject,
            html: message.html,
            text: message.text,
        });

        if (response.error) {
            throw new Error(response.error.message);
        }
    }
}

class NoopTelegramTransport implements TelegramTransport {
    async sendTelegramMessage(message: TelegramMessage): Promise<void> {
        void message;
        return;
    }
}

class HttpTelegramTransport implements TelegramTransport {
    async sendTelegramMessage(message: TelegramMessage): Promise<void> {
        const token = config.TELEGRAM_BOT_TOKEN?.trim();
        if (!token) {
            throw new Error("TELEGRAM_BOT_TOKEN is not configured");
        }

        const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                chat_id: message.chatId,
                text: message.text,
                disable_web_page_preview: true,
            }),
        });

        if (!response.ok) {
            const payload = (await response.json().catch(() => null)) as { description?: string; ok?: boolean } | null;
            const description = payload?.description ?? "Telegram API error";
            throw new Error(`Telegram send failed (${response.status}): ${description}`);
        }
    }
}

export const createEmailTransport = (): EmailTransport => {
    if (config.EMAIL_PROVIDER === "resend") {
        return new ResendEmailTransport();
    }

    return new SmtpEmailTransport();
};

export const createTelegramTransport = (): TelegramTransport => {
    if (config.NODE_ENV === "test") {
        return new NoopTelegramTransport();
    }

    return new HttpTelegramTransport();
};
