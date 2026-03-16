import { ChangeType } from "@prisma/client";
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

const WATCHED_SECTION_LABEL = "Watched products changed";
const WATCHED_SECTION_CAP = 10;

const renderWatchedTextSection = (
    items: ImmediateDeliveryPayload["changeItems"] | DigestRecipientPayload["deliveries"][number]["changeItems"],
) => {
    const watchedItems = items.filter((item) => item.isWatchedAtSend);
    if (watchedItems.length === 0) {
        return [];
    }

    const visibleItems = watchedItems.slice(0, WATCHED_SECTION_CAP);
    const overflowCount = watchedItems.length - visibleItems.length;
    const lines = [`${WATCHED_SECTION_LABEL} (${watchedItems.length})`, ...visibleItems.map(renderItemText)];

    if (overflowCount > 0) {
        lines.push(`+${overflowCount} more watched changes`);
    }

    lines.push("");
    return lines;
};

const renderWatchedHtmlSection = (
    items: ImmediateDeliveryPayload["changeItems"] | DigestRecipientPayload["deliveries"][number]["changeItems"],
) => {
    const watchedItems = items.filter((item) => item.isWatchedAtSend);
    if (watchedItems.length === 0) {
        return "";
    }

    const visibleItems = watchedItems.slice(0, WATCHED_SECTION_CAP);
    const overflowCount = watchedItems.length - visibleItems.length;

    return `<section style="margin-bottom:24px;">
        <h2 style="margin:0 0 12px 0;">${escapeHtml(WATCHED_SECTION_LABEL)} (${watchedItems.length})</h2>
        <ul style="margin:0; padding-left:20px;">${visibleItems.map(renderItemHtml).join("")}</ul>
        ${overflowCount > 0 ? `<p style="margin-top:8px;">+${overflowCount} more watched changes</p>` : ""}
    </section>`;
};

