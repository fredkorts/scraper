import { NotificationChannelType, UserRole } from "@prisma/client";
import { isMainModule } from "../lib/is-main-module";
import { logger } from "../lib/logger";
import { prisma } from "../lib/prisma";
import { getImmediateDeliveryPayloads, markDeliveryFailed, markDeliverySent, markDeliverySkipped } from "./helpers";
import { renderImmediateEmail, renderImmediateTelegram } from "./templates";
import { createEmailTransport, createTelegramTransport } from "./transport";
import type { EmailTransport, TelegramTransport } from "./types";

interface ImmediateTransports {
    emailTransport?: EmailTransport;
    telegramTransport?: TelegramTransport;
}

export const sendImmediateNotifications = async (changeReportId: string, transports: ImmediateTransports = {}) => {
    const emailTransport = transports.emailTransport ?? createEmailTransport();
    const telegramTransport = transports.telegramTransport ?? createTelegramTransport();
    const payloads = await getImmediateDeliveryPayloads(changeReportId);
    let sentCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const payload of payloads) {
        if (payload.user.role !== UserRole.PAID && payload.user.role !== UserRole.ADMIN) {
            continue;
        }

        if (!payload.user.isActive || !payload.channel.isActive) {
            await markDeliverySkipped(payload.delivery.id, "User or channel inactive");
            skippedCount += 1;
            continue;
        }

        if (payload.channel.channelType === NotificationChannelType.EMAIL) {
            const email = renderImmediateEmail(payload);

            try {
                await emailTransport.sendEmail({
                    to: payload.channel.destination,
                    subject: email.subject,
                    html: email.html,
                    text: email.text,
                });

                await markDeliverySent(payload.delivery.id);
                sentCount += 1;
            } catch (error) {
                await markDeliveryFailed(
                    payload.delivery.id,
                    error instanceof Error ? error.message : "Immediate email send failed",
                );
                failedCount += 1;
            }
            continue;
        }

        if (payload.channel.channelType === NotificationChannelType.TELEGRAM) {
            const telegram = renderImmediateTelegram(payload);

            try {
                await telegramTransport.sendTelegramMessage({
                    chatId: payload.channel.destination,
                    text: telegram.text,
                    parseMode: telegram.parseMode,
                });

                await markDeliverySent(payload.delivery.id);
                sentCount += 1;
            } catch (error) {
                await markDeliveryFailed(
                    payload.delivery.id,
                    error instanceof Error ? error.message : "Immediate telegram send failed",
                );
                failedCount += 1;
            }
            continue;
        }

        await markDeliverySkipped(payload.delivery.id, "Unsupported channel type");
        skippedCount += 1;
    }

    return {
        changeReportId,
        processedCount: payloads.length,
        sentCount,
        failedCount,
        skippedCount,
    };
};

if (isMainModule(import.meta.url)) {
    prisma
        .$connect()
        .then(async () => {
            const cliChangeReportId = process.argv[2];

            if (!cliChangeReportId) {
                throw new Error("Expected changeReportId as the first argument");
            }

            const result = await sendImmediateNotifications(cliChangeReportId);
            logger.info("immediate_notifications_cli_completed", {
                changeReportId: cliChangeReportId,
                result,
            });
        })
        .catch((error) => {
            logger.error("immediate_notifications_cli_failed", {
                changeReportId: process.argv[2],
                error,
            });
            process.exitCode = 1;
        })
        .finally(async () => {
            await prisma.$disconnect();
        });
}
