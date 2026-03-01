import { ChangeType } from "@prisma/client";
import type { DigestRecipientPayload, ImmediateDeliveryPayload } from "./types";

const escapeHtml = (value: string): string =>
    value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");

const formatPrice = (value: unknown): string => {
    if (value === null || value === undefined) {
        return "-";
    }

    const number = typeof value === "number" ? value : Number(value);
    return `${number.toFixed(2)} EUR`;
};

const formatChangeLabel = (changeType: ChangeType): string => {
    switch (changeType) {
        case ChangeType.PRICE_INCREASE:
            return "Price increase";
        case ChangeType.PRICE_DECREASE:
            return "Price decrease";
        case ChangeType.NEW_PRODUCT:
            return "New product";
        case ChangeType.SOLD_OUT:
            return "Sold out";
        case ChangeType.BACK_IN_STOCK:
            return "Back in stock";
        default:
            return changeType;
    }
};

const renderItemText = (item: ImmediateDeliveryPayload["changeItems"][number]): string => {
    const lines = [
        `- ${item.product.name} (${formatChangeLabel(item.changeType)})`,
        `  ${item.product.externalUrl}`,
    ];

    if (item.oldPrice !== null || item.newPrice !== null) {
        lines.push(`  Price: ${formatPrice(item.oldPrice)} -> ${formatPrice(item.newPrice)}`);
    }

    if (item.oldStockStatus !== null || item.newStockStatus !== null) {
        lines.push(`  Stock: ${String(item.oldStockStatus)} -> ${String(item.newStockStatus)}`);
    }

    return lines.join("\n");
};

const renderItemHtml = (item: ImmediateDeliveryPayload["changeItems"][number]): string => {
    const priceRow =
        item.oldPrice !== null || item.newPrice !== null
            ? `<div><strong>Price:</strong> ${escapeHtml(formatPrice(item.oldPrice))} -> ${escapeHtml(formatPrice(item.newPrice))}</div>`
            : "";

    const stockRow =
        item.oldStockStatus !== null || item.newStockStatus !== null
            ? `<div><strong>Stock:</strong> ${escapeHtml(String(item.oldStockStatus))} -> ${escapeHtml(String(item.newStockStatus))}</div>`
            : "";

    return `<li style="margin-bottom:16px;">
        <div><strong>${escapeHtml(item.product.name)}</strong> - ${escapeHtml(formatChangeLabel(item.changeType))}</div>
        <div><a href="${escapeHtml(item.product.externalUrl)}">${escapeHtml(item.product.externalUrl)}</a></div>
        ${priceRow}
        ${stockRow}
    </li>`;
};

const buildSummaryCounts = (items: ImmediateDeliveryPayload["changeItems"]) => {
    return items.reduce<Record<string, number>>((counts, item) => {
        counts[item.changeType] = (counts[item.changeType] ?? 0) + 1;
        return counts;
    }, {});
};

export const renderImmediateEmail = (payload: ImmediateDeliveryPayload) => {
    const categoryName = payload.report.scrapeRun.category.nameEt;
    const counts = buildSummaryCounts(payload.changeItems);
    const summaryText = Object.entries(counts)
        .map(([type, count]) => `${formatChangeLabel(type as ChangeType)}: ${count}`)
        .join(", ");

    return {
        subject: `Mabrik alert: ${payload.report.totalChanges} changes in ${categoryName}`,
        text: [
            `Hello ${payload.user.name},`,
            "",
            `${payload.report.totalChanges} changes were detected in ${categoryName}.`,
            summaryText ? `Summary: ${summaryText}` : "",
            "",
            ...payload.changeItems.map(renderItemText),
        ]
            .filter(Boolean)
            .join("\n"),
        html: `<html><body>
            <h1>Mabrik alert</h1>
            <p>Hello ${escapeHtml(payload.user.name)},</p>
            <p><strong>${payload.report.totalChanges}</strong> changes were detected in <strong>${escapeHtml(categoryName)}</strong>.</p>
            ${summaryText ? `<p>${escapeHtml(summaryText)}</p>` : ""}
            <ul>${payload.changeItems.map(renderItemHtml).join("")}</ul>
        </body></html>`,
    };
};

export const renderDigestEmail = (payload: DigestRecipientPayload) => {
    const groupedByCategory = payload.deliveries.reduce<Record<string, DigestRecipientPayload["deliveries"]>>(
        (groups, delivery) => {
            const key = delivery.report.scrapeRun.category.nameEt;
            groups[key] ??= [];
            groups[key].push(delivery);
            return groups;
        },
        {},
    );

    const subject = `Mabrik digest: ${payload.deliveries.length} reports across ${Object.keys(groupedByCategory).length} categories`;

    const textSections = Object.entries(groupedByCategory).map(([category, deliveries]) => {
        const lines = [`${category}`];
        for (const delivery of deliveries) {
            lines.push(`- Report ${delivery.report.id}: ${delivery.changeItems.length} changes`);
            for (const item of delivery.changeItems) {
                lines.push(`  ${renderItemText(item)}`);
            }
        }
        return lines.join("\n");
    });

    const htmlSections = Object.entries(groupedByCategory).map(([category, deliveries]) => `<section>
        <h2>${escapeHtml(category)}</h2>
        ${deliveries
            .map(
                (delivery) => `<div style="margin-bottom:24px;">
                <p><strong>Report ${escapeHtml(delivery.report.id)}</strong> - ${delivery.changeItems.length} changes</p>
                <ul>${delivery.changeItems.map(renderItemHtml).join("")}</ul>
            </div>`,
            )
            .join("")}
    </section>`);

    return {
        subject,
        text: [
            `Hello ${payload.user.name},`,
            "",
            "Here is your Mabrik digest.",
            "",
            ...textSections,
        ].join("\n"),
        html: `<html><body>
            <h1>Mabrik digest</h1>
            <p>Hello ${escapeHtml(payload.user.name)},</p>
            <p>Here is your Mabrik digest.</p>
            ${htmlSections.join("")}
        </body></html>`,
    };
};
