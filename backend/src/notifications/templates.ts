import { NotificationChangeCategory } from "@mabrik/shared";
import { config } from "../config";
import { buildSectionSummaries, groupChangeItems } from "./change-grouping";
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

const formatStockStatus = (value: boolean | null): string => {
    if (value === true) {
        return "In stock";
    }

    if (value === false) {
        return "Out of stock";
    }

    return "Unknown";
};

const formatUtcTimestamp = (value: Date): string => `${value.toISOString().slice(0, 16).replace("T", " ")} UTC`;
const formatDateOnly = (value: Date): string => value.toISOString().slice(0, 10);

const getRunTimestamp = (payload: ImmediateDeliveryPayload | DigestRecipientPayload["deliveries"][number]): Date =>
    payload.report.scrapeRun.completedAt ?? payload.report.createdAt;

const buildFrontendUrl = (path: string, searchParams: Record<string, string>): string => {
    const url = new URL(path, config.FRONTEND_URL);

    for (const [key, value] of Object.entries(searchParams)) {
        url.searchParams.set(key, value);
    }

    return url.toString();
};

const buildCategoryRunsUrl = (categoryId: string): string =>
    buildFrontendUrl("/app/runs", {
        page: "1",
        pageSize: "25",
        sortBy: "startedAt",
        sortOrder: "desc",
        categoryId,
    });

const buildDashboardCategoryUrl = (categoryId: string): string => buildFrontendUrl("/app", { categoryId });

const buildRunsUrl = (): string =>
    buildFrontendUrl("/app/runs", {
        page: "1",
        pageSize: "25",
        sortBy: "startedAt",
        sortOrder: "desc",
    });

const renderItemText = (item: ImmediateDeliveryPayload["changeItems"][number]): string => {
    const preorderLabel = item.product.isPreorder
        ? item.product.preorderEta
            ? ` [Preorder, ETA ${formatDateOnly(item.product.preorderEta)}]`
            : " [Preorder]"
        : "";
    const lines = [`- ${item.product.name}${preorderLabel}`, `  ${item.product.externalUrl}`];

    if (item.oldPrice !== null || item.newPrice !== null) {
        lines.push(`  Price: ${formatPrice(item.oldPrice)} -> ${formatPrice(item.newPrice)}`);
    }

    if (item.oldStockStatus !== null || item.newStockStatus !== null) {
        lines.push(`  Stock: ${formatStockStatus(item.oldStockStatus)} -> ${formatStockStatus(item.newStockStatus)}`);
    }

    return lines.join("\n");
};

const renderItemHtml = (item: ImmediateDeliveryPayload["changeItems"][number]): string => {
    const preorderRow = item.product.isPreorder
        ? `<div><strong>Type:</strong> Preorder${item.product.preorderEta ? ` (ETA ${escapeHtml(formatDateOnly(item.product.preorderEta))})` : ""}</div>`
        : "";
    const priceRow =
        item.oldPrice !== null || item.newPrice !== null
            ? `<div><strong>Price:</strong> ${escapeHtml(formatPrice(item.oldPrice))} -> ${escapeHtml(formatPrice(item.newPrice))}</div>`
            : "";

    const stockRow =
        item.oldStockStatus !== null || item.newStockStatus !== null
            ? `<div><strong>Stock:</strong> ${escapeHtml(formatStockStatus(item.oldStockStatus))} -> ${escapeHtml(formatStockStatus(item.newStockStatus))}</div>`
            : "";

    return `<li style="margin-bottom:16px;">
        <div><strong>${escapeHtml(item.product.name)}</strong></div>
        <div><a href="${escapeHtml(item.product.externalUrl)}">${escapeHtml(item.product.externalUrl)}</a></div>
        ${preorderRow}
        ${priceRow}
        ${stockRow}
    </li>`;
};

const getDistinctPreorderProductCount = (
    items: ImmediateDeliveryPayload["changeItems"] | DigestRecipientPayload["deliveries"][number]["changeItems"],
): number => new Set(items.filter((item) => item.product.isPreorder).map((item) => item.product.id)).size;

const IMMEDIATE_SECTION_ITEM_LIMIT = 20;
const DIGEST_SECTION_ITEM_LIMIT = 10;

