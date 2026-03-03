export const formatDateTime = (value?: string): string => {
    if (!value) {
        return "-";
    }

    return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
};

export const formatDuration = (durationMs?: number): string => {
    if (!durationMs || durationMs <= 0) {
        return "-";
    }

    const seconds = Math.round(durationMs / 1000);

    if (seconds < 60) {
        return `${seconds}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return remainingSeconds === 0 ? `${minutes}m` : `${minutes}m ${remainingSeconds}s`;
};

export const formatPrice = (value?: number): string => {
    if (value === undefined) {
        return "-";
    }

    return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 2,
    }).format(value);
};

export const formatStatusLabel = (status: string): string =>
    status
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
