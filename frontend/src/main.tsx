import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import "antd/dist/reset.css";
import { queryClient, router } from "./app/bootstrap";
import { AppThemeProvider } from "./app/theme-provider";
import { bootstrapThemeBeforeRender } from "./app/theme/theme-preference";
import { AppNotificationProvider } from "./shared/notifications/notification-provider";
import "./styles/main.scss";

bootstrapThemeBeforeRender();

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <AppThemeProvider>
                <AppNotificationProvider>
                    <RouterProvider router={router} />
                </AppNotificationProvider>
            </AppThemeProvider>
        </QueryClientProvider>
    </StrictMode>,
);
