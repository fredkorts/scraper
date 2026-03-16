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

export type PreorderDetectedFrom = "category_slug" | "title" | "description";

export enum NotificationChangeCategory {
    NEW_PRODUCT = "new_product",
    BACK_IN_STOCK = "back_in_stock",
    PRICE_DROP = "price_drop",
    PRICE_INCREASE = "price_increase",
    OUT_OF_STOCK = "out_of_stock",
    REMOVED = "removed",
    OTHER = "other",
}

export enum ScrapeStatus {
    PENDING = "pending",
    RUNNING = "running",
    COMPLETED = "completed",
    FAILED = "failed",
}

export enum ChannelType {
    EMAIL = "email",
    TELEGRAM = "telegram",
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
    {
        slug: "riided-ja-aksessuaarid",
        nameEt: "Riided ja aksessuaarid",
        nameEn: "Clothing & Accessories",
        productCount: 237,
    },
    {
        slug: "varvid-ja-hobitooted",
        nameEt: "Värvid ja hobitooted",
        nameEn: "Paints & Hobby Supplies",
        productCount: 1071,
    },
    { slug: "rollimangud", nameEt: "Rollimängud", nameEn: "Role-Playing Games", productCount: 519 },
    { slug: "kaardimangud", nameEt: "Kaardimängud", nameEn: "Card Games", productCount: 511 },
    { slug: "raamatud-ja-koomiksid", nameEt: "Raamatud ja koomiksid", nameEn: "Books & Comics", productCount: 966 },
    {
        slug: "kodu-ja-kollektsioon/figuurid-ja-manguasjad",
        nameEt: "Figuurid ja mänguasjad",
        nameEn: "Figures & Toys",
        productCount: 410,
    },
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
    depth?: number;
    pathNameEt?: string;
    pathNameEn?: string;
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
    failure?: ScrapeRunFailure;
    startedAt: string;
    completedAt?: string;
}

export interface ScrapeRunFailure {
    summary: string;
    code?: string;
    phase?: string;
    pageUrl?: string;
    pageNumber?: number;
    isRetryable?: boolean;
}

