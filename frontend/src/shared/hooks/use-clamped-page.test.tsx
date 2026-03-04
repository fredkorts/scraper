import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useClampedPage } from "./use-clamped-page";

describe("useClampedPage", () => {
    it("resets to page 1 when there are zero pages and current page is out of range", async () => {
        const onPageChange = vi.fn();

        renderHook(() =>
            useClampedPage({
                currentPage: 3,
                totalPages: 0,
                onPageChange,
            }),
        );

        await waitFor(() => {
            expect(onPageChange).toHaveBeenCalledWith(1, { replace: true });
        });
    });

    it("clamps to last page when current page exceeds total pages", async () => {
        const onPageChange = vi.fn();

        renderHook(() =>
            useClampedPage({
                currentPage: 8,
                totalPages: 5,
                onPageChange,
            }),
        );

        await waitFor(() => {
            expect(onPageChange).toHaveBeenCalledWith(5, { replace: true });
        });
    });
});
