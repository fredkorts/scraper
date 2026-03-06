import { describe, expect, it } from "vitest";
import {
    buildCategoryOptions,
    buildCategoryTreeData,
    getCategoryDisplayLabel,
    getCategoryLabelById,
} from "./options";

const categories = [
    {
        id: "22222222-2222-4222-8222-222222222222",
        slug: "lauamangud",
        nameEt: "Lauamangud",
        nameEn: "Board Games",
        depth: 0,
        pathNameEt: "Lauamangud",
        pathNameEn: "Board Games",
        isActive: true,
        scrapeIntervalHours: 12 as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: "33333333-3333-4333-8333-333333333333",
        slug: "lauamangud/strateegia",
        nameEt: "Strateegia",
        nameEn: "Strategy",
        parentId: "22222222-2222-4222-8222-222222222222",
        depth: 1,
        pathNameEt: "Lauamangud / Strateegia",
        pathNameEn: "Board Games / Strategy",
        isActive: true,
        scrapeIntervalHours: 12 as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
];

describe("category option helpers", () => {
    it("uses hierarchy-aware labels for category options", () => {
        expect(buildCategoryOptions(categories)).toEqual([
            {
                id: "22222222-2222-4222-8222-222222222222",
                label: "Lauamangud",
                slug: "lauamangud",
                depth: 0,
            },
            {
                id: "33333333-3333-4333-8333-333333333333",
                label: "-- Strateegia",
                slug: "lauamangud/strateegia",
                depth: 1,
            },
        ]);
    });

    it("returns the category display label and resolves labels by id", () => {
        expect(getCategoryDisplayLabel(categories[1])).toBe("Lauamangud / Strateegia");
        expect(getCategoryLabelById(categories, categories[1].id)).toBe("Lauamangud / Strateegia");
    });

    it("builds tree data for category selectors", () => {
        expect(buildCategoryTreeData(categories)).toEqual([
            {
                key: "22222222-2222-4222-8222-222222222222",
                value: "22222222-2222-4222-8222-222222222222",
                title: "Lauamangud",
                disabled: false,
                selectable: true,
                children: [
                    {
                        key: "33333333-3333-4333-8333-333333333333",
                        value: "33333333-3333-4333-8333-333333333333",
                        title: "Strateegia",
                        disabled: false,
                        selectable: true,
                        children: [],
                    },
                ],
            },
        ]);
    });

    it("includes ancestors while disabling non-selectable nodes when filtering tree data", () => {
        expect(
            buildCategoryTreeData(categories, {
                includeCategoryIds: new Set(["33333333-3333-4333-8333-333333333333"]),
            }),
        ).toEqual([
            {
                key: "22222222-2222-4222-8222-222222222222",
                value: "22222222-2222-4222-8222-222222222222",
                title: "Lauamangud",
                disabled: true,
                selectable: false,
                children: [
                    {
                        key: "33333333-3333-4333-8333-333333333333",
                        value: "33333333-3333-4333-8333-333333333333",
                        title: "Strateegia",
                        disabled: false,
                        selectable: true,
                        children: [],
                    },
                ],
            },
        ]);
    });
});
