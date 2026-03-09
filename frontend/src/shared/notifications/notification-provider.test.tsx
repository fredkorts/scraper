import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { useAppNotification } from "../hooks/use-app-notification";
import { normalizeNotificationPayload } from "./notification-payload";
import styles from "./notification.module.scss";
import { AppNotificationProvider } from "./notification-provider";

const TestTrigger = () => {
    const { notify } = useAppNotification();

    return (
        <>
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
                Trigger success
            </button>
            <button
                onClick={() =>
                    notify({
                        variant: "error",
                        message: "Failed",
                        description: "Action failed.",
                    })
                }
                type="button"
            >
                Trigger error
            </button>
            <button
                onClick={() =>
                    notify({
                        variant: "info",
                        message: "Information",
                        description: "Informational update.",
                    })
                }
                type="button"
            >
                Trigger info
            </button>
            <button
                onClick={() =>
                    notify({
                        variant: "warning",
                        message: "Warning",
                        description: "Potential issue detected.",
                    })
                }
                type="button"
            >
                Trigger warning
            </button>
            <button
                onClick={() =>
                    notify({
                        variant: "error",
                        key: "auth:login:failed",
                        message: "Invalid email or password",
                    })
                }
                type="button"
            >
                Trigger dedupe first
            </button>
            <button
                onClick={() =>
                    notify({
                        variant: "error",
                        key: "auth:login:failed",
                        message: "Invalid email or password (retry)",
                    })
                }
                type="button"
            >
                Trigger dedupe second
            </button>
        </>
    );
};

const InvalidConsumer = () => {
    useAppNotification();
    return null;
};

describe("notification-provider", () => {
    it("throws when hook is used outside provider", () => {
        expect(() => render(<InvalidConsumer />)).toThrow(
            "useAppNotification must be used within AppNotificationProvider",
        );
    });

    it("renders a real notification with mapped icon through provider", async () => {
        const user = userEvent.setup();

        render(
            <AppNotificationProvider>
                <TestTrigger />
            </AppNotificationProvider>,
        );

        await user.click(screen.getByRole("button", { name: "Trigger success" }));

        await waitFor(() => {
            expect(screen.getByText("Saved")).toBeInTheDocument();
            expect(screen.getByText("Settings were saved.")).toBeInTheDocument();
        });

        expect(screen.getByLabelText("check-circle")).toBeInTheDocument();
    });

    it("applies variant classes to rendered notifications", async () => {
        const user = userEvent.setup();

        render(
            <AppNotificationProvider>
                <TestTrigger />
            </AppNotificationProvider>,
        );

        await user.click(screen.getByRole("button", { name: "Trigger success" }));
        const successNotice = await waitFor(() => {
            const node = screen.getByText("Saved").closest(".ant-notification-notice");
            expect(node).not.toBeNull();
            return node as HTMLElement;
        });
        expect(successNotice).toHaveClass(styles.success);

        await user.click(screen.getByRole("button", { name: "Trigger error" }));
        const errorNotice = await waitFor(() => {
            const node = screen.getByText("Failed").closest(".ant-notification-notice");
            expect(node).not.toBeNull();
            return node as HTMLElement;
        });
        expect(errorNotice).toHaveClass(styles.error);

        await user.click(screen.getByRole("button", { name: "Trigger info" }));
        const infoNotice = await waitFor(() => {
            const node = screen.getByText("Information").closest(".ant-notification-notice");
            expect(node).not.toBeNull();
            return node as HTMLElement;
        });
        expect(infoNotice).toHaveClass(styles.info);

        await user.click(screen.getByRole("button", { name: "Trigger warning" }));
        const warningNotice = await waitFor(() => {
            const node = screen.getByText("Warning").closest(".ant-notification-notice");
            expect(node).not.toBeNull();
            return node as HTMLElement;
        });
        expect(warningNotice).toHaveClass(styles.warning);
    });

    it("dedupes notifications with the same key", async () => {
        const user = userEvent.setup();

        render(
            <AppNotificationProvider>
                <TestTrigger />
            </AppNotificationProvider>,
        );

        await user.click(screen.getByRole("button", { name: "Trigger dedupe first" }));
        expect(await screen.findByText("Invalid email or password")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Trigger dedupe second" }));
        expect(await screen.findByText("Invalid email or password (retry)")).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.queryByText("Invalid email or password")).not.toBeInTheDocument();
        });
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
