import type { ChangeItem, ChangeReport, NotificationChannel, NotificationDelivery, Product, ScrapeRun, User } from "@prisma/client";

export interface EmailMessage {
    to: string;
    subject: string;
    html: string;
    text: string;
}

export interface EmailTransport {
    sendEmail(message: EmailMessage): Promise<void>;
}

export interface ReportChangeItem {
    id: string;
    changeType: ChangeItem["changeType"];
    oldPrice: ChangeItem["oldPrice"];
    newPrice: ChangeItem["newPrice"];
    oldStockStatus: ChangeItem["oldStockStatus"];
    newStockStatus: ChangeItem["newStockStatus"];
    product: Pick<Product, "id" | "name" | "externalUrl" | "imageUrl">;
}

export interface ReportEmailPayload {
    report: Pick<ChangeReport, "id" | "createdAt" | "totalChanges"> & {
        scrapeRun: Pick<ScrapeRun, "id" | "completedAt"> & {
            category: {
                id: string;
                nameEt: string;
                slug: string;
            };
        };
    };
    changeItems: ReportChangeItem[];
}

export interface ImmediateDeliveryPayload {
    delivery: Pick<NotificationDelivery, "id" | "status">;
    user: Pick<User, "id" | "email" | "name" | "role" | "isActive">;
    channel: Pick<NotificationChannel, "id" | "destination" | "isActive" | "channelType">;
    report: ReportEmailPayload["report"];
    changeItems: ReportChangeItem[];
}

export interface DigestDeliveryPayload {
    deliveryId: string;
    report: ReportEmailPayload["report"];
    changeItems: ReportChangeItem[];
}

export interface DigestRecipientPayload {
    user: Pick<User, "id" | "email" | "name" | "role" | "lastDigestSentAt" | "isActive">;
    channel: Pick<NotificationChannel, "id" | "destination" | "isActive" | "channelType">;
    deliveries: DigestDeliveryPayload[];
}
