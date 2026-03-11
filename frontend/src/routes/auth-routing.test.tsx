import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "../lib/api/errors";
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
        const user = userEvent.setup();
        await renderRouterApp({ initialEntry: "/app", session: mockUser });

        expect(screen.queryByRole("navigation", { name: "Main" })).not.toBeInTheDocument();
        expect(screen.getAllByRole("main")).toHaveLength(1);

        const logoLink = await screen.findByRole("link", { name: "PricePulse" });
        expect(logoLink).toHaveAttribute("href", "/app");
        expect(screen.getByRole("button", { name: "Open product search" })).toBeInTheDocument();

        const menuTrigger = screen.getByRole("button", { name: "Open account menu" });
        await user.click(menuTrigger);

        expect(await screen.findByRole("menuitem", { name: "Settings" })).toBeInTheDocument();
        expect(screen.getByRole("menuitem", { name: "Toggle theme (currently Light)" })).toBeInTheDocument();
        expect(screen.getByRole("menuitem", { name: "Log out" })).toBeInTheDocument();
    }, 10_000);

    it("supports keyboard focus navigation on login form", async () => {
        const user = userEvent.setup();
        await renderRouterApp({ initialEntry: "/login", session: null });

        await user.tab();
        expect(screen.getByLabelText("Email")).toHaveFocus();

        await user.tab();
        expect(screen.getByLabelText("Password")).toHaveFocus();
    });

    it("associates login validation errors with fields", async () => {
        const user = userEvent.setup();
        await renderRouterApp({ initialEntry: "/login", session: null });

        await user.click(screen.getByRole("button", { name: "Sign in" }));

        const emailInput = screen.getByLabelText("Email");
        const passwordInput = screen.getByLabelText("Password");

        expect(emailInput).toHaveAttribute("aria-invalid", "true");
        expect(emailInput).toHaveAttribute("aria-describedby", "login-email-error");
        expect(passwordInput).toHaveAttribute("aria-invalid", "true");
        expect(passwordInput).toHaveAttribute("aria-describedby", "login-password-error");
        expect(screen.getByText("Invalid email address")).toHaveAttribute("id", "login-email-error");
        expect(screen.getByText("Password is required")).toHaveAttribute("id", "login-password-error");
    });

    it("renders dedicated 404 page for unknown routes", async () => {
        await renderRouterApp({ initialEntry: "/this-route-does-not-exist", session: null });

        expect(await screen.findByRole("heading", { name: "Page not found" })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Go to landing page" })).toBeInTheDocument();
    });

    it("renders dedicated 403 page", async () => {
        await renderRouterApp({ initialEntry: "/forbidden", session: null });

        expect(await screen.findByRole("heading", { name: "Access denied" })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Back to dashboard" })).toBeInTheDocument();
    });

    it("routes auth bootstrap origin misconfiguration to dedicated configuration error page", async () => {
        await renderRouterApp({
            initialEntry: "/app",
            session: null,
            ensureSessionError: new ApiError({
                status: 403,
                code: "origin_not_allowed",
                message: "Origin is not allowed",
            }),
        });

        expect(await screen.findByRole("heading", { name: "Authentication configuration error" })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Back to sign in" })).toBeInTheDocument();
    });

    it("shows notification feedback when logout fails", async () => {
        const user = userEvent.setup();
        await renderRouterApp({ initialEntry: "/app", session: mockUser, logoutShouldFail: true });

        await user.click(await screen.findByRole("button", { name: "Open account menu" }));
        await user.click(await screen.findByRole("menuitem", { name: "Log out" }));

        await waitFor(() => {
            expect(screen.getByText("Sign out failed")).toBeInTheDocument();
        });
    });
});
