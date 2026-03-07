import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppTabs } from "./AppTabs";

describe("AppTabs", () => {
    it("renders labels and active tab", () => {
        const { container } = render(
            <AppTabs
                ariaLabel="Example tabs"
                activeKey="account"
                items={[
                    { key: "account", label: "Account" },
                    { key: "tracking", label: "Tracking" },
                ]}
                onChange={() => {}}
            />,
        );

        expect(screen.getByRole("tab", { name: "Account" })).toHaveAttribute("aria-selected", "true");
        expect(screen.getByRole("tab", { name: "Tracking" })).toHaveAttribute("aria-selected", "false");
        expect(container.querySelector(".ant-tabs")).toHaveAttribute("aria-label", "Example tabs");
    });

    it("emits selected key on click", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();

        render(
            <AppTabs
                activeKey="account"
                items={[
                    { key: "account", label: "Account" },
                    { key: "tracking", label: "Tracking" },
                ]}
                onChange={onChange}
            />,
        );

        await user.click(screen.getByRole("tab", { name: "Tracking" }));

        expect(onChange).toHaveBeenCalledWith("tracking");
    });

    it("does not emit for disabled tab", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();

        render(
            <AppTabs
                activeKey="account"
                items={[
                    { key: "account", label: "Account" },
                    { key: "admin", label: "Admin", disabled: true },
                ]}
                onChange={onChange}
            />,
        );

        const disabledTab = screen.getByRole("tab", { name: "Admin" });
        expect(disabledTab).toHaveAttribute("aria-disabled", "true");

        await user.click(disabledTab);

        expect(onChange).not.toHaveBeenCalled();
    });
});
