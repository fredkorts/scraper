import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AppThemeSwitch } from "./AppThemeSwitch";

describe("AppThemeSwitch", () => {
    it("renders unchecked by default and shows the sun icon state", () => {
        render(<AppThemeSwitch isDarkMode={false} onToggle={() => undefined} />);

        const toggle = screen.getByRole("switch", { name: "Toggle dark mode" });
        expect(toggle).toHaveAttribute("aria-checked", "false");
    });

    it("renders checked when dark mode is active", () => {
        render(<AppThemeSwitch isDarkMode onToggle={() => undefined} />);

        const toggle = screen.getByRole("switch", { name: "Toggle dark mode" });
        expect(toggle).toHaveAttribute("aria-checked", "true");
    });

    it("calls onToggle with next checked state", async () => {
        const user = userEvent.setup();
        const onToggle = vi.fn();

        render(<AppThemeSwitch isDarkMode={false} onToggle={onToggle} />);

        await user.click(screen.getByRole("switch", { name: "Toggle dark mode" }));

        expect(onToggle).toHaveBeenCalledWith(true);
    });
});
