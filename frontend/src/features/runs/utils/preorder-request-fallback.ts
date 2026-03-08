import { ApiError } from "../../../lib/api/errors";

const PREORDER_QUERY_PARAM = "preorder";

const removePreorderParam = (path: string): string => {
    const hasAbsoluteUrl = path.startsWith("http://") || path.startsWith("https://");
    const url = new URL(path, "http://localhost");
    url.searchParams.delete(PREORDER_QUERY_PARAM);

    const normalizedPath = `${url.pathname}${url.search}${url.hash}`;
    return hasAbsoluteUrl ? url.toString() : normalizedPath;
};

const isLegacyPreorderRejection = (error: unknown): boolean => {
    if (!(error instanceof ApiError)) {
        return false;
    }

    return error.status === 400 && error.code === "validation_error";
};

export const requestWithPreorderFallback = async <T>(
    path: string,
    request: (requestPath: string) => Promise<T>,
): Promise<T> => {
    try {
        return await request(path);
    } catch (error) {
        if (!path.includes(`${PREORDER_QUERY_PARAM}=`) || !isLegacyPreorderRejection(error)) {
            throw error;
        }

        const fallbackPath = removePreorderParam(path);
        if (fallbackPath === path) {
            throw error;
        }

        return request(fallbackPath);
    }
};
