import type { QueryClient } from "@tanstack/react-query";
import { ApiError } from "../lib/api/errors";
import {
    Outlet,
    createRootRouteWithContext,
    createRoute,
    createRouter,
    redirect,
    type RouterHistory,
} from "@tanstack/react-router";
import type { AuthUser } from "@mabrik/shared";
import { sessionsQueryOptions } from "../features/auth/queries";
import { categoriesQueryOptions } from "../features/categories/queries";
import { parseProductHistoryControls } from "../features/products/history-controls";
import { productDetailQueryOptions, productHistoryQueryOptions } from "../features/products/queries";
import {
    changesListQueryOptions,
    dashboardHomeQueryOptions,
    runChangesQueryOptions,
    runDetailQueryOptions,
    runProductsQueryOptions,
    runsListQueryOptions,
} from "../features/runs/queries";
import {
    parseChangesListSearch,
    parseDashboardHomeSearch,
    parseRunDetailSearch,
    parseRunsListSearch,
} from "../features/runs/search";
import { notificationChannelsQueryOptions, subscriptionsQueryOptions } from "../features/settings/queries";
import { parseSettingsSearch } from "../features/settings/search";
import { AppLayout } from "../routes/app-layout";
import { DashboardHomePage } from "../routes/dashboard-home-page";
import { ChangesPage } from "../routes/changes-page";
import { ForbiddenPage } from "../routes/forbidden-page";
import { ForgotPasswordPage } from "../routes/forgot-password-page";
import { GlobalErrorPage } from "../routes/global-error-page";
import { AuthConfigurationErrorPage } from "../routes/auth-configuration-error-page";
import { LandingPage } from "../routes/landing-page";
import { LoginPage } from "../routes/login-page";
import { NotFoundPage } from "../routes/not-found-page";
import { ProductDetailRoutePage } from "../routes/product-detail-route";
import { RegisterPage } from "../routes/register-page";
import { ResetPasswordPage } from "../routes/reset-password-page";
import { RunDetailPage } from "../routes/run-detail-page";
import { RunsPage } from "../routes/runs-page";
import { SettingsPage } from "../routes/settings-page";
import { VerifyEmailPage } from "../routes/verify-email-page";

export interface RouterContext {
    queryClient: QueryClient;
    ensureSession: () => Promise<AuthUser | null>;
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
    component: Outlet,
    notFoundComponent: NotFoundPage,
    errorComponent: ({ error, reset }) => <GlobalErrorPage error={error} onRetry={reset} />,
});

const ensureSessionWithConfigErrorRedirect = async (context: RouterContext): Promise<AuthUser | null> => {
    try {
        return await context.ensureSession();
    } catch (error) {
        if (error instanceof ApiError && error.status === 403 && error.code === "origin_not_allowed") {
            throw redirect({ to: "/auth-configuration-error" });
        }

        throw error;
    }
};

const landingRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: LandingPage,
});

const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/login",
    beforeLoad: async ({ context }) => {
        const session = await ensureSessionWithConfigErrorRedirect(context);

        if (session) {
            throw redirect({ to: "/app" });
        }
    },
    component: LoginPage,
});

const registerRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/register",
    beforeLoad: async ({ context }) => {
        const session = await ensureSessionWithConfigErrorRedirect(context);

        if (session) {
            throw redirect({ to: "/app" });
        }
    },
    component: RegisterPage,
});

const forgotPasswordRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/forgot-password",
    component: ForgotPasswordPage,
});

const resetPasswordRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/reset-password",
    validateSearch: (search: Record<string, unknown>) => ({
        token: typeof search.token === "string" ? search.token : undefined,
    }),
    component: ResetPasswordPage,
});

const verifyEmailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/verify-email",
    validateSearch: (search: Record<string, unknown>) => ({
        token: typeof search.token === "string" ? search.token : undefined,
    }),
    component: VerifyEmailPage,
});

const forbiddenRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/forbidden",
    component: ForbiddenPage,
});

const authConfigurationErrorRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/auth-configuration-error",
    component: AuthConfigurationErrorPage,
});

const appRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/app",
    beforeLoad: async ({ context }) => {
        const session = await ensureSessionWithConfigErrorRedirect(context);

        if (!session) {
            throw redirect({ to: "/login" });
        }
    },
    component: AppLayout,
});

