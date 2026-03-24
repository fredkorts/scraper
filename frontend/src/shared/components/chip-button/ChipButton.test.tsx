import { render, screen } from "@testing-library/react";
import { ChipButton } from "./ChipButton";

describe("ChipButton", () => {
    it("renders as a secondary app button by default", () => {
        render(<ChipButton>Remove filter</ChipButton>);

        const button = screen.getByRole("button", { name: "Remove filter" });
        expect(button).toHaveAttribute("data-intent", "secondary");
        expect(button).toHaveAttribute("type", "button");
    });

    it("maps the small chip size to the Ant small button size", () => {
        render(<ChipButton size="small">Small chip</ChipButton>);

        expect(screen.getByRole("button", { name: "Small chip" })).toHaveClass("ant-btn-sm");
    });

    it("keeps medium as the default chip size", () => {
        render(<ChipButton>Medium chip</ChipButton>);

        expect(screen.getByRole("button", { name: "Medium chip" })).not.toHaveClass("ant-btn-sm");
    });
});
