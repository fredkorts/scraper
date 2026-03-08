import { prisma } from "../lib/prisma";
import { isMainModule } from "../lib/is-main-module";
import { logger } from "../lib/logger";
import { classifyPreorder } from "./preorder";

interface BackfillOptions {
    apply: boolean;
    batchSize: number;
}

const DEFAULT_BATCH_SIZE = 200;

const parseArgs = (argv: string[]): BackfillOptions => {
    const args = new Set(argv);
    const batchSizeArg = argv.find((arg) => arg.startsWith("--batch-size="));
    const parsedBatchSize = batchSizeArg ? Number(batchSizeArg.split("=")[1]) : DEFAULT_BATCH_SIZE;

    return {
        apply: args.has("--apply"),
        batchSize:
            Number.isFinite(parsedBatchSize) && parsedBatchSize > 0 ? Math.floor(parsedBatchSize) : DEFAULT_BATCH_SIZE,
    };
};

const dateOnly = (value: Date | null): string | null => (value ? value.toISOString().slice(0, 10) : null);

const classifyFromKnownCategories = (name: string, categorySlugs: string[]) => {
    const base = classifyPreorder({ name }, "");
    if (base.isPreorder) {
        return base;
    }

    for (const slug of categorySlugs) {
        const classification = classifyPreorder({ name }, slug);
        if (classification.isPreorder) {
            return classification;
        }
    }

    return base;
};

const runBackfill = async (options: BackfillOptions) => {
    let cursorId: string | undefined;
    let scanned = 0;
    let changed = 0;
    let updated = 0;

    while (true) {
        const products = await prisma.product.findMany({
            take: options.batchSize,
            ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
            orderBy: { id: "asc" },
            select: {
                id: true,
                name: true,
                isPreorder: true,
                preorderEta: true,
                preorderDetectedFrom: true,
                productCategories: {
                    select: {
                        category: {
                            select: {
                                slug: true,
                            },
                        },
                    },
                },
            },
        });

        if (products.length === 0) {
            break;
        }

        cursorId = products[products.length - 1]?.id;

        for (const product of products) {
            scanned += 1;
            const categorySlugs = product.productCategories.map((entry) => entry.category.slug);
            const next = classifyFromKnownCategories(product.name, categorySlugs);
            const isChanged =
                product.isPreorder !== next.isPreorder ||
                dateOnly(product.preorderEta) !== dateOnly(next.preorderEta) ||
                product.preorderDetectedFrom !== next.preorderDetectedFrom;

            if (isChanged) {
                changed += 1;
            }

            if (!options.apply) {
                continue;
            }

            await prisma.product.update({
                where: { id: product.id },
                data: {
                    isPreorder: next.isPreorder,
                    preorderEta: next.preorderEta,
                    preorderDetectedFrom: next.preorderDetectedFrom,
                    preorderLastCheckedAt: new Date(),
                },
            });

            updated += 1;
        }
    }

    return {
        mode: options.apply ? "apply" : "dry-run",
        batchSize: options.batchSize,
        scanned,
        changed,
        updated,
    };
};

const main = async () => {
    const options = parseArgs(process.argv.slice(2));
    const summary = await runBackfill(options);
    logger.info("preorder_backfill_completed", summary);
};

if (isMainModule(import.meta.url)) {
    main()
        .catch((error) => {
            logger.error("preorder_backfill_failed", { error });
            process.exitCode = 1;
        })
        .finally(async () => {
            await prisma.$disconnect();
        });
}
