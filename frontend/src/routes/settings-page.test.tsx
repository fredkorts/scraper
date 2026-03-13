import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderRouterApp, mockUser } from "../test/router-utils";

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

const selectAntOption = async (user: ReturnType<typeof userEvent.setup>, label: string, optionText: string) => {
    await user.click(screen.getByLabelText(label));
    const titleMatch = await screen.findByTitle(optionText).catch(() => null);

    if (titleMatch) {
        await user.click(titleMatch);
        return;
    }

    const optionMatch = await screen.findByRole("option", { name: optionText }).catch(() => null);
    const treeItemMatch = optionMatch ?? (await screen.findByRole("treeitem", { name: optionText }).catch(() => null));

    if (treeItemMatch) {
        await user.click(treeItemMatch);
        return;
    }

    const textMatches = await screen.findAllByText(optionText);
    await user.click(textMatches[textMatches.length - 1]!);
};

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

        expect(await screen.findByDisplayValue("Updated User")).toBeInTheDocument();
        expect(await screen.findByText("Profile updated")).toBeInTheDocument();
    }, 20_000);

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
        await selectAntOption(user, "Available categories", "Lauamangud");
        await user.click(screen.getByRole("button", { name: "Track category" }));
        await waitFor(() => {
            expect(screen.getAllByText("Lauamangud").length).toBeGreaterThan(0);
        });

        await user.click(screen.getAllByRole("button", { name: "Stop tracking" })[0]);
        await waitFor(() => {
            expect(screen.getByText("lauamangud")).toBeInTheDocument();
        });
    }, 25_000);

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
        expect(screen.getByRole("heading", { name: "Category Schedule State" })).toBeInTheDocument();
        expect(screen.getAllByRole("button", { name: /edit interval for/i }).length).toBeGreaterThan(0);
        await user.type(screen.getByLabelText("Search scheduler categories"), "queued");
        expect(screen.getByText("Queued")).toBeInTheDocument();
        await selectAntOption(user, "Scheduler category filter", "Strateegia");
        await user.clear(screen.getByLabelText("Search scheduler categories"));
        await user.type(screen.getByLabelText("Search scheduler categories"), "idle");
        expect(screen.getByText("No scheduler categories matched the current filters.")).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: /save interval/i }));

        const manualTriggerSection = screen.getByRole("heading", { name: "Manual scrape trigger" }).closest("article");
        expect(manualTriggerSection).not.toBeNull();
        await user.click(within(manualTriggerSection!).getByRole("button", { name: /scrape now/i }));
        expect(await screen.findByText(/Queued job/i)).toBeInTheDocument();

        await user.click(screen.getByRole("tab", { name: "Notifications" }));
        await user.type(screen.getByLabelText("Email"), "new@example.com");
        await user.click(screen.getByRole("button", { name: "Add channel" }));
        await waitFor(() => {
            expect(screen.getByText("new@example.com")).toBeInTheDocument();
        });
    }, 15_000);

    it("falls back to account tab for non-admin users when URL requests admin tab", async () => {
        await renderRouterApp({
            initialEntry: "/app/settings?tab=admin",
            session: {
                ...mockUser,
                role: "paid",
            },
            apiResponses: {
                subscriptions: {
                    items: [],
                    limit: 6,
                    used: 0,
                    remaining: 6,
                },
            },
        });

        expect(await screen.findByRole("tab", { name: "Account" })).toHaveAttribute("aria-selected", "true");
        expect(screen.queryByRole("tab", { name: "Admin" })).not.toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Account Basics" })).toBeInTheDocument();
    });
});
