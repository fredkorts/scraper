import type { PageWindowItem, PageWindowOptions } from "./types/page-window.types";

const range = (start: number, end: number): number[] => {
    if (end < start) {
        return [];
    }

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
};

const toPageWindowItem = (page: number): PageWindowItem => ({
    kind: "page",
    page,
});

export const buildPageWindow = ({
    page,
    totalPages,
    siblingCount = 1,
    boundaryCount = 1,
}: PageWindowOptions): PageWindowItem[] => {
    if (totalPages <= 0) {
        return [];
    }

    const safePage = Math.min(Math.max(page, 1), totalPages);
    const maxSlots = boundaryCount * 2 + siblingCount * 2 + 3;

    if (totalPages <= maxSlots) {
        return range(1, totalPages).map(toPageWindowItem);
    }

    const leftSibling = Math.max(safePage - siblingCount, boundaryCount + 2);
    const rightSibling = Math.min(safePage + siblingCount, totalPages - boundaryCount - 1);

    const showLeftEllipsis = leftSibling > boundaryCount + 2;
    const showRightEllipsis = rightSibling < totalPages - boundaryCount - 1;

    const startPages = range(1, boundaryCount);
    const endPages = range(totalPages - boundaryCount + 1, totalPages);

    const items: PageWindowItem[] = startPages.map(toPageWindowItem);

    if (showLeftEllipsis) {
        items.push({ kind: "ellipsis", id: "start-ellipsis" });
    } else {
        const leftRangeStart = boundaryCount + 1;
        const leftRangeEnd = leftSibling - 1;
        items.push(...range(leftRangeStart, leftRangeEnd).map(toPageWindowItem));
    }

    items.push(...range(leftSibling, rightSibling).map(toPageWindowItem));

    if (showRightEllipsis) {
        items.push({ kind: "ellipsis", id: "end-ellipsis" });
    } else {
        const rightRangeStart = rightSibling + 1;
        const rightRangeEnd = totalPages - boundaryCount;
        items.push(...range(rightRangeStart, rightRangeEnd).map(toPageWindowItem));
    }

    items.push(...endPages.map(toPageWindowItem));

    return items;
};
