import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderRouterApp, mockUser } from "../test/router-utils";

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe("settings page", () => {
    it("renders account summary and updates the profile name", async () => {
        const user = userEvent.setup();

        await renderRouterApp({
            initialEntry: "/app/settings?tab=account",
            session: mockUser,
            apiResponses: {
                subscriptions: {
                    items: [],
                    limit: 3,
                    used: 0,
                    remaining: 3,
                },
            },
        });

        expect(await screen.findByRole("heading", { name: "Settings" })).toBeInTheDocument();
        const input = screen.getByLabelText("Name");
        await user.clear(input);
        await user.type(input, "Updated User");
        await user.click(screen.getByRole("button", { name: "Save changes" }));

        await waitFor(() => {
            expect(screen.getByDisplayValue("Updated User")).toBeInTheDocument();
        });
    });

    it("adds and removes tracked categories in the tracking tab", async () => {
        const user = userEvent.setup();

        await renderRouterApp({
            initialEntry: "/app/settings?tab=tracking",
            session: mockUser,
            apiResponses: {
                subscriptions: {
                    items: [
                        {
                            id: "33333333-3333-4333-8333-444444444444",
                            category: {
                                id: "33333333-3333-4333-8333-333333333333",
                                slug: "lauamangud/strateegia",
                                nameEt: "Strateegia",
                                nameEn: "Strategy",
                            },
                            createdAt: new Date().toISOString(),
                            isActive: true,
                        },
                    ],
                    limit: 3,
                    used: 1,
                    remaining: 2,
                },
            },
        });

        expect(await screen.findByRole("heading", { name: "Settings" })).toBeInTheDocument();
        expect(screen.getByText("Lauamangud / Strateegia")).toBeInTheDocument();
        expect(screen.getByRole("option", { name: "Lauamangud" })).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Track category" }));
        await waitFor(() => {
            expect(screen.getAllByText("Lauamangud").length).toBeGreaterThan(0);
        });

        await user.click(screen.getAllByRole("button", { name: "Stop tracking" })[0]);
        await waitFor(() => {
            expect(screen.getByText("lauamangud")).toBeInTheDocument();
        });
    });

    it("manages notification channels and admin tools for admin users", async () => {
        const user = userEvent.setup();

        await renderRouterApp({
            initialEntry: "/app/settings?tab=admin",
            session: {
                ...mockUser,
                role: "admin",
            },
            apiResponses: {
                subscriptions: {
                    items: [],
                    limit: null,
                    used: 0,
                    remaining: null,
                },
                notificationChannels: {
                    channels: [
                        {
                            id: "99999999-9999-4999-8999-999999999998",
                            userId: mockUser.id,
                            channelType: "email",
                            destination: "admin@example.com",
                            isDefault: true,
                            isActive: true,
                            createdAt: new Date().toISOString(),
                        },
                    ],
                },
            },
        });

        expect(await screen.findByRole("tab", { name: "Admin" })).toHaveAttribute("aria-selected", "true");
        await user.click(screen.getByRole("button", { name: "Save interval" }));
        await user.click(screen.getByRole("button", { name: "Scrape now" }));
        expect(await screen.findByText(/Queued job/i)).toBeInTheDocument();

        await user.click(screen.getByRole("tab", { name: "Notifications" }));
        await user.type(screen.getByLabelText("Email"), "new@example.com");
        await user.click(screen.getByRole("button", { name: "Add channel" }));
        await waitFor(() => {
            expect(screen.getByText("new@example.com")).toBeInTheDocument();
        });
    });
});
