import nodemailer from "nodemailer";
import { Resend } from "resend";
import { config } from "../config";
import type { EmailMessage, EmailTransport } from "./types";

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

export const createEmailTransport = (): EmailTransport => {
    if (config.EMAIL_PROVIDER === "resend") {
        return new ResendEmailTransport();
    }

    return new SmtpEmailTransport();
};
