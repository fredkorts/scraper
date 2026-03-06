export interface SearchUpdateOptions {
    replace?: boolean;
}

export interface SearchNavigateOptions<TSearch extends Record<string, unknown>> {
    to: ".";
    replace?: boolean;
    search: (prev: TSearch) => TSearch;
}

export type SearchNavigateFn<TSearch extends Record<string, unknown>> = (
    options: SearchNavigateOptions<TSearch>,
) => unknown;
