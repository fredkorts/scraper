import { PrismaClient } from "@prisma/client";
import { DEFAULT_SCRAPE_INTERVAL, MABRIK_CATEGORIES } from "@mabrik/shared";

const prisma = new PrismaClient();

const getParentSlug = (slug: string): string | null => {
    if (!slug.includes("/")) {
        return null;
    }

    return slug.split("/").slice(0, -1).join("/");
};

const main = async () => {
    const categoryIdsBySlug = new Map<string, string>();

    for (const category of MABRIK_CATEGORIES) {
        const record = await prisma.category.upsert({
            where: { slug: category.slug },
            update: {
                nameEt: category.nameEt,
                nameEn: category.nameEn,
                isActive: true,
                scrapeIntervalHours: DEFAULT_SCRAPE_INTERVAL,
                nextRunAt: null,
            },
            create: {
                slug: category.slug,
                nameEt: category.nameEt,
                nameEn: category.nameEn,
                isActive: true,
                scrapeIntervalHours: DEFAULT_SCRAPE_INTERVAL,
                nextRunAt: null,
            },
        });

        categoryIdsBySlug.set(category.slug, record.id);
    }

    for (const category of MABRIK_CATEGORIES) {
        const parentSlug = getParentSlug(category.slug);

        await prisma.category.update({
            where: { slug: category.slug },
            data: {
                parentId: parentSlug ? categoryIdsBySlug.get(parentSlug) ?? null : null,
            },
        });
    }
};

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (error) => {
        console.error("Category seed failed:", error);
        await prisma.$disconnect();
        process.exit(1);
    });
