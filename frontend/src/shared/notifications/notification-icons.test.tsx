import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getNotificationIcon } from "./notification-icons";

describe("notification-icons", () => {
    it("returns a mapped icon element for each variant", () => {
        const { rerender } = render(getNotificationIcon("success"));
        expect(screen.getByRole("img", { hidden: true })).toBeInTheDocument();

        rerender(getNotificationIcon("error"));
        expect(screen.getByRole("img", { hidden: true })).toBeInTheDocument();

        rerender(getNotificationIcon("info"));
        expect(screen.getByRole("img", { hidden: true })).toBeInTheDocument();

        rerender(getNotificationIcon("warning"));
        expect(screen.getByRole("img", { hidden: true })).toBeInTheDocument();
    });
});