const renderTextSections = (
    sections: ReturnType<typeof buildSectionSummaries>,
    groupedItems: Record<NotificationChangeCategory, ImmediateDeliveryPayload["changeItems"]>,
    cap: number,
) =>
    sections.flatMap((section) => {
        const sectionItems = groupedItems[section.category];
        const visibleItems = sectionItems.slice(0, cap);
        const overflowCount = sectionItems.length - visibleItems.length;
        const lines = [`${section.label} (${section.count})`, ...visibleItems.map(renderItemText)];

        if (overflowCount > 0) {
            lines.push(`+${overflowCount} more in this section`);
        }

        lines.push("");
        return lines;
    });

const renderHtmlSections = (
    sections: ReturnType<typeof buildSectionSummaries>,
    groupedItems: Record<NotificationChangeCategory, ImmediateDeliveryPayload["changeItems"]>,
    cap: number,
) =>
    sections
        .map((section) => {
            const sectionItems = groupedItems[section.category];
            const visibleItems = sectionItems.slice(0, cap);
            const overflowCount = sectionItems.length - visibleItems.length;

            return `<section style="margin-bottom:24px;">
                <h2 style="margin:0 0 12px 0;">${escapeHtml(section.label)} (${section.count})</h2>
                <ul style="margin:0; padding-left:20px;">${visibleItems.map(renderItemHtml).join("")}</ul>
                ${overflowCount > 0 ? `<p style="margin-top:8px;">+${overflowCount} more in this section</p>` : ""}
            </section>`;
        })
        .join("");

