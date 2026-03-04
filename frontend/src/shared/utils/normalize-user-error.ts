import { ApiError } from "../../lib/api/errors";
import { DEFAULT_USER_ERROR_MESSAGE, USER_ERROR_MESSAGES } from "../constants/error-messages";

export const normalizeUserError = (error: unknown, fallback = DEFAULT_USER_ERROR_MESSAGE): string => {
    if (error instanceof ApiError) {
        return USER_ERROR_MESSAGES[error.code] ?? error.message ?? fallback;
    }

    if (error instanceof Error && error.message.trim().length > 0) {
        return error.message;
    }

    return fallback;
};
