import { authResponseSchema, notificationChannelsResponseSchema } from "./schemas";

describe("api schemas", () => {
    it("parses valid auth response payload", () => {
        const parsed = authResponseSchema.parse({
            user: {
                id: "user-1",
                email: "user@example.com",
                name: "User",
                role: "free",
                isActive: true,
                mfaEnabled: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
        });

        expect(parsed.user.email).toBe("user@example.com");
    });

    it("rejects auth payload with invalid role", () => {
        expect(() =>
            authResponseSchema.parse({
                user: {
                    id: "user-1",
                    email: "user@example.com",
                    name: "User",
                    role: "power",
                    isActive: true,
                    mfaEnabled: false,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
            }),
        ).toThrow();
    });

    it("parses notification channels payload", () => {
        const parsed = notificationChannelsResponseSchema.parse({
            channels: [
                {
                    id: "ch-1",
                    userId: "user-1",
                    channelType: "email",
                    destination: "user@example.com",
                    isDefault: true,
                    isActive: true,
                    createdAt: new Date().toISOString(),
                },
            ],
        });

        expect(parsed.channels).toHaveLength(1);
    });
});
