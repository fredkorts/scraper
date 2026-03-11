import { renderHook } from "@testing-library/react";
import { act } from "@testing-library/react";
import { useDebouncedValue } from "./use-debounced-value";

describe("useDebouncedValue", () => {
    it("updates the debounced value after the delay", () => {
        vi.useFakeTimers();

        const { result, rerender } = renderHook(({ value, delayMs }) => useDebouncedValue(value, delayMs), {
            initialProps: { value: "initial", delayMs: 300 },
        });

        rerender({ value: "updated", delayMs: 300 });
        expect(result.current).toBe("initial");

        act(() => {
            vi.advanceTimersByTime(300);
        });

        expect(result.current).toBe("updated");
        vi.useRealTimers();
    });
});
