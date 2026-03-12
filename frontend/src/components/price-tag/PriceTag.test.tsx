import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { formatPrice } from "../../shared/formatters/display";
import { PriceTag } from "./PriceTag";

describe("PriceTag", () => {
    it("renders only the new product price for new_product", () => {
        render(<PriceTag variant="new_product" price={9.5} />);

        expect(screen.getByLabelText(/New product price/)).toBeInTheDocument();
        expect(screen.getByText(formatPrice(9.5))).toBeInTheDocument();
        expect(screen.queryByText(/^[+-]/)).not.toBeInTheDocument();
    });

    it("renders old-to-new and positive delta for price increases", () => {
        render(<PriceTag variant="price_increase" oldPrice={9.5} newPrice={11.2} />);

        expect(screen.getByLabelText(/Price increased from/)).toBeInTheDocument();
        expect(screen.getByText(formatPrice(9.5)).tagName).toBe("S");
        expect(screen.getByText(formatPrice(11.2))).toBeInTheDocument();
        expect(screen.getByText(`+${formatPrice(1.7)}`)).toBeInTheDocument();
        expect(screen.getByText("→")).toBeInTheDocument();
    });

    it("renders old-to-new and negative delta for price decreases", () => {
        render(<PriceTag variant="price_decrease" oldPrice={24.99} newPrice={19.99} />);

        expect(screen.getByLabelText(/Price decreased from/)).toBeInTheDocument();
        expect(screen.getByText(formatPrice(24.99)).tagName).toBe("S");
        expect(screen.getByText(formatPrice(19.99))).toBeInTheDocument();
        expect(screen.getByText(`-${formatPrice(5)}`)).toBeInTheDocument();
    });

    it("gracefully handles missing values", () => {
        render(<PriceTag variant="price_increase" newPrice={12} />);

        expect(screen.getByLabelText(/Price increased from - to/)).toBeInTheDocument();
        expect(screen.getByLabelText(/Difference -\./)).toBeInTheDocument();
    });
});
