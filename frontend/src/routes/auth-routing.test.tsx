import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderRouterApp, mockUser } from "../test/router-utils";

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe("auth routing", () => {
    it("redirects unauthenticated users from /app to /login", async () => {
        await renderRouterApp({ initialEntry: "/app", session: null });

        await waitFor(() => {
            expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
        });
    });

    it("redirects authenticated users from /login to /app", async () => {
        await renderRouterApp({ initialEntry: "/login", session: mockUser });

        await waitFor(() => {
            expect(screen.getByRole("heading", { name: "Dashboard Home" })).toBeInTheDocument();
        });
    });

    it("renders register page for unauthenticated users", async () => {
        await renderRouterApp({ initialEntry: "/register", session: null });

        expect(await screen.findByRole("heading", { name: "Create account" })).toBeInTheDocument();
        expect(screen.getByLabelText("Email")).toBeInTheDocument();
        expect(screen.getByLabelText("Password")).toBeInTheDocument();
    });

    it("renders protected app shell with navigation for authenticated users", async () => {
        await renderRouterApp({ initialEntry: "/app", session: mockUser });

        expect(await screen.findByRole("navigation", { name: "Main" })).toBeInTheDocument();
        expect(screen.getByText("Example User")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Runs" })).toBeInTheDocument();
    });

    it("supports keyboard focus navigation on login form", async () => {
        const user = userEvent.setup();
        await renderRouterApp({ initialEntry: "/login", session: null });

        await user.tab();
        expect(screen.getByLabelText("Email")).toHaveFocus();

        await user.tab();
        expect(screen.getByLabelText("Password")).toHaveFocus();
    });

    it("shows notification feedback when logout fails", async () => {
        const user = userEvent.setup();
        await renderRouterApp({ initialEntry: "/app", session: mockUser, logoutShouldFail: true });

        await user.click(await screen.findByRole("button", { name: "Log out" }));

        await waitFor(() => {
            expect(screen.getByText("Sign out failed")).toBeInTheDocument();
        });
    });
});
