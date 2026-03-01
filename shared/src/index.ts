// ============================================================
// @mabrik/shared — Shared types, constants, and schemas
// ============================================================

// ----- Enums & Constants -----

export const SCRAPE_INTERVALS = [6, 12, 24, 48] as const;
export type ScrapeInterval = (typeof SCRAPE_INTERVALS)[number];

export const DEFAULT_SCRAPE_INTERVAL: ScrapeInterval = 12;

export enum ChangeType {
    PRICE_INCREASE = "price_increase",
    PRICE_DECREASE = "price_decrease",
    NEW_PRODUCT = "new_product",
    SOLD_OUT = "sold_out",
    BACK_IN_STOCK = "back_in_stock",
}

export enum ScrapeStatus {
    PENDING = "pending",
    RUNNING = "running",
    COMPLETED = "completed",
    FAILED = "failed",
}

export enum ChannelType {
    EMAIL = "email",
    DISCORD = "discord",
    WHATSAPP = "whatsapp",
    SIGNAL = "signal",
    SMS = "sms",
}

export type UserRole = "free" | "paid" | "admin";

// ----- Category Definitions -----

export interface CategoryDef {
    slug: string;
    nameEt: string;
    nameEn: string;
    productCount?: number;
}

export const MABRIK_CATEGORIES: CategoryDef[] = [
    { slug: "eeltellimused", nameEt: "Eeltellimused", nameEn: "Pre-orders" },
    { slug: "lauamangud", nameEt: "Lauamängud", nameEn: "Board Games", productCount: 1269 },
    { slug: "kodu-ja-kollektsioon", nameEt: "Kodu ja kollektsioon", nameEn: "Home & Collectibles", productCount: 992 },
    { slug: "funko", nameEt: "Funko tooted", nameEn: "Funko Products", productCount: 468 },
    { slug: "miniatuurid", nameEt: "Miniatuurimängud", nameEn: "Miniature Games", productCount: 497 },
    { slug: "riided-ja-aksessuaarid", nameEt: "Riided ja aksessuaarid", nameEn: "Clothing & Accessories", productCount: 237 },
    { slug: "varvid-ja-hobitooted", nameEt: "Värvid ja hobitooted", nameEn: "Paints & Hobby Supplies", productCount: 1071 },
    { slug: "rollimangud", nameEt: "Rollimängud", nameEn: "Role-Playing Games", productCount: 519 },
    { slug: "kaardimangud", nameEt: "Kaardimängud", nameEn: "Card Games", productCount: 511 },
    { slug: "raamatud-ja-koomiksid", nameEt: "Raamatud ja koomiksid", nameEn: "Books & Comics", productCount: 966 },
    { slug: "kodu-ja-kollektsioon/figuurid-ja-manguasjad", nameEt: "Figuurid ja mänguasjad", nameEn: "Figures & Toys", productCount: 410 },
    { slug: "lopumuuk", nameEt: "Lõpumüük", nameEn: "Clearance Sale", productCount: 876 },
];

// ----- API Request/Response Types -----

export interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    lastDigestSentAt?: string;
    paypalSubscriptionId?: string;
    subscriptionExpiresAt?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Category {
    id: string;
    slug: string;
    nameEt: string;
    nameEn: string;
    parentId?: string;
    isActive: boolean;
    scrapeIntervalHours: ScrapeInterval;
    nextRunAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface UserSubscription {
    id: string;
    userId: string;
    categoryId: string;
    isActive: boolean;
    createdAt: string;
}

export interface ScrapeRun {
    id: string;
    categoryId: string;
    status: ScrapeStatus;
    totalProducts: number;
    newProducts: number;
    priceChanges: number;
    soldOut: number;
    backInStock: number;
    pagesScraped: number;
    durationMs?: number;
    errorMessage?: string;
    startedAt: string;
    completedAt?: string;
}

export interface Product {
    id: string;
    externalUrl: string;
    name: string;
    imageUrl: string;
    currentPrice: number;
    originalPrice?: number;
    inStock: boolean;
    firstSeenAt: string;
    lastSeenAt: string;
    updatedAt: string;
    categories?: Category[];
}

export interface ProductCategory {
    id: string;
    productId: string;
    categoryId: string;
    createdAt: string;
}

export interface ProductSnapshot {
    id: string;
    scrapeRunId: string;
    productId: string;
    name: string;
    price: number;
    originalPrice?: number;
    inStock: boolean;
    imageUrl: string;
    scrapedAt: string;
}

export interface ChangeReport {
    id: string;
    scrapeRunId: string;
    totalChanges: number;
    createdAt: string;
}

export interface ChangeItem {
    id: string;
    changeReportId: string;
    productId: string;
    changeType: ChangeType;
    oldPrice?: number;
    newPrice?: number;
    oldStockStatus?: boolean;
    newStockStatus?: boolean;
    product?: Product;
}

export interface NotificationChannel {
    id: string;
    userId: string;
    channelType: ChannelType;
    destination: string;
    isDefault: boolean;
    isActive: boolean;
    createdAt: string;
}

export type NotificationDeliveryStatus = "pending" | "sent" | "failed" | "skipped";

export interface NotificationDelivery {
    id: string;
    changeReportId: string;
    userId: string;
    notificationChannelId: string;
    status: NotificationDeliveryStatus;
    errorMessage?: string;
    sentAt?: string;
    createdAt: string;
}

export interface RefreshToken {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: string;
    revokedAt?: string;
    revocationReason?: string;
    replacedByTokenId?: string;
    createdAt: string;
}

export interface AuthUser {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
    name: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface AuthResponse {
    user: AuthUser;
}

export interface LogoutResponse {
    success: true;
}

export interface ErrorResponse {
    error: string;
    message: string;
}
