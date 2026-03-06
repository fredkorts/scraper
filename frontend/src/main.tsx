import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import "antd/dist/reset.css";
import { queryClient, router } from "./app/bootstrap";
import { AppNotificationProvider } from "./shared/notifications/notification-provider";
import "./styles/main.scss";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <AppNotificationProvider>
                <RouterProvider router={router} />
            </AppNotificationProvider>
        </QueryClientProvider>
    </StrictMode>,
);
