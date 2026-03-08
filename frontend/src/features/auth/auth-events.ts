const AUTH_EVENT_CHANNEL_NAME = "auth-events";
const AUTH_EVENT_KEY = "pricepulse:auth-event";

type AuthEventType = "signed_out" | "session_revoked" | "password_reset";

interface AuthEventPayload {
    type: AuthEventType;
    timestamp: number;
}

let authChannel: BroadcastChannel | null = null;

const getAuthChannel = (): BroadcastChannel | null => {
    if (typeof window === "undefined" || typeof BroadcastChannel !== "function") {
        return null;
    }

    if (!authChannel) {
        authChannel = new BroadcastChannel(AUTH_EVENT_CHANNEL_NAME);
    }

    return authChannel;
};

export const broadcastAuthEvent = (type: AuthEventType): void => {
    const payload: AuthEventPayload = {
        type,
        timestamp: Date.now(),
    };

    const channel = getAuthChannel();
    if (channel) {
        channel.postMessage(payload);
        return;
    }

    if (typeof window !== "undefined") {
        window.localStorage.setItem(AUTH_EVENT_KEY, JSON.stringify(payload));
        window.localStorage.removeItem(AUTH_EVENT_KEY);
    }
};

export const subscribeAuthEvents = (onEvent: (payload: AuthEventPayload) => void): (() => void) => {
    const channel = getAuthChannel();
    if (channel) {
        const listener = (event: MessageEvent<AuthEventPayload>) => onEvent(event.data);
        channel.addEventListener("message", listener);
        return () => {
            channel.removeEventListener("message", listener);
        };
    }

    const storageListener = (event: StorageEvent) => {
        if (event.key !== AUTH_EVENT_KEY || !event.newValue) {
            return;
        }

        try {
            onEvent(JSON.parse(event.newValue) as AuthEventPayload);
        } catch {
            // ignore malformed payload
        }
    };

    window.addEventListener("storage", storageListener);
    return () => {
        window.removeEventListener("storage", storageListener);
    };
};