export interface Product {
    id: string;
    externalUrl: string;
    name: string;
    imageUrl: string;
    currentPrice: number;
    originalPrice?: number;
    inStock: boolean;
    isPreorder: boolean;
    preorderEta?: string;
    preorderDetectedFrom?: PreorderDetectedFrom;
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
    emailVerifiedAt?: string;
    mfaEnabled: boolean;
    mfaEnabledAt?: string;
    capabilities?: {
        productWatchlist?: boolean;
    };
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

export interface MfaChallengeResponse {
    mfaRequired: true;
    challengeToken: string;
    user: AuthUser;
}

export type LoginResponse = AuthResponse | MfaChallengeResponse;

export interface AuthResponse {
    user: AuthUser;
}

export interface UpdateProfileRequest {
    name: string;
}

export interface UpdateProfileResponse {
    user: AuthUser;
}

export interface LogoutResponse {
    success: true;
}

export interface SuccessResponse {
    success: true;
}

export interface ForgotPasswordRequest {
    email: string;
}

export interface ResetPasswordRequest {
    token: string;
    password: string;
}

export interface VerifyEmailRequest {
    token: string;
}

export interface MfaVerifyLoginRequest {
    challengeToken: string;
    code?: string;
    recoveryCode?: string;
}

export interface MfaSetupStartResponse {
    secret: string;
    otpauthUri: string;
}

export interface MfaSetupConfirmRequest {
    code: string;
}

export interface MfaDisableRequest {
    currentPassword?: string;
    mfaCode?: string;
    recoveryCode?: string;
}

export interface MfaRecoveryCodesResponse {
    recoveryCodes: string[];
}

export interface AuthSession {
    id: string;
    createdAt: string;
    lastUsedAt?: string;
    expiresAt: string;
    revokedAt?: string;
    createdByIp?: string;
    createdByUserAgent?: string;
    label?: string;
    isCurrent: boolean;
}

export interface AuthSessionListResponse {
    sessions: AuthSession[];
}

export interface SessionRevokeRequest {
    currentPassword?: string;
    mfaCode?: string;
    recoveryCode?: string;
}

export interface SessionRevokeOthersRequest {
    currentPassword?: string;
    mfaCode?: string;
    recoveryCode?: string;
}

export interface ErrorResponse {
    error: string;
    message: string;
}

export interface DashboardHomeRunSummary {
    id: string;
    categoryId: string;
    categoryName: string;
    status: ScrapeStatus;
    startedAt: string;
    completedAt?: string;
    totalChanges: number;
    totalProducts: number;
}

export interface DashboardHomeFailure {
    id: string;
    categoryId: string;
    categoryName: string;
    startedAt: string;
    failure?: ScrapeRunFailure;
}

export interface DashboardChangeSummary {
    priceIncrease: number;
    priceDecrease: number;
    newProduct: number;
    soldOut: number;
    backInStock: number;
}

export interface DashboardTrackingOverviewRow {
    rowId: string;
    type: "category" | "product";
    name: string;
    lastChangeAt?: string;
    actionTargetId: string;
    categoryId?: string;
    productId?: string;
}

export interface DashboardTrackingOverview {
    rows: DashboardTrackingOverviewRow[];
    lastCheckedAt?: string;
}

export interface DashboardHomeResponse {
    latestRuns: DashboardHomeRunSummary[];
    recentFailures: DashboardHomeFailure[];
    recentChangeSummary: DashboardChangeSummary;
    trackingOverview: DashboardTrackingOverview;
}

export interface CategoriesResponse {
    categories: Array<
        Category & {
            depth: number;
            pathNameEt: string;
            pathNameEn: string;
        }
    >;
}

export interface SubscriptionListItem {
    id: string;
    category: {
        id: string;
        slug: string;
        nameEt: string;
        nameEn: string;
    };
    createdAt: string;
    isActive: boolean;
}

export interface SubscriptionsResponse {
    items: SubscriptionListItem[];
    limit: number | null;
    used: number;
    remaining: number | null;
}

export interface DeleteSubscriptionResponse extends SuccessResponse {
    autoDisabledWatchCount: number;
}

export interface PaginatedResponse<TItem> {
    items: TItem[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

export interface RunsListItem {
    id: string;
    categoryId: string;
    categoryName: string;
    status: ScrapeStatus;
    totalProducts: number;
    totalChanges: number;
    pagesScraped: number;
    durationMs?: number;
    startedAt: string;
    completedAt?: string;
    failure?: ScrapeRunFailure;
}

export interface RunsListResponse extends PaginatedResponse<RunsListItem> {}

export interface RunDetail {
    id: string;
    categoryId: string;
    categoryName: string;
    status: ScrapeStatus;
    totalProducts: number;
    totalChanges: number;
    newProducts: number;
    priceChanges: number;
    soldOut: number;
    backInStock: number;
    pagesScraped: number;
    durationMs?: number;
    failure?: ScrapeRunFailure;
    startedAt: string;
    completedAt?: string;
}

export interface RunDetailResponse {
    run: RunDetail;
}

export interface RunProductSnapshot {
    id: string;
    scrapeRunId: string;
    productId: string;
    name: string;
    price: number;
    originalPrice?: number;
    inStock: boolean;
    isPreorder: boolean;
    isWatched?: boolean;
    preorderEta?: string;
    preorderDetectedFrom?: PreorderDetectedFrom;
    imageUrl: string;
    externalUrl: string;
    scrapedAt: string;
}

export interface RunProductsResponse extends PaginatedResponse<RunProductSnapshot> {}

export interface RunChangeItem {
    id: string;
    changeType: ChangeType;
    oldPrice?: number;
    newPrice?: number;
    oldStockStatus?: boolean;
    newStockStatus?: boolean;
    product: {
        id: string;
        name: string;
        imageUrl: string;
        externalUrl: string;
        isWatched?: boolean;
        isPreorder: boolean;
        preorderEta?: string;
        preorderDetectedFrom?: PreorderDetectedFrom;
    };
}

export interface RunChangesResponse extends PaginatedResponse<RunChangeItem> {}

export interface ChangesListItem extends RunChangeItem {
    changedAt: string;
    category: {
        id: string;
        nameEt: string;
    };
    run: {
        id: string;
        startedAt: string;
    };
}

export interface ChangesListResponse extends PaginatedResponse<ChangesListItem> {}

export interface UpdateCategorySettingsRequest {
    scrapeIntervalHours: ScrapeInterval;
}

export type SchedulerEligibilityStatus = "eligible" | "inactive_category" | "no_active_subscribers" | "not_due_yet";

export type SchedulerQueueStatus = "idle" | "queued" | "active";

export interface AdminSchedulerStateItem {
    categoryId: string;
    categorySlug: string;
    categoryNameEt: string;
    categoryPathNameEt: string;
    isActive: boolean;
    scrapeIntervalHours: ScrapeInterval;
    nextRunAt?: string;
    activeSubscriberCount: number;
    eligibilityStatus: SchedulerEligibilityStatus;
    queueStatus: SchedulerQueueStatus;
    lastRunAt?: string;
    lastRunStatus?: ScrapeStatus;
}

export interface AdminSchedulerStateResponse {
    items: AdminSchedulerStateItem[];
    generatedAt: string;
}

export interface TriggerRunRequest {
    categoryId: string;
}

export interface TriggerRunResponse {
    accepted: true;
    categoryId: string;
    mode: "queued" | "direct";
    scrapeRunId?: string;
    jobId?: string;
}

export interface ProductDetailCategory {
    id: string;
    slug: string;
    nameEt: string;
    nameEn: string;
}

export interface ProductDetailRecentRun {
    id: string;
    categoryId: string;
    categoryName: string;
    status: ScrapeStatus;
    startedAt: string;
    completedAt?: string;
}

export interface ProductDetail {
    id: string;
    name: string;
    imageUrl: string;
    externalUrl: string;
    currentPrice: number;
    originalPrice?: number;
    inStock: boolean;
    isWatched: boolean;
    trackedProductId?: string;
    isPreorder: boolean;
    preorderEta?: string;
    preorderDetectedFrom?: PreorderDetectedFrom;
    firstSeenAt: string;
    lastSeenAt: string;
    historyPointCount: number;
    categories: ProductDetailCategory[];
    recentRuns: ProductDetailRecentRun[];
}

export interface ProductDetailResponse {
    product: ProductDetail;
}

export interface ProductHistoryPoint {
    id: string;
    scrapeRunId: string;
    categoryId: string;
    categoryName: string;
    price: number;
    originalPrice?: number;
    inStock: boolean;
    scrapedAt: string;
}

export interface ProductHistoryResponse {
    items: ProductHistoryPoint[];
}

export interface ProductQuickSearchItem {
    id: string;
    name: string;
    imageUrl: string;
    categoryName: string;
}

export interface ProductQuickSearchResponse {
    items: ProductQuickSearchItem[];
}

export interface TrackedProductListItem {
    id: string;
    productId: string;
    createdAt: string;
    updatedAt: string;
    product: {
        id: string;
        name: string;
        imageUrl: string;
        externalUrl: string;
        currentPrice: number;
        inStock: boolean;
        isPreorder: boolean;
        preorderEta?: string;
        preorderDetectedFrom?: PreorderDetectedFrom;
        categories: ProductDetailCategory[];
    };
}

export interface TrackedProductsResponse {
    items: TrackedProductListItem[];
}

export interface TrackProductRequest {
    productId: string;
}

export interface TrackProductResponse {
    item: TrackedProductListItem;
}

export type NotificationChannelInputType = "email" | "telegram" | "discord" | "whatsapp" | "signal" | "sms";

export interface NotificationChannelCreateRequest {
    channelType: NotificationChannelInputType;
    destination: string;
    isDefault?: boolean;
    isActive?: boolean;
}

export interface NotificationChannelUpdateRequest {
    destination?: string;
    isDefault?: boolean;
    isActive?: boolean;
}

export interface NotificationChannelResponse {
    channel: NotificationChannel;
}

export interface NotificationChannelsResponse {
    channels: NotificationChannel[];
}

export type TelegramLinkStatus = "none" | "awaiting_telegram" | "awaiting_confirmation" | "expired" | "connected";

export interface TelegramLinkStartResponse {
    deepLinkUrl: string;
    expiresAt: string;
}

export interface TelegramLinkStatusResponse {
    status: TelegramLinkStatus;
    challengeId?: string;
    expiresAt?: string;
    telegramAccountPreview?: string;
}

export interface TelegramLinkConfirmRequest {
    challengeId: string;
}

export interface TelegramLinkConfirmResponse {
    channel: NotificationChannel;
    verificationMessage: {
        status: "sent" | "failed";
        warning?: string;
    };
}
