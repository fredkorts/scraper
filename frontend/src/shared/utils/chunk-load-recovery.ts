const CHUNK_LOAD_RECOVERY_STORAGE_KEY_PREFIX = "pricepulse:chunk-load-recovery:";
const CHUNK_FILENAME_PATTERN = /\/assets\/([a-z0-9_-]+(?:\.[a-z0-9_-]+)*)\.(?:js|css)/i;

const toErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
        return error.message;
    }

    return typeof error === "string" ? error : "";
};

const getChunkLoadRecoveryKey = (error: unknown): string | null => {
    const message = toErrorMessage(error);
    if (message.length === 0) {
        return null;
    }

    const normalized = message.toLocaleLowerCase();
    const isChunkLoadError =
        normalized.includes("error loading dynamically imported module") ||
        normalized.includes("failed to fetch dynamically imported module") ||
        normalized.includes("importing a module script failed") ||
        normalized.includes("chunkloaderror");

    if (!isChunkLoadError) {
        return null;
    }

    const match = message.match(CHUNK_FILENAME_PATTERN);
    const chunkIdentifier = match?.[1]?.toLocaleLowerCase() ?? "unknown";

    return `${CHUNK_LOAD_RECOVERY_STORAGE_KEY_PREFIX}${chunkIdentifier}`;
};

const hasWindowSessionStorage = (): boolean =>
    typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";

export const tryRecoverFromChunkLoadError = (error: unknown, reload: () => void): boolean => {
    const recoveryKey = getChunkLoadRecoveryKey(error);

    if (!recoveryKey || !hasWindowSessionStorage()) {
        return false;
    }

    if (window.sessionStorage.getItem(recoveryKey) === "1") {
        return false;
    }

    window.sessionStorage.setItem(recoveryKey, "1");
    reload();
    return true;
};
