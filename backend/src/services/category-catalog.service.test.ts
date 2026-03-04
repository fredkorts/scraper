import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { prisma } from "../lib/prisma";
import { http } from "../lib/http";
import { useTestDatabase } from "../test/db";
import { parseCategoryCatalog, refreshCategoryCatalog } from "./category-catalog.service";

const fixture = readFileSync(join(import.meta.dirname, "__fixtures__", "category-catalog.html"), "utf8");

useTestDatabase();

describe("category catalog service", () => {
    it("parses a nested category catalog from navigation HTML", () => {
        const categories = parseCategoryCatalog(fixture);

        expect(categories.map((category) => category.slug)).toEqual([
            "lauamangud",
            "lauamangud/strateegia",
            "lauamangud/seltskond",
            "lauamangud/pusled",
            "miniatuurid",
            "miniatuurid/warhammer-40k",
            "miniatuurid/warhammer-40k/space-marines",
        ]);

        expect(categories.find((category) => category.slug === "lauamangud/strateegia")).toMatchObject({
            parentSlug: "lauamangud",
            depth: 1,
            nameEt: "Strateegia",
        });
        expect(categories.find((category) => category.slug === "miniatuurid/warhammer-40k/space-marines")).toMatchObject(
            {
                parentSlug: "miniatuurid/warhammer-40k",
                depth: 2,
                nameEt: "Space Marines",
            },
        );
    });

    it("supports dry-run refresh without mutating the database", async () => {
        vi.spyOn(http, "get").mockResolvedValue({
            data: fixture,
        } as Awaited<ReturnType<typeof http.get<string>>>);

        const summary = await refreshCategoryCatalog();
        const count = await prisma.category.count();

        expect(summary.applied).toBe(false);
        expect(summary.discoveredCount).toBe(7);
        expect(summary.createdCount).toBe(7);
        expect(count).toBe(0);
    });

    it("applies refresh and deactivates categories missing from the discovered catalog", async () => {
        vi.spyOn(http, "get").mockResolvedValue({
            data: fixture,
        } as Awaited<ReturnType<typeof http.get<string>>>);

        await prisma.category.create({
            data: {
                slug: "obsolete-category",
                nameEt: "Obsolete",
                nameEn: "Obsolete",
            },
        });

        const summary = await refreshCategoryCatalog({ apply: true, maxDeactivateRatio: 1 });
        const activeCategories = await prisma.category.findMany({
            where: { isActive: true },
            orderBy: { slug: "asc" },
        });
        const obsoleteCategory = await prisma.category.findUnique({
            where: { slug: "obsolete-category" },
        });

        expect(summary.applied).toBe(true);
        expect(summary.discoveredCount).toBe(7);
        expect(summary.deactivatedCount).toBe(1);
        expect(summary.deactivatedSlugs).toEqual(["obsolete-category"]);
        expect(activeCategories.map((category) => category.slug)).toEqual([
            "lauamangud",
            "lauamangud/pusled",
            "lauamangud/seltskond",
            "lauamangud/strateegia",
            "miniatuurid",
            "miniatuurid/warhammer-40k",
            "miniatuurid/warhammer-40k/space-marines",
        ]);
        expect(obsoleteCategory?.isActive).toBe(false);
    });
});
