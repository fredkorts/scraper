import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../../../lib/api/errors";
import { requestWithPreorderFallback } from "./preorder-request-fallback";

describe("requestWithPreorderFallback", () => {
    it("retries once without preorder query when backend rejects legacy param", async () => {
        const request = vi
            .fn<(path: string) => Promise<string>>()
            .mockRejectedValueOnce(
                new ApiError({
                    status: 400,
                    code: "validation_error",
                    message: "Invalid request",
                }),
            )
            .mockResolvedValueOnce("ok");

        const result = await requestWithPreorderFallback("/api/changes?page=1&preorder=all", request);

        expect(result).toBe("ok");
        expect(request).toHaveBeenNthCalledWith(1, "/api/changes?page=1&preorder=all");
        expect(request).toHaveBeenNthCalledWith(2, "/api/changes?page=1");
    });

    it("does not retry when preorder query is not present", async () => {
        const request = vi.fn<(path: string) => Promise<string>>().mockRejectedValue(
            new ApiError({
                status: 400,
                code: "validation_error",
                message: "Invalid request",
            }),
        );

        await expect(requestWithPreorderFallback("/api/changes?page=1", request)).rejects.toBeInstanceOf(ApiError);
        expect(request).toHaveBeenCalledTimes(1);
    });
});
