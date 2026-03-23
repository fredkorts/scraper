import { tryRecoverFromChunkLoadError } from "./chunk-load-recovery";

describe("tryRecoverFromChunkLoadError", () => {
    beforeEach(() => {
        window.sessionStorage.clear();
    });

    it("reloads once for a dynamic import chunk load error", () => {
        const reload = vi.fn();
        const error = new TypeError(
            "error loading dynamically imported module: https://www.pricepulse.site/assets/product-detail-page-DJ5RXwc1.js",
        );

        const firstAttempt = tryRecoverFromChunkLoadError(error, reload);
        const secondAttempt = tryRecoverFromChunkLoadError(error, reload);

        expect(firstAttempt).toBe(true);
        expect(secondAttempt).toBe(false);
        expect(reload).toHaveBeenCalledTimes(1);
    });

    it("allows one recovery attempt per chunk identifier", () => {
        const reload = vi.fn();
        const firstError = new TypeError(
            "error loading dynamically imported module: https://www.pricepulse.site/assets/product-detail-page-DJ5RXwc1.js",
        );
        const secondError = new TypeError(
            "error loading dynamically imported module: https://www.pricepulse.site/assets/product-detail-page-NEW12345.js",
        );

        expect(tryRecoverFromChunkLoadError(firstError, reload)).toBe(true);
        expect(tryRecoverFromChunkLoadError(secondError, reload)).toBe(true);
        expect(reload).toHaveBeenCalledTimes(2);
    });

    it("does not reload for non-chunk errors", () => {
        const reload = vi.fn();
        const error = new Error("Validation failed");

        expect(tryRecoverFromChunkLoadError(error, reload)).toBe(false);
        expect(reload).not.toHaveBeenCalled();
    });
});
