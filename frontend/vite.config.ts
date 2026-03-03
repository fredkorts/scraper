import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (!id.includes("node_modules")) {
                        return undefined;
                    }

                    if (
                        id.includes("/node_modules/recharts/") ||
                        id.includes("/node_modules/victory-vendor/")
                    ) {
                        return "chart-vendor";
                    }

                    if (id.includes("/node_modules/@tanstack/")) {
                        return "tanstack-vendor";
                    }

                    if (
                        id.includes("/node_modules/react/") ||
                        id.includes("/node_modules/react-dom/") ||
                        id.includes("/node_modules/scheduler/")
                    ) {
                        return "react-vendor";
                    }

                    return "vendor";
                },
            },
        },
    },
    test: {
        environment: "jsdom",
        globals: true,
        setupFiles: "./src/test/setup.ts",
        css: true,
    },
});
