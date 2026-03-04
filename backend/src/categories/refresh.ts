import { prisma } from "../lib/prisma";
import { isMainModule } from "../lib/is-main-module";
import { logger } from "../lib/logger";
import { refreshCategoryCatalog } from "../services/category-catalog.service";

const parseArgs = (argv: string[]) => {
    const args = new Set(argv);
    const ratioArg = argv.find((arg) => arg.startsWith("--max-deactivate-ratio="));

    return {
        apply: args.has("--apply"),
        maxDeactivateRatio: ratioArg ? Number(ratioArg.split("=")[1]) : undefined,
    };
};

const main = async () => {
    const options = parseArgs(process.argv.slice(2));
    const summary = await refreshCategoryCatalog(options);

    logger.info("categories_refresh_completed", {
        mode: summary.applied ? "apply" : "dry-run",
        ...summary,
    });
};

if (isMainModule(import.meta.url)) {
    main()
        .catch((error) => {
            logger.error("categories_refresh_failed", {
                error,
            });
            process.exitCode = 1;
        })
        .finally(async () => {
            await prisma.$disconnect();
        });
}