const appHomeRoute = createRoute({
    getParentRoute: () => appRoute,
    path: "/",
    validateSearch: (search) => parseDashboardHomeSearch(search),
    loaderDeps: ({ search }) => search,
    loader: async ({ context, deps }) => {
        await Promise.all([
            context.queryClient.ensureQueryData(dashboardHomeQueryOptions(deps)),
            context.queryClient.ensureQueryData(categoriesQueryOptions()),
        ]);
    },
    component: DashboardHomePage,
});

const appRunsRoute = createRoute({
    getParentRoute: () => appRoute,
    path: "/runs",
    validateSearch: (search) => parseRunsListSearch(search),
    loaderDeps: ({ search }) => search,
    loader: async ({ context, deps }) => {
        await Promise.all([
            context.queryClient.ensureQueryData(runsListQueryOptions(deps)),
            context.queryClient.ensureQueryData(categoriesQueryOptions()),
        ]);
    },
    component: RunsPage,
});

const appChangesRoute = createRoute({
    getParentRoute: () => appRoute,
    path: "/changes",
    validateSearch: (search) => parseChangesListSearch(search),
    loaderDeps: ({ search }) => search,
    loader: async ({ context, deps }) => {
        await Promise.all([
            context.queryClient.ensureQueryData(changesListQueryOptions(deps)),
            context.queryClient.ensureQueryData(categoriesQueryOptions()),
        ]);
    },
    component: ChangesPage,
});

const appRunDetailRoute = createRoute({
    getParentRoute: () => appRoute,
    path: "/runs/$runId",
    validateSearch: (search) => parseRunDetailSearch(search),
    loaderDeps: ({ search }) => search,
    loader: async ({ context, params, deps }) => {
        await Promise.all([
            context.queryClient.ensureQueryData(runDetailQueryOptions(params.runId)),
            context.queryClient.ensureQueryData(
                runProductsQueryOptions(params.runId, {
                    page: deps.productsPage,
                    pageSize: deps.productsPageSize,
                    inStock: deps.productsInStock,
                    query: deps.productsQuery,
                }),
            ),
            context.queryClient.ensureQueryData(
                runChangesQueryOptions(params.runId, {
                    page: deps.changesPage,
                    pageSize: deps.changesPageSize,
                    changeType: deps.changeType,
                    preorder: deps.preorder,
                    query: deps.changesQuery,
                }),
            ),
        ]);
    },
    component: RunDetailPage,
});

const appProductDetailRoute = createRoute({
    getParentRoute: () => appRoute,
    path: "/products/$productId",
    validateSearch: (search) => parseProductHistoryControls(search),
    loader: async ({ context, params }) => {
        await Promise.all([
            context.queryClient.ensureQueryData(productDetailQueryOptions(params.productId)),
            context.queryClient.ensureQueryData(productHistoryQueryOptions(params.productId)),
        ]);
    },
    component: ProductDetailRoutePage,
});

const appSettingsRoute = createRoute({
    getParentRoute: () => appRoute,
    path: "/settings",
    validateSearch: (search) => parseSettingsSearch(search),
    loaderDeps: ({ search }) => search,
    loader: async ({ context }) => {
        await Promise.all([
            context.queryClient.ensureQueryData(subscriptionsQueryOptions()),
            context.queryClient.ensureQueryData(notificationChannelsQueryOptions()),
            context.queryClient.ensureQueryData(categoriesQueryOptions("all")),
            context.queryClient.ensureQueryData(sessionsQueryOptions()),
        ]);
    },
    component: SettingsPage,
});

const routeTree = rootRoute.addChildren([
    landingRoute,
    loginRoute,
    registerRoute,
    forgotPasswordRoute,
    resetPasswordRoute,
    verifyEmailRoute,
    forbiddenRoute,
    authConfigurationErrorRoute,
    appRoute.addChildren([
        appHomeRoute,
        appRunsRoute,
        appChangesRoute,
        appRunDetailRoute,
        appProductDetailRoute,
        appSettingsRoute,
    ]),
]);

export const createAppRouter = (context: RouterContext, history?: RouterHistory) =>
    createRouter({
        routeTree,
        context,
        defaultPreload: "intent",
        history,
    });
