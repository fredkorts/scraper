import { useCallback } from "react";
import type {
    SearchNavigateFn,
    SearchUpdateOptions,
} from "./types/use-route-search-updater.types";

export const useRouteSearchUpdater = <TSearch extends Record<string, unknown>>(
    navigate: SearchNavigateFn<TSearch>,
) =>
    useCallback(
        (updates: Partial<TSearch>, options?: SearchUpdateOptions) =>
            navigate({
                to: ".",
                replace: options?.replace,
                search: (prev) => ({
                    ...prev,
                    ...updates,
                }),
            }),
        [navigate],
    );
