import { render, screen } from "@testing-library/react";
import { AppButton } from "./AppButton";

describe("AppButton", () => {
    it("applies mapped intent variants", () => {
        render(
            <>
                <AppButton intent="primary">Primary</AppButton>
                <AppButton intent="success">Success</AppButton>
                <AppButton intent="warning">Warning</AppButton>
                <AppButton intent="danger">Danger</AppButton>
            </>,
        );

        expect(screen.getByRole("button", { name: "Primary" })).toHaveClass("ant-btn-primary");
        expect(screen.getByRole("button", { name: "Success" })).toHaveClass("ant-btn-default");
        expect(screen.getByRole("button", { name: "Warning" })).toHaveClass("ant-btn-default");
        expect(screen.getByRole("button", { name: "Danger" })).toHaveClass("ant-btn-primary", "ant-btn-dangerous");
    });

    it("supports icon pass-through", () => {
        render(<AppButton icon={<span data-testid="icon">+</span>}>Track</AppButton>);

        expect(screen.getByTestId("icon")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Track/ })).toBeInTheDocument();
    });

    it("uses unified loading behavior and disables while loading", () => {
        render(<AppButton isLoading>Saving</AppButton>);

        const button = screen.getByRole("button", { name: /Saving/ });
        expect(button).toBeDisabled();
        expect(button).toHaveAttribute("aria-busy", "true");
    });
});
