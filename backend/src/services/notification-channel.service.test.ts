import { describe, expect, it } from "vitest";
import { prisma } from "../lib/prisma";
import { useTestDatabase } from "../test/db";
import { createUser } from "../test/factories";
import {
    createNotificationChannel,
    deleteNotificationChannel,
    listNotificationChannels,
    updateNotificationChannel,
} from "./notification-channel.service";

useTestDatabase();

describe("notification-channel service", () => {
    it("forces first active email channel to become default", async () => {
        const { user } = await createUser({ email: "channels1@example.com" });

        const created = await createNotificationChannel(user.id, {
            channelType: "email",
            destination: "  MixedCase@Example.COM  ",
            isDefault: false,
            isActive: true,
        });

        expect(created.destination).toBe("mixedcase@example.com");
        expect(created.isDefault).toBe(true);
        expect(created.isActive).toBe(true);
    });

    it("switches default channel when creating a new default", async () => {
        const { user } = await createUser({ email: "channels2@example.com" });

        const first = await createNotificationChannel(user.id, {
            channelType: "email",
            destination: "one@example.com",
        });

        const second = await createNotificationChannel(user.id, {
            channelType: "email",
            destination: "two@example.com",
            isDefault: true,
        });

        const channels = await listNotificationChannels(user.id);
        const firstRef = channels.find((channel) => channel.id === first.id);
        const secondRef = channels.find((channel) => channel.id === second.id);

        expect(firstRef?.isDefault).toBe(false);
        expect(secondRef?.isDefault).toBe(true);
    });

    it("auto-activates channel when setting it as default during update", async () => {
        const { user } = await createUser({ email: "channels3@example.com" });

        const first = await createNotificationChannel(user.id, {
            channelType: "email",
            destination: "primary@example.com",
        });

        const second = await createNotificationChannel(user.id, {
            channelType: "email",
            destination: "secondary@example.com",
            isActive: false,
        });

        const updated = await updateNotificationChannel(user.id, second.id, {
            isDefault: true,
            isActive: false,
        });

        const channels = await listNotificationChannels(user.id);
        const firstRef = channels.find((channel) => channel.id === first.id);

        expect(updated.isDefault).toBe(true);
        expect(updated.isActive).toBe(true);
        expect(firstRef?.isDefault).toBe(false);
    });

    it("promotes fallback default when deleting the current default", async () => {
        const { user } = await createUser({ email: "channels4@example.com" });

        const first = await createNotificationChannel(user.id, {
            channelType: "email",
            destination: "first@example.com",
        });

        const second = await createNotificationChannel(user.id, {
            channelType: "email",
            destination: "second@example.com",
        });

        await deleteNotificationChannel(user.id, first.id);

        const refreshedSecond = await prisma.notificationChannel.findUniqueOrThrow({
            where: { id: second.id },
        });

        expect(refreshedSecond.isActive).toBe(true);
        expect(refreshedSecond.isDefault).toBe(true);
    });

    it("rejects duplicate destination for same user and type", async () => {
        const { user } = await createUser({ email: "channels5@example.com" });

        await createNotificationChannel(user.id, {
            channelType: "email",
            destination: "duplicate@example.com",
        });

        await expect(
            createNotificationChannel(user.id, {
                channelType: "email",
                destination: "DUPLICATE@example.com",
            }),
        ).rejects.toMatchObject({
            statusCode: 409,
            code: "conflict",
        });
    });

    it("rejects unsupported channel types", async () => {
        const { user } = await createUser({ email: "channels6@example.com" });

        await expect(
            createNotificationChannel(user.id, {
                channelType: "discord",
                destination: "https://example.com/webhook",
            }),
        ).rejects.toMatchObject({
            statusCode: 400,
            code: "unsupported_channel_type",
        });
    });
});
