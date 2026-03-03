import { createAppRouter } from "./router";
import { ensureSession } from "../features/auth/queries";
import { createAppQueryClient } from "../lib/query/query-client";

export const queryClient = createAppQueryClient();

export const router = createAppRouter({
    queryClient,
    ensureSession: () => ensureSession(queryClient),
});

declare module "@tanstack/react-router" {
    interface Register {
        router: typeof router;
    }
}
