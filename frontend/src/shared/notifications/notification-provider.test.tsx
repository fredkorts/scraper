import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { useAppNotification } from "../hooks/use-app-notification";
import { normalizeNotificationPayload } from "./notification-payload";
import { AppNotificationProvider } from "./notification-provider";

const TestTrigger = () => {
    const { notify } = useAppNotification();

    return (
        <button
            onClick={() =>
                notify({
                    variant: "success",
                    message: "Saved",
                    description: "Settings were saved.",
                    key: "settings:save",
                })
            }
            type="button"
        >
            Trigger
        </button>
    );
};

const InvalidConsumer = () => {
    useAppNotification();
    return null;
};

describe("notification-provider", () => {
    it("throws when hook is used outside provider", () => {
        expect(() => render(<InvalidConsumer />)).toThrow("useAppNotification must be used within AppNotificationProvider");
    });

    it("renders a real notification with mapped icon through provider", async () => {
        const user = userEvent.setup();

        render(
            <AppNotificationProvider>
                <TestTrigger />
            </AppNotificationProvider>,
        );

        await user.click(screen.getByRole("button", { name: "Trigger" }));

        await waitFor(() => {
            expect(screen.getByText("Saved")).toBeInTheDocument();
            expect(screen.getByText("Settings were saved.")).toBeInTheDocument();
        });

        expect(screen.getByLabelText("check-circle")).toBeInTheDocument();
    });

    it("normalizes payload defaults and optional fields", () => {
        const normalized = normalizeNotificationPayload({
            variant: "error",
            message: "   ",
            action: {
                label: "Retry",
                onClick: () => undefined,
            },
            requestId: "req-1",
        });

        expect(normalized.message).toBe("Update");
        expect(normalized.durationSeconds).toBe(8);
        expect(normalized.action?.label).toBe("Retry");
        expect(normalized.requestId).toBe("req-1");
    });
});