export const renderImmediateEmail = (payload: ImmediateDeliveryPayload) => {
    const categoryName = payload.report.scrapeRun.category.nameEt;
    const groupedItems = groupChangeItems(payload.changeItems);
    const sectionSummaries = buildSectionSummaries(groupedItems);
    const summaryText = sectionSummaries.map((summary) => `${summary.label}: ${summary.count}`).join(", ");
    const categoryRunsUrl = buildCategoryRunsUrl(payload.report.scrapeRun.category.id);
    const dashboardCategoryUrl = buildDashboardCategoryUrl(payload.report.scrapeRun.category.id);
    const runTimestamp = formatUtcTimestamp(getRunTimestamp(payload));
    const preorderCount = getDistinctPreorderProductCount(payload.changeItems);
    const watchedTextSection = renderWatchedTextSection(payload.changeItems);
    const watchedHtmlSection = renderWatchedHtmlSection(payload.changeItems);
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
            ...watchedTextSection,
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
            ${watchedHtmlSection}
            ${renderedHtmlSections}
            <p><a href="${escapeHtml(categoryRunsUrl)}"><strong>View all changes in dashboard</strong></a><br />
            <a href="${escapeHtml(dashboardCategoryUrl)}">Open category runs</a></p>
        </body></html>`,
    };
};

const TELEGRAM_HIGHLIGHT_LIMIT = 3;
const TELEGRAM_ITEM_LINE_MAX_CHARS = 90;

const getTelegramSeverityRank = (changeType: ImmediateDeliveryPayload["changeItems"][number]["changeType"]): number => {
    switch (changeType) {
        case ChangeType.SOLD_OUT:
            return 0;
        case ChangeType.BACK_IN_STOCK:
            return 1;
        case ChangeType.PRICE_DECREASE:
            return 2;
        case ChangeType.PRICE_INCREASE:
            return 3;
        case ChangeType.NEW_PRODUCT:
            return 4;
        default:
            return 5;
    }
};

const getTelegramChangeMarker = (changeType: ImmediateDeliveryPayload["changeItems"][number]["changeType"]): string => {
    switch (changeType) {
        case ChangeType.SOLD_OUT:
            return "🔴";
        case ChangeType.BACK_IN_STOCK:
            return "🟢";
        case ChangeType.PRICE_DECREASE:
            return "⬇";
        case ChangeType.PRICE_INCREASE:
            return "⬆";
        case ChangeType.NEW_PRODUCT:
            return "🆕";
        default:
            return "•";
    }
};

const toGraphemes = (value: string): string[] => {
    if (typeof Intl.Segmenter === "function") {
        const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
        return Array.from(segmenter.segment(value), (entry) => entry.segment);
    }

    return Array.from(value);
};

const truncateToGraphemes = (value: string, maxGraphemes: number): string => {
    if (maxGraphemes <= 0) {
        return "";
    }

    const graphemes = toGraphemes(value);
    if (graphemes.length <= maxGraphemes) {
        return value;
    }

    if (maxGraphemes === 1) {
        return "…";
    }

    return `${graphemes.slice(0, maxGraphemes - 1).join("")}…`;
};

const truncateForEscapedBudget = (value: string, maxEscapedChars: number): string => {
    if (escapeHtml(value).length <= maxEscapedChars) {
        return value;
    }

    let graphemes = toGraphemes(value);
    while (graphemes.length > 1) {
        graphemes = graphemes.slice(0, -1);
        const candidate = `${graphemes.join("")}…`;
        if (escapeHtml(candidate).length <= maxEscapedChars) {
            return candidate;
        }
    }

    return "…";
};

const formatTelegramPrice = (value: unknown): string => {
    if (value === null || value === undefined) {
        return "-";
    }

    const number = typeof value === "number" ? value : Number(value);
    return `€${number.toFixed(2)}`;
};

const formatTelegramPriceChangeDetail = (item: ImmediateDeliveryPayload["changeItems"][number]): string => {
    if (item.newPrice === null || item.newPrice === undefined) {
        return "";
    }

    if (item.oldPrice === null || item.oldPrice === undefined) {
        return `${formatTelegramPrice(item.newPrice)}`;
    }

    const oldPrice = typeof item.oldPrice === "number" ? item.oldPrice : Number(item.oldPrice);
    const newPrice = typeof item.newPrice === "number" ? item.newPrice : Number(item.newPrice);
    const delta = newPrice - oldPrice;
    const sign = delta >= 0 ? "+" : "-";
    const deltaLabel = `${sign}€${Math.abs(delta).toFixed(2)}`;

    return `${formatTelegramPrice(newPrice)} (${deltaLabel})`;
};

const formatTelegramStockDetail = (
    changeType: ImmediateDeliveryPayload["changeItems"][number]["changeType"],
): string => {
    if (changeType === ChangeType.SOLD_OUT) {
        return "Sold out";
    }

    if (changeType === ChangeType.BACK_IN_STOCK) {
        return "Back in stock";
    }

    return "";
};

const getTelegramItemDetail = (item: ImmediateDeliveryPayload["changeItems"][number]): string => {
    if (item.changeType === ChangeType.PRICE_DECREASE || item.changeType === ChangeType.PRICE_INCREASE) {
        return formatTelegramPriceChangeDetail(item);
    }

    if (item.changeType === ChangeType.NEW_PRODUCT) {
        return item.newPrice !== null && item.newPrice !== undefined
            ? formatTelegramPrice(item.newPrice)
            : "New product";
    }

    return formatTelegramStockDetail(item.changeType);
};

const formatTelegramHighlightLine = (item: ImmediateDeliveryPayload["changeItems"][number]): string => {
    const watchedPrefix = item.isWatchedAtSend ? "⭐ " : "";
    const marker = getTelegramChangeMarker(item.changeType);
    const detail = getTelegramItemDetail(item);
    const prefix = `${watchedPrefix}${marker} `;
    const detailSuffix = detail ? ` - ${detail}` : "";
    const reservedGraphemes = toGraphemes(prefix).length + toGraphemes(detailSuffix).length;
    const maxNameGraphemes = Math.max(8, TELEGRAM_ITEM_LINE_MAX_CHARS - reservedGraphemes);
    const truncatedName = truncateToGraphemes(item.product.name, maxNameGraphemes);
    const rawLine = `${prefix}${truncatedName}${detailSuffix}`;
    const budgetedLine = truncateForEscapedBudget(rawLine, TELEGRAM_ITEM_LINE_MAX_CHARS);

    return escapeHtml(budgetedLine);
};

const getPrioritizedTelegramItems = (items: ImmediateDeliveryPayload["changeItems"]) =>
    items
        .map((item, index) => ({ item, index }))
        .sort((left, right) => {
            const watchedRankLeft = left.item.isWatchedAtSend ? 0 : 1;
            const watchedRankRight = right.item.isWatchedAtSend ? 0 : 1;
            if (watchedRankLeft !== watchedRankRight) {
                return watchedRankLeft - watchedRankRight;
            }

            const severityLeft = getTelegramSeverityRank(left.item.changeType);
            const severityRight = getTelegramSeverityRank(right.item.changeType);
            if (severityLeft !== severityRight) {
                return severityLeft - severityRight;
            }

            return left.index - right.index;
        })
        .map((entry) => entry.item);

const isValidTimeZone = (value: string): boolean => {
    try {
        new Intl.DateTimeFormat("en-GB", { timeZone: value }).format(new Date());
        return true;
    } catch {
        return false;
    }
};

const formatTelegramRunTimestamp = (value: Date, timezoneCandidate?: string): string => {
    if (timezoneCandidate && isValidTimeZone(timezoneCandidate)) {
        const formatter = new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: timezoneCandidate,
        });

        return `${formatter.format(value)} ${timezoneCandidate}`;
    }

    return formatUtcTimestamp(value);
};

const renderImmediateTelegramLegacy = (payload: ImmediateDeliveryPayload): { text: string } => {
    const categoryName = payload.report.scrapeRun.category.nameEt;
    const categoryRunsUrl = buildCategoryRunsUrl(payload.report.scrapeRun.category.id);
    const runTimestamp = formatUtcTimestamp(getRunTimestamp(payload));
    const topItems = payload.changeItems.slice(0, 5);
    const overflow = payload.changeItems.length - topItems.length;

    const lines = [
        "PricePulse alert",
        `${payload.report.totalChanges} changes in ${categoryName}`,
        `Run time: ${runTimestamp}`,
        "",
        ...topItems.map((item) => {
            const priceLine =
                item.oldPrice !== null || item.newPrice !== null
                    ? ` | ${formatPrice(item.oldPrice)} -> ${formatPrice(item.newPrice)}`
                    : "";
            const stockLine =
                item.oldStockStatus !== null || item.newStockStatus !== null
                    ? ` | ${formatStockStatus(item.oldStockStatus)} -> ${formatStockStatus(item.newStockStatus)}`
                    : "";

            return `• ${item.product.name}${priceLine}${stockLine}`;
        }),
    ];

    if (overflow > 0) {
        lines.push(`+${overflow} more changes`);
    }

    lines.push("", `View in PricePulse: ${categoryRunsUrl}`);

    return {
        text: lines.join("\n"),
    };
};

export const renderImmediateTelegram = (payload: ImmediateDeliveryPayload): { text: string; parseMode?: "HTML" } => {
    if (!config.NOTIFICATIONS_TELEGRAM_TEMPLATE_V2) {
        return renderImmediateTelegramLegacy(payload);
    }

    const categoryName = escapeHtml(payload.report.scrapeRun.category.nameEt);
    const categoryRunsUrl = buildCategoryRunsUrl(payload.report.scrapeRun.category.id);
    const userTimezone =
        typeof (payload.user as Record<string, unknown>).timezone === "string"
            ? ((payload.user as Record<string, unknown>).timezone as string)
            : undefined;
    const runTimestamp = escapeHtml(formatTelegramRunTimestamp(getRunTimestamp(payload), userTimezone));
    const prioritizedItems = getPrioritizedTelegramItems(payload.changeItems);
    const topItems = prioritizedItems.slice(0, TELEGRAM_HIGHLIGHT_LIMIT);
    const overflow = prioritizedItems.length - topItems.length;

    const lines = [
        `<b>PricePulse:</b> ${payload.report.totalChanges} changes in ${categoryName}`,
        `<b>Run:</b> ${runTimestamp}`,
        "",
        ...topItems.map(formatTelegramHighlightLine),
    ];

    if (overflow > 0) {
        lines.push(`+${overflow} more changes`);
    }

    lines.push("", `<a href="${escapeHtml(categoryRunsUrl)}">View all changes in PricePulse</a>`);

    return {
        text: lines.join("\n"),
        parseMode: "HTML",
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
            const watchedTextSection = renderWatchedTextSection(delivery.changeItems);
            lines.push(`- Report ${delivery.report.id}: ${delivery.changeItems.length} changes`);
            lines.push(`  Category: ${delivery.report.scrapeRun.category.nameEt}`);
            lines.push(`  Run time: ${runTimestamp}`);
            lines.push(`  Changed products: ${delivery.report.totalChanges}`);
            lines.push(`  Sections: ${sectionSummaries.length}`);
            lines.push(`  Preorders in this report: ${preorderCount}`);
            lines.push(...watchedTextSection.map((line) => (line ? `  ${line}` : line)));
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
                const watchedHtmlSection = renderWatchedHtmlSection(delivery.changeItems);
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
                    ${watchedHtmlSection}
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
