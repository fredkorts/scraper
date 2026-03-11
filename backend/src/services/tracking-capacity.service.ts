import { UserRole as PrismaUserRole } from "@prisma/client";
import type { UserRole } from "@mabrik/shared";

const roleLimitMap: Record<Exclude<UserRole, "admin">, number> = {
    free: 3,
    paid: 6,
};

interface TrackingUsageClient {
    userSubscription: {
        count: (args: { where: { userId: string; isActive: boolean } }) => Promise<number>;
    };
    userTrackedProduct: {
        count: (args: { where: { userId: string; isActive: boolean } }) => Promise<number>;
    };
}

export const getTrackingLimit = (role: UserRole): number | null => (role === "admin" ? null : roleLimitMap[role]);

export const getTrackingLimitByPrismaRole = (role: PrismaUserRole): number | null => {
    if (role === PrismaUserRole.ADMIN) {
        return null;
    }

    return role === PrismaUserRole.PAID ? roleLimitMap.paid : roleLimitMap.free;
};

export const getTrackingUsage = async (
    client: TrackingUsageClient,
    userId: string,
): Promise<{ categories: number; watchedProducts: number; used: number }> => {
    const [categories, watchedProducts] = await Promise.all([
        client.userSubscription.count({
            where: {
                userId,
                isActive: true,
            },
        }),
        client.userTrackedProduct.count({
            where: {
                userId,
                isActive: true,
            },
        }),
    ]);

    return {
        categories,
        watchedProducts,
        used: categories + watchedProducts,
    };
};
