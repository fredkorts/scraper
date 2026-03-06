import { createContext } from "react";
import type { AppNotificationContextValue } from "./types/notification.types";

export const AppNotificationContext = createContext<AppNotificationContextValue | null>(null);
