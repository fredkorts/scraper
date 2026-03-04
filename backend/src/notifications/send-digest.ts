import { NotificationChannelType, UserRole } from "@prisma/client";
import { isMainModule } from "../lib/is-main-module";
import { logger } from "../lib/logger";
import { prisma } from "../lib/prisma";
import { getDigestRecipientPayloads, markDeliverySkipped, markDigestDeliveriesSent } from "./helpers";
import { renderDigestEmail } from "./templates";
import { createEmailTransport } from "./transport";
import type { EmailTransport } from "./types";

export const sendPendingDigests = async (
    now: Date = new Date(),
    transport: EmailTransport = createEmailTransport(),
) => {
    const recipients = await getDigestRecipientPayloads(now);
    let sentCount = 0;
    let skippedCount = 0;
    let pendingCount = 0;

    for (const recipient of recipients) {
        if (recipient.user.role !== UserRole.FREE) {
            continue;
        }

        if (!recipient.user.isActive || !recipient.channel.isActive) {
            for (const delivery of recipient.deliveries) {
                await markDeliverySkipped(delivery.deliveryId, "User or channel inactive");
                skippedCount += 1;
            }
            continue;
        }

        if (recipient.channel.channelType !== NotificationChannelType.EMAIL) {
            for (const delivery of recipient.deliveries) {
                await markDeliverySkipped(delivery.deliveryId, "Unsupported channel type");
                skippedCount += 1;
            }
            continue;
        }

        if (recipient.deliveries.length === 0) {
            continue;
        }

        const email = renderDigestEmail(recipient);
        try {
            await transport.sendEmail({
                to: recipient.channel.destination,
                subject: email.subject,
                html: email.html,
                text: email.text,
            });

            await markDigestDeliveriesSent(
                recipient.user.id,
                recipient.deliveries.map((delivery) => delivery.deliveryId),
                now,
            );
            sentCount += recipient.deliveries.length;
        } catch {
            pendingCount += recipient.deliveries.length;
        }
    }

    return {
        recipientCount: recipients.length,
        sentCount,
        skippedCount,
        pendingCount,
    };
};

if (isMainModule(import.meta.url)) {
    prisma
        .$connect()
        .then(async () => {
            const result = await sendPendingDigests();
            logger.info("digest_notifications_cli_completed", {
                result,
            });
        })
        .catch((error) => {
            logger.error("digest_notifications_cli_failed", {
                error,
            });
            process.exitCode = 1;
        })
        .finally(async () => {
            await prisma.$disconnect();
        });
}
