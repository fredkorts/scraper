import { pathToFileURL } from "node:url";

export const isMainModule = (metaUrl: string): boolean => {
    const entrypoint = process.argv[1];

    if (!entrypoint) {
        return false;
    }

    return metaUrl === pathToFileURL(entrypoint).href;
};
