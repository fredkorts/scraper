import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChangeIcon, type ChangeIconVariant } from "./ChangeIcon";

const iconNameByVariant: Record<ChangeIconVariant, string> = {
    price_decrease: "arrow-down",
    price_increase: "arrow-up",
    new_product: "plus-circle",
    sold_out: "stop",
    back_in_stock: "check-circle",
};

describe("ChangeIcon", () => {
    it.each(Object.entries(iconNameByVariant))("renders the expected icon for %s", (variant, iconName) => {
        const { container } = render(<ChangeIcon variant={variant as ChangeIconVariant} />);
        const iconWrapper = screen.getByRole("img", { hidden: true });
        const iconSvg = container.querySelector(`svg[data-icon="${iconName}"]`);

        expect(iconWrapper).toHaveAttribute("aria-hidden", "true");
        expect(iconSvg).toBeInTheDocument();
    });
});
