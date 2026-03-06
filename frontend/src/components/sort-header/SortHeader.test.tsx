import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SortHeader } from "./SortHeader";

describe("SortHeader", () => {
    it("renders label and calls toggle on click", async () => {
        const user = userEvent.setup();
        const onToggle = vi.fn();

        render(<SortHeader label="Started" isActive={false} order="desc" onToggle={onToggle} />);

        await user.click(screen.getByRole("button", { name: "Sort by Started" }));
        expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it("reports active direction in accessible label", () => {
        render(<SortHeader label="Status" isActive={true} order="asc" onToggle={() => undefined} />);

        expect(screen.getByRole("button", { name: "Sort by Status, currently ascending" })).toBeInTheDocument();
    });
});
