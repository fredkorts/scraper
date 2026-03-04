import { NotificationChannelType, UserRole } from "@prisma/client";
import { isMainModule } from "../lib/is-main-module";
import { logger } from "../lib/logger";
import { prisma } from "../lib/prisma";
import {
    getImmediateDeliveryPayloads,
    markDeliveryFailed,
    markDeliverySent,
    markDeliverySkipped,
} from "./helpers";
import { renderImmediateEmail } from "./templates";
import { createEmailTransport } from "./transport";
import type { EmailTransport } from "./types";

export const sendImmediateNotifications = async (
    changeReportId: string,
    transport: EmailTransport = createEmailTransport(),
) => {
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

        if (payload.channel.channelType !== NotificationChannelType.EMAIL) {
            await markDeliverySkipped(payload.delivery.id, "Unsupported channel type");
            skippedCount += 1;
            continue;
        }

        const email = renderImmediateEmail(payload);

        try {
            await transport.sendEmail({
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
