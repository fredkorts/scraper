import { useCallback } from "react";

interface SearchUpdateOptions {
    replace?: boolean;
}

interface SearchNavigateOptions<TSearch extends Record<string, unknown>> {
    to: ".";
    replace?: boolean;
    search: (prev: TSearch) => TSearch;
}

type SearchNavigateFn<TSearch extends Record<string, unknown>> = (
    options: SearchNavigateOptions<TSearch>,
) => unknown;

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
