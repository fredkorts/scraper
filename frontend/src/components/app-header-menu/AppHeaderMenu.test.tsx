import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppHeaderMenu } from "./AppHeaderMenu";

const navigateMock = vi.fn();

vi.mock("@tanstack/react-router", () => ({
    useNavigate: () => navigateMock,
}));

beforeEach(() => {
    navigateMock.mockReset();
});

describe("AppHeaderMenu", () => {
    it("renders a menu trigger and opens the menu", async () => {
        const user = userEvent.setup();

        render(
            <AppHeaderMenu
                isDarkMode={false}
                onToggleTheme={() => undefined}
                onLogout={() => undefined}
                userName="Example User"
            />,
        );

        const trigger = screen.getByRole("button", { name: "Open account menu" });
        expect(trigger).toBeInTheDocument();

        await user.click(trigger);
        expect(await screen.findByRole("menu")).toBeInTheDocument();
        expect(screen.getByRole("menuitem", { name: "Settings" })).toBeInTheDocument();
    });

    it("navigates to settings from a single menu-item action", async () => {
        const user = userEvent.setup();

        render(
            <AppHeaderMenu
                isDarkMode={false}
                onToggleTheme={() => undefined}
                onLogout={() => undefined}
                userName="Example User"
            />,
        );

        await user.click(screen.getByRole("button", { name: "Open account menu" }));
        await user.click(screen.getByRole("menuitem", { name: "Settings" }));

        expect(navigateMock).toHaveBeenCalledWith({
            to: "/app/settings",
            search: { tab: "account" },
        });
    });

    it("invokes toggle theme action from menu item", async () => {
        const user = userEvent.setup();
        const onToggleTheme = vi.fn();

        render(
            <AppHeaderMenu
                isDarkMode={false}
                onToggleTheme={onToggleTheme}
                onLogout={() => undefined}
                userName="Example User"
            />,
        );

        const trigger = screen.getByRole("button", { name: "Open account menu" });
        await user.click(trigger);
        await user.click(screen.getByRole("menuitem", { name: "Toggle theme (currently Light)" }));

        expect(onToggleTheme).toHaveBeenCalledTimes(1);
        expect(trigger).toHaveAttribute("aria-expanded", "false");
    });

    it("invokes logout action from menu item", async () => {
        const user = userEvent.setup();
        const onLogout = vi.fn();

        render(
            <AppHeaderMenu
                isDarkMode={false}
                onToggleTheme={() => undefined}
                onLogout={onLogout}
                userName="Example User"
            />,
        );

        await user.click(screen.getByRole("button", { name: "Open account menu" }));
        await user.click(screen.getByRole("menuitem", { name: "Log out" }));

        expect(onLogout).toHaveBeenCalledTimes(1);
    });

    it("disables logout item while a logout is pending", async () => {
        const user = userEvent.setup();
        const onLogout = vi.fn();

        render(
            <AppHeaderMenu
                isDarkMode={true}
                isLogoutPending
                onToggleTheme={() => undefined}
                onLogout={onLogout}
                userName="Example User"
            />,
        );

        await user.click(screen.getByRole("button", { name: "Open account menu" }));

        const logoutItem = await screen.findByRole("menuitem", { name: "Signing out..." });
        expect(logoutItem).toHaveAttribute("aria-disabled", "true");

        await user.click(logoutItem);
        expect(onLogout).not.toHaveBeenCalled();
    });
});
