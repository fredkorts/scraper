export const queryKeys = {
    auth: {
        me: () => ["auth", "me"] as const,
    },
    dashboard: {
        home: () => ["dashboard", "home"] as const,
        filteredHome: (params?: Record<string, unknown>) => ["dashboard", "home", params ?? {}] as const,
    },
    categories: {
        list: () => ["categories", "list"] as const,
    },
    runs: {
        list: (params?: Record<string, unknown>) => ["runs", "list", params ?? {}] as const,
        detail: (runId: string) => ["runs", "detail", runId] as const,
        products: (runId: string, params?: Record<string, unknown>) =>
            ["runs", "products", runId, params ?? {}] as const,
        changes: (runId: string, params?: Record<string, unknown>) =>
            ["runs", "changes", runId, params ?? {}] as const,
    },
    products: {
        detail: (productId: string) => ["products", "detail", productId] as const,
        history: (productId: string, params?: Record<string, unknown>) =>
            ["products", "history", productId, params ?? {}] as const,
    },
    notifications: {
        channels: () => ["notifications", "channels"] as const,
    },
};
