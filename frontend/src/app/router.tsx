import type { QueryClient } from "@tanstack/react-query";
import {
    Outlet,
    createRootRouteWithContext,
    createRoute,
    createRouter,
    redirect,
    type RouterHistory,
} from "@tanstack/react-router";
import type { AuthUser } from "@mabrik/shared";
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
import { LandingPage } from "../routes/landing-page";
import { LoginPage } from "../routes/login-page";
import { ProductDetailRoutePage } from "../routes/product-detail-route";
import { RegisterPage } from "../routes/register-page";
import { RunDetailPage } from "../routes/run-detail-page";
import { RunsPage } from "../routes/runs-page";
import { SettingsPage } from "../routes/settings-page";

export interface RouterContext {
    queryClient: QueryClient;
    ensureSession: () => Promise<AuthUser | null>;
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
    component: Outlet,
});

const landingRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: LandingPage,
});

const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/login",
    beforeLoad: async ({ context }) => {
        const session = await context.ensureSession();

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
        const session = await context.ensureSession();

        if (session) {
            throw redirect({ to: "/app" });
        }
    },
    component: RegisterPage,
});

const appRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/app",
    beforeLoad: async ({ context }) => {
        const session = await context.ensureSession();

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
                }),
            ),
            context.queryClient.ensureQueryData(
                runChangesQueryOptions(params.runId, {
                    page: deps.changesPage,
                    pageSize: deps.changesPageSize,
                    changeType: deps.changeType,
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
        ]);
    },
    component: SettingsPage,
});

const routeTree = rootRoute.addChildren([
    landingRoute,
    loginRoute,
    registerRoute,
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