export const renderImmediateEmail = (payload: ImmediateDeliveryPayload) => {
    const categoryName = payload.report.scrapeRun.category.nameEt;
    const groupedItems = groupChangeItems(payload.changeItems);
    const sectionSummaries = buildSectionSummaries(groupedItems);
    const summaryText = sectionSummaries.map((summary) => `${summary.label}: ${summary.count}`).join(", ");
    const categoryRunsUrl = buildCategoryRunsUrl(payload.report.scrapeRun.category.id);
    const dashboardCategoryUrl = buildDashboardCategoryUrl(payload.report.scrapeRun.category.id);
    const runTimestamp = formatUtcTimestamp(getRunTimestamp(payload));
    const preorderCount = getDistinctPreorderProductCount(payload.changeItems);
    const renderedTextSections = renderTextSections(sectionSummaries, groupedItems, IMMEDIATE_SECTION_ITEM_LIMIT);
    const renderedHtmlSections = renderHtmlSections(sectionSummaries, groupedItems, IMMEDIATE_SECTION_ITEM_LIMIT);

    return {
        subject: `Mabrik alert: ${payload.report.totalChanges} changes in ${categoryName}`,
        text: [
            `Hello ${payload.user.name},`,
            "",
            `${payload.report.totalChanges} changes were detected in ${categoryName}.`,
            `Category: ${categoryName}`,
            `Run time: ${runTimestamp}`,
            `Changed products: ${payload.report.totalChanges}`,
            `Sections: ${sectionSummaries.length}`,
            `Preorders in this report: ${preorderCount}`,
            summaryText ? `Summary: ${summaryText}` : "",
            "",
            "View all changes in dashboard:",
            categoryRunsUrl,
            "Open category runs:",
            dashboardCategoryUrl,
            "",
            ...renderedTextSections,
            "View all changes in dashboard:",
            categoryRunsUrl,
            "Open category runs:",
            dashboardCategoryUrl,
        ]
            .filter(Boolean)
            .join("\n"),
        html: `<html><body>
            <h1>Mabrik alert</h1>
            <p>Hello ${escapeHtml(payload.user.name)},</p>
            <p><strong>${payload.report.totalChanges}</strong> changes were detected in <strong>${escapeHtml(categoryName)}</strong>.</p>
            <p><strong>Category:</strong> ${escapeHtml(categoryName)}<br />
            <strong>Run time:</strong> ${escapeHtml(runTimestamp)}<br />
            <strong>Changed products:</strong> ${payload.report.totalChanges}<br />
            <strong>Sections:</strong> ${sectionSummaries.length}<br />
            <strong>Preorders in this report:</strong> ${preorderCount}</p>
            ${summaryText ? `<p>${escapeHtml(summaryText)}</p>` : ""}
            <p><a href="${escapeHtml(categoryRunsUrl)}"><strong>View all changes in dashboard</strong></a><br />
            <a href="${escapeHtml(dashboardCategoryUrl)}">Open category runs</a></p>
            ${renderedHtmlSections}
            <p><a href="${escapeHtml(categoryRunsUrl)}"><strong>View all changes in dashboard</strong></a><br />
            <a href="${escapeHtml(dashboardCategoryUrl)}">Open category runs</a></p>
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
    const primaryDigestUrl = buildRunsUrl();

    const textSections = Object.entries(groupedByCategory).map(([category, deliveries]) => {
        const lines = [`${category}`];
        for (const delivery of deliveries) {
            const groupedItems = groupChangeItems(delivery.changeItems);
            const sectionSummaries = buildSectionSummaries(groupedItems);
            const categoryRunsUrl = buildCategoryRunsUrl(delivery.report.scrapeRun.category.id);
            const dashboardCategoryUrl = buildDashboardCategoryUrl(delivery.report.scrapeRun.category.id);
            const runTimestamp = formatUtcTimestamp(getRunTimestamp(delivery));
            const preorderCount = getDistinctPreorderProductCount(delivery.changeItems);
            lines.push(`- Report ${delivery.report.id}: ${delivery.changeItems.length} changes`);
            lines.push(`  Category: ${delivery.report.scrapeRun.category.nameEt}`);
            lines.push(`  Run time: ${runTimestamp}`);
            lines.push(`  Changed products: ${delivery.report.totalChanges}`);
            lines.push(`  Sections: ${sectionSummaries.length}`);
            lines.push(`  Preorders in this report: ${preorderCount}`);
            lines.push(
                ...renderTextSections(sectionSummaries, groupedItems, DIGEST_SECTION_ITEM_LIMIT).map((line) =>
                    line ? `  ${line}` : line,
                ),
            );
            lines.push(`  View all changes in dashboard: ${categoryRunsUrl}`);
            lines.push(`  Open category runs: ${dashboardCategoryUrl}`);
        }
        return lines.join("\n");
    });

    const htmlSections = Object.entries(groupedByCategory).map(
        ([category, deliveries]) => `<section>
        <h2>${escapeHtml(category)}</h2>
        ${deliveries
            .map((delivery) => {
                const groupedItems = groupChangeItems(delivery.changeItems);
                const sectionSummaries = buildSectionSummaries(groupedItems);
                const categoryRunsUrl = buildCategoryRunsUrl(delivery.report.scrapeRun.category.id);
                const dashboardCategoryUrl = buildDashboardCategoryUrl(delivery.report.scrapeRun.category.id);
                const runTimestamp = formatUtcTimestamp(getRunTimestamp(delivery));
                const preorderCount = getDistinctPreorderProductCount(delivery.changeItems);
                const renderedSections = renderHtmlSections(sectionSummaries, groupedItems, DIGEST_SECTION_ITEM_LIMIT);

                return `<div style="margin-bottom:24px;">
                    <p><strong>Report ${escapeHtml(delivery.report.id)}</strong> - ${delivery.changeItems.length} changes</p>
                    <p><strong>Category:</strong> ${escapeHtml(delivery.report.scrapeRun.category.nameEt)}<br />
                    <strong>Run time:</strong> ${escapeHtml(runTimestamp)}<br />
                    <strong>Changed products:</strong> ${delivery.report.totalChanges}<br />
                    <strong>Sections:</strong> ${sectionSummaries.length}<br />
                    <strong>Preorders in this report:</strong> ${preorderCount}</p>
                    <p><a href="${escapeHtml(categoryRunsUrl)}"><strong>View all changes in dashboard</strong></a><br />
                    <a href="${escapeHtml(dashboardCategoryUrl)}">Open category runs</a></p>
                    ${renderedSections}
                </div>`;
            })
            .join("")}
    </section>`,
    );

    return {
        subject,
        text: [
            `Hello ${payload.user.name},`,
            "",
            "Here is your Mabrik digest.",
            "",
            "View all changes in dashboard:",
            primaryDigestUrl,
            "",
            ...textSections,
        ].join("\n"),
        html: `<html><body>
            <h1>Mabrik digest</h1>
            <p>Hello ${escapeHtml(payload.user.name)},</p>
            <p>Here is your Mabrik digest.</p>
            <p><a href="${escapeHtml(primaryDigestUrl)}"><strong>View all changes in dashboard</strong></a></p>
            ${htmlSections.join("")}
        </body></html>`,
    };
};
