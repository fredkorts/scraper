import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useRouteSearchUpdater } from "./use-route-search-updater";

describe("useRouteSearchUpdater", () => {
    it("merges previous search with update values", () => {
        const navigate = vi.fn();

        const { result } = renderHook(() =>
            useRouteSearchUpdater<{ page: number; status?: string }>(navigate),
        );

        result.current({ status: "failed" }, { replace: true });

        expect(navigate).toHaveBeenCalledTimes(1);
        const options = navigate.mock.calls[0]?.[0] as {
            to: ".";
            replace?: boolean;
            search: (prev: { page: number; status?: string }) => { page: number; status?: string };
        };

        expect(options.to).toBe(".");
        expect(options.replace).toBe(true);
        expect(options.search({ page: 2 })).toEqual({ page: 2, status: "failed" });
    });
});
