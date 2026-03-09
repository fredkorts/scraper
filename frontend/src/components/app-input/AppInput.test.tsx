import { fireEvent, render, screen } from "@testing-library/react";
import { AppInput } from "./AppInput";

describe("AppInput", () => {
    it("renders with a provided value", () => {
        render(<AppInput ariaLabel="Email" value="user@example.com" readOnly />);

        expect(screen.getByLabelText("Email")).toHaveValue("user@example.com");
    });

    it("forwards onChange", () => {
        const handleChange = vi.fn();

        render(<AppInput ariaLabel="Name" onChange={handleChange} />);

        fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Fred" } });

        expect(handleChange).toHaveBeenCalled();
    });
});
