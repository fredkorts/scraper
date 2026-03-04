import { buildPageWindow } from "./page-window";

const toReadableWindow = (items: ReturnType<typeof buildPageWindow>) =>
    items.map((item) => (item.kind === "page" ? item.page : "..."));

describe("buildPageWindow", () => {
    it("renders all pages for small totals", () => {
        const items = buildPageWindow({
            page: 3,
            totalPages: 5,
        });

        expect(toReadableWindow(items)).toEqual([1, 2, 3, 4, 5]);
    });

    it("renders a compact middle window with ellipsis", () => {
        const items = buildPageWindow({
            page: 14,
            totalPages: 42,
        });

        expect(toReadableWindow(items)).toEqual([1, "...", 13, 14, 15, "...", 42]);
    });

    it("renders near-start window without left ellipsis", () => {
        const items = buildPageWindow({
            page: 2,
            totalPages: 10,
        });

        expect(toReadableWindow(items)).toEqual([1, 2, 3, "...", 10]);
    });

    it("renders near-end window without right ellipsis", () => {
        const items = buildPageWindow({
            page: 9,
            totalPages: 10,
        });

        expect(toReadableWindow(items)).toEqual([1, "...", 8, 9, 10]);
    });

    it("never emits out-of-range page values", () => {
        const items = buildPageWindow({
            page: 999,
            totalPages: 12,
        });

        const numericItems = items.flatMap((item) => (item.kind === "page" ? [item.page] : []));

        expect(Math.min(...numericItems)).toBeGreaterThanOrEqual(1);
        expect(Math.max(...numericItems)).toBeLessThanOrEqual(12);
    });
});
