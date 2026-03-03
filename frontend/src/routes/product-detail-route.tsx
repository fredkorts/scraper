import { Suspense, lazy } from "react";

const LazyProductDetailPage = lazy(async () => {
    const module = await import("./product-detail-page");
    return { default: module.ProductDetailPage };
});

export const ProductDetailRoutePage = () => (
    <Suspense
        fallback={
            <section style={{ padding: "2rem" }}>
                <p>Loading product detail...</p>
            </section>
        }
    >
        <LazyProductDetailPage />
    </Suspense>
);
