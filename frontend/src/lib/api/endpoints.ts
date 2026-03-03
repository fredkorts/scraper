export const apiEndpoints = {
    auth: {
        me: "/api/auth/me",
        login: "/api/auth/login",
        register: "/api/auth/register",
        refresh: "/api/auth/refresh",
        logout: "/api/auth/logout",
    },
    dashboard: {
        home: "/api/dashboard/home",
    },
    categories: {
        list: "/api/categories",
    },
    products: {
        detail: (id: string) => `/api/products/${id}`,
        history: (id: string) => `/api/products/${id}/history`,
    },
    runs: {
        list: "/api/runs",
        detail: (id: string) => `/api/runs/${id}`,
        products: (id: string) => `/api/runs/${id}/products`,
        changes: (id: string) => `/api/runs/${id}/changes`,
    },
    notifications: {
        channels: "/api/notifications/channels",
        detail: (id: string) => `/api/notifications/channels/${id}`,
    },
} as const;
