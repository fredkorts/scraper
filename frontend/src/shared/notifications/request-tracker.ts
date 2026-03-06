const buildRequestIdentity = (key: string, requestId?: string): string => {
    return requestId ? `${key}:${requestId}` : key;
};

export interface NotificationRequestTracker {
    markLatest: (actionKey: string, requestId?: string) => void;
    isLatest: (actionKey: string, requestId?: string) => boolean;
}

export const createNotificationRequestTracker = (): NotificationRequestTracker => {
    const latestByActionKey = new Map<string, string>();

    const markLatest = (actionKey: string, requestId?: string) => {
        latestByActionKey.set(actionKey, buildRequestIdentity(actionKey, requestId));
    };

    const isLatest = (actionKey: string, requestId?: string) => {
        const latestIdentity = latestByActionKey.get(actionKey);

        if (!latestIdentity) {
            return true;
        }

        return latestIdentity === buildRequestIdentity(actionKey, requestId);
    };

    return {
        markLatest,
        isLatest,
    };
};
