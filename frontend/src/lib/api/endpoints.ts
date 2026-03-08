export const apiEndpoints = {
    auth: {
        me: "/api/auth/me",
        login: "/api/auth/login",
        register: "/api/auth/register",
        refresh: "/api/auth/refresh",
        logout: "/api/auth/logout",
        updateMe: "/api/auth/me",
    },
    dashboard: {
        home: "/api/dashboard/home",
    },
    admin: {
        schedulerState: "/api/admin/scheduler/state",
    },
    categories: {
        list: "/api/categories",
        settings: (id: string) => `/api/categories/${id}/settings`,
    },
    products: {
        detail: (id: string) => `/api/products/${id}`,
        history: (id: string) => `/api/products/${id}/history`,
    },
    runs: {
        list: "/api/runs",
        trigger: "/api/runs/trigger",
        detail: (id: string) => `/api/runs/${id}`,
        products: (id: string) => `/api/runs/${id}/products`,
        changes: (id: string) => `/api/runs/${id}/changes`,
    },
    notifications: {
        channels: "/api/notifications/channels",
        detail: (id: string) => `/api/notifications/channels/${id}`,
    },
    subscriptions: {
        list: "/api/subscriptions",
        detail: (id: string) => `/api/subscriptions/${id}`,
    },
} as const;
