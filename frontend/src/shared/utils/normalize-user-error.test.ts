import { ApiError } from "../../lib/api/errors";
import { normalizeUserError } from "./normalize-user-error";

describe("normalizeUserError", () => {
    it("maps known API error codes to safe user messages", () => {
        const error = new ApiError({
            status: 400,
            code: "subscription_limit_reached",
            message: "Limit reached in backend response",
        });

        expect(normalizeUserError(error)).toBe(
            "You have reached your plan limit for tracked categories.",
        );
    });

    it("falls back to API message for unknown API error code", () => {
        const error = new ApiError({
            status: 400,
            code: "custom_error_code",
            message: "Custom API error",
        });

        expect(normalizeUserError(error)).toBe("Custom API error");
    });

    it("falls back to generic message for unknown values", () => {
        expect(normalizeUserError(null)).toBe("Something went wrong. Please try again.");
    });
});
