export const apiEndpoints = {
    auth: {
        me: "/api/auth/me",
        login: "/api/auth/login",
        register: "/api/auth/register",
        refresh: "/api/auth/refresh",
        logout: "/api/auth/logout",
        csrf: "/api/auth/csrf",
        updateMe: "/api/auth/me",
        forgotPassword: "/api/auth/password/forgot",
        resetPassword: "/api/auth/password/reset",
        resendEmailVerification: "/api/auth/email-verification/resend",
        verifyEmail: "/api/auth/email-verification/verify",
        verifyMfaLogin: "/api/auth/mfa/verify-login",
        startMfaSetup: "/api/auth/mfa/setup/start",
        confirmMfaSetup: "/api/auth/mfa/setup/confirm",
        disableMfa: "/api/auth/mfa/disable",
        regenerateRecoveryCodes: "/api/auth/mfa/recovery-codes/regenerate",
        sessions: "/api/auth/sessions",
        revokeOthers: "/api/auth/sessions/revoke-others",
    },
    dashboard: {
        home: "/api/dashboard/home",
    },
    changes: {
        list: "/api/changes",
    },
    admin: {
        schedulerState: "/api/admin/scheduler/state",
    },
    categories: {
        list: "/api/categories",
        settings: (id: string) => `/api/categories/${id}/settings`,
    },
    products: {
        search: "/api/products/search",
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
        telegramLink: "/api/notifications/channels/telegram/link",
        telegramLinkStatus: "/api/notifications/channels/telegram/link-status",
        telegramConfirm: "/api/notifications/channels/telegram/confirm",
    },
    subscriptions: {
        list: "/api/subscriptions",
        detail: (id: string) => `/api/subscriptions/${id}`,
    },
    trackedProducts: {
        list: "/api/tracked-products",
        byProduct: (productId: string) => `/api/tracked-products/by-product/${productId}`,
    },
} as const;
