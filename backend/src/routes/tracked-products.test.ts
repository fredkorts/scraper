import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../app";
import { authCookieNames } from "../lib/cookies";
import { signAccessToken } from "../lib/jwt";
import { prisma } from "../lib/prisma";
import { useTestDatabase } from "../test/db";
import { createUser } from "../test/factories";

useTestDatabase();

const authCookie = (userId: string, email: string, role: "free" | "paid" | "admin" = "free") => {
    const token = signAccessToken({
        sub: userId,
        email,
        role,
    });

    return `${authCookieNames.accessToken}=${token}`;
};

const createCategory = async (slug: string) =>
    prisma.category.create({
        data: {
            slug,
            nameEt: slug,
            nameEn: slug,
            isActive: true,
        },
    });

const createProduct = async (slug: string) =>
    prisma.product.create({
        data: {
            externalUrl: `https://mabrik.ee/toode/${slug}`,
            name: `Product ${slug}`,
            imageUrl: `https://mabrik.ee/images/${slug}.jpg`,
            currentPrice: "19.99",
            inStock: true,
        },
    });

describe("tracked products routes", () => {
    it("tracks, lists, and untracks an accessible product", async () => {
        const app = createApp();
        const { user } = await createUser({ email: "tracked-routes@example.com" });
        const category = await createCategory("tracked-routes");
        const product = await createProduct("tracked-routes-product");

        await prisma.userSubscription.create({
            data: {
                userId: user.id,
                categoryId: category.id,
            },
        });
        await prisma.productCategory.create({
            data: {
                productId: product.id,
                categoryId: category.id,
            },
        });

        const createResponse = await request(app)
            .post("/api/tracked-products")
            .set("Cookie", authCookie(user.id, user.email))
            .send({ productId: product.id });

        expect(createResponse.status).toBe(201);
        expect(createResponse.body.item.productId).toBe(product.id);
        expect(createResponse.body.item.product.id).toBe(product.id);

        const listResponse = await request(app)
            .get("/api/tracked-products")
            .set("Cookie", authCookie(user.id, user.email));

        expect(listResponse.status).toBe(200);
        expect(listResponse.body.items).toHaveLength(1);
        expect(listResponse.body.items[0].productId).toBe(product.id);

        const deleteResponse = await request(app)
            .delete(`/api/tracked-products/by-product/${product.id}`)
            .set("Cookie", authCookie(user.id, user.email));

        expect(deleteResponse.status).toBe(200);
        expect(deleteResponse.body.success).toBe(true);

        const listAfterDelete = await request(app)
            .get("/api/tracked-products")
            .set("Cookie", authCookie(user.id, user.email));

        expect(listAfterDelete.status).toBe(200);
        expect(listAfterDelete.body.items).toHaveLength(0);
    });

    it("returns 404 when a non-admin user tracks an inaccessible product", async () => {
        const app = createApp();
        const { user } = await createUser({ email: "tracked-inaccessible@example.com" });
        const category = await createCategory("tracked-inaccessible");
        const product = await createProduct("tracked-inaccessible-product");

        await prisma.productCategory.create({
            data: {
                productId: product.id,
                categoryId: category.id,
            },
        });

        const response = await request(app)
            .post("/api/tracked-products")
            .set("Cookie", authCookie(user.id, user.email))
            .send({ productId: product.id });

        expect(response.status).toBe(404);
        expect(response.body.error).toBe("not_found");
    });

    it("enforces shared tracking capacity across categories and watched products", async () => {
        const app = createApp();
        const { user } = await createUser({ email: "tracked-limit@example.com" });
        const categories = await Promise.all([
            createCategory("tracked-limit-a"),
            createCategory("tracked-limit-b"),
            createCategory("tracked-limit-c"),
        ]);
        const products = await Promise.all([createProduct("tracked-limit-1"), createProduct("tracked-limit-2")]);

        await prisma.userSubscription.createMany({
            data: [
                { userId: user.id, categoryId: categories[0].id, isActive: true },
                { userId: user.id, categoryId: categories[1].id, isActive: true },
            ],
        });
        await prisma.productCategory.createMany({
            data: [
                { productId: products[0].id, categoryId: categories[0].id },
                { productId: products[1].id, categoryId: categories[1].id },
            ],
        });

        const firstWatch = await request(app)
            .post("/api/tracked-products")
            .set("Cookie", authCookie(user.id, user.email))
            .send({ productId: products[0].id });

        expect(firstWatch.status).toBe(201);

        const secondWatch = await request(app)
            .post("/api/tracked-products")
            .set("Cookie", authCookie(user.id, user.email))
            .send({ productId: products[1].id });

        expect(secondWatch.status).toBe(409);
        expect(secondWatch.body.error).toBe("tracking_limit_reached");
    });

    it("does not auto-disable watches when the product remains accessible via another active subscription", async () => {
        const app = createApp();
        const { user } = await createUser({ email: "tracked-multi-category@example.com" });
        const categoryA = await createCategory("tracked-multi-a");
        const categoryB = await createCategory("tracked-multi-b");
        const product = await createProduct("tracked-multi-product");

        const subA = await prisma.userSubscription.create({
            data: {
                userId: user.id,
                categoryId: categoryA.id,
                isActive: true,
            },
        });
        await prisma.userSubscription.create({
            data: {
                userId: user.id,
                categoryId: categoryB.id,
                isActive: true,
            },
        });
        await prisma.productCategory.createMany({
            data: [
                { productId: product.id, categoryId: categoryA.id },
                { productId: product.id, categoryId: categoryB.id },
            ],
        });
        await prisma.userTrackedProduct.create({
            data: {
                userId: user.id,
                productId: product.id,
                isActive: true,
            },
        });

        const deleteResponse = await request(app)
            .delete(`/api/subscriptions/${subA.id}`)
            .set("Cookie", authCookie(user.id, user.email));

        expect(deleteResponse.status).toBe(200);
        expect(deleteResponse.body.autoDisabledWatchCount).toBe(0);

        const trackedList = await request(app)
            .get("/api/tracked-products")
            .set("Cookie", authCookie(user.id, user.email));
        expect(trackedList.status).toBe(200);
        expect(trackedList.body.items).toHaveLength(1);
    });
});
