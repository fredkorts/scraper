import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { SCRAPE_INTERVALS, type NotificationChannelCreateRequest } from "@mabrik/shared";
import { buildCategoryOptions, getCategoryDisplayLabel } from "../features/categories/options";
import { useCategoriesQuery } from "../features/categories/queries";
import { useMeQuery } from "../features/auth/queries";
import {
    useCreateNotificationChannelMutation,
    useCreateSubscriptionMutation,
    useDeleteNotificationChannelMutation,
    useDeleteSubscriptionMutation,
    useTriggerRunMutation,
    useUpdateCategorySettingsMutation,
    useUpdateNotificationChannelMutation,
    useUpdateProfileMutation,
} from "../features/settings/mutations";
import {
    useNotificationChannelsQuery,
    useSubscriptionsQuery,
} from "../features/settings/queries";
import {
    defaultSettingsSearch,
} from "../features/settings/search";
import {
    updateProfileRequestSchema,
    type SettingsTab,
    type UpdateProfileRequestData,
} from "../features/settings/schemas";
import { defaultRunDetailSectionSearch } from "../features/runs/search";
import styles from "./settings-page.module.scss";

const tabLabels: Record<SettingsTab, string> = {
    account: "Account",
    tracking: "Tracking",
    notifications: "Notifications",
    plan: "Plan",
    admin: "Admin",
};

const roleLabelMap = {
    free: "Free",
    paid: "Paid",
    admin: "Admin",
} as const;

const getRoleLimitLabel = (_role: "free" | "paid" | "admin", used: number, limit: number | null): string => {
    if (limit === null) {
        return `${used} tracked / Unlimited`;
    }

    return `${used} / ${limit} tracked`;
};

const getNotificationModeLabel = (role?: "free" | "paid" | "admin"): string => {
    return role === "free" ? "Digest every 6 hours" : "Immediate notifications";
};

export const SettingsPage = () => {
    const headingRef = useRef<HTMLHeadingElement>(null);
    const navigate = useNavigate({ from: "/app/settings" });
    const search = useSearch({ from: "/app/settings" });
    const session = useMeQuery();
    const categoriesQuery = useCategoriesQuery("all");
    const subscriptionsQuery = useSubscriptionsQuery();
    const channelsQuery = useNotificationChannelsQuery();
    const updateProfileMutation = useUpdateProfileMutation();
    const createSubscriptionMutation = useCreateSubscriptionMutation();
    const deleteSubscriptionMutation = useDeleteSubscriptionMutation();
    const createChannelMutation = useCreateNotificationChannelMutation();
    const updateChannelMutation = useUpdateNotificationChannelMutation();
    const deleteChannelMutation = useDeleteNotificationChannelMutation();
    const updateCategorySettingsMutation = useUpdateCategorySettingsMutation();
    const triggerRunMutation = useTriggerRunMutation();
    const [selectedCategoryId, setSelectedCategoryId] = useState("");
    const [adminCategoryId, setAdminCategoryId] = useState("");
    const [adminScrapeInterval, setAdminScrapeInterval] = useState<(typeof SCRAPE_INTERVALS)[number] | null>(null);
    const [newChannelEmail, setNewChannelEmail] = useState("");
    const [trackingError, setTrackingError] = useState<string | null>(null);

    useEffect(() => {
        headingRef.current?.focus();
    }, []);

    const profileForm = useForm<UpdateProfileRequestData>({
        resolver: zodResolver(updateProfileRequestSchema),
        defaultValues: {
            name: session.data?.name ?? "",
        },
    });

    useEffect(() => {
        if (session.data?.name) {
            profileForm.reset({
                name: session.data.name,
            });
        }
    }, [profileForm, session.data?.name]);

    const role = session.data?.role ?? "free";
    const subscriptions = subscriptionsQuery.data;
    const trackedCategoryIds = useMemo(
        () => new Set(subscriptions?.items.map((item) => item.category.id) ?? []),
        [subscriptions?.items],
    );
    const categoryOptions = useMemo(() => buildCategoryOptions(categoriesQuery.data?.categories ?? []), [categoriesQuery.data?.categories]);
    const availableCategoryOptions = useMemo(
        () => categoryOptions.filter((category) => !trackedCategoryIds.has(category.id)),
        [categoryOptions, trackedCategoryIds],
    );
    const categoryLabelById = useMemo(
        () =>
            new Map(
                (categoriesQuery.data?.categories ?? []).map((category) => [category.id, getCategoryDisplayLabel(category)]),
            ),
        [categoriesQuery.data?.categories],
    );
    const isAdmin = role === "admin";

    const effectiveSelectedCategoryId = selectedCategoryId || availableCategoryOptions[0]?.id || "";
    const effectiveAdminCategoryId = adminCategoryId || categoryOptions[0]?.id || "";
    const selectedAdminCategory = useMemo(
        () => categoriesQuery.data?.categories.find((category) => category.id === effectiveAdminCategoryId) ?? null,
        [categoriesQuery.data?.categories, effectiveAdminCategoryId],
    );
    const effectiveAdminScrapeInterval = adminScrapeInterval ?? selectedAdminCategory?.scrapeIntervalHours ?? 12;

    const setTab = (tab: SettingsTab) =>
        navigate({
            to: ".",
            search: {
                tab,
            },
        });

    const onSubmitProfile = profileForm.handleSubmit(async (values) => {
        await updateProfileMutation.mutateAsync(values);
    });

    const onTrackCategory = async () => {
        if (!effectiveSelectedCategoryId) {
            return;
        }

        setTrackingError(null);

        try {
            await createSubscriptionMutation.mutateAsync(effectiveSelectedCategoryId);
            setSelectedCategoryId("");
        } catch (error) {
            setTrackingError(error instanceof Error ? error.message : "Failed to track category");
        }
    };

    const onCreateChannel = async () => {
        const payload: NotificationChannelCreateRequest = {
            channelType: "email",
            destination: newChannelEmail,
        };

        await createChannelMutation.mutateAsync(payload);
        setNewChannelEmail("");
    };

    const activeTab = isAdmin || search.tab !== "admin" ? search.tab : defaultSettingsSearch.tab;

    if (!session.data || !subscriptions || !channelsQuery.data || !categoriesQuery.data) {
        return (
            <section className={styles.page}>
                <h1 className={styles.pageHeading} ref={headingRef} tabIndex={-1}>
                    Settings
                </h1>
                <p className={styles.emptyState}>Loading settings...</p>
            </section>
        );
    }

    return (
        <section className={styles.page}>
            <div className={styles.stack}>
                <h1 className={styles.pageHeading} ref={headingRef} tabIndex={-1}>
                    Settings
                </h1>
                <p className={styles.lede}>
                    Manage your account, tracked categories, notification channels, and plan access in one place.
                </p>
            </div>

            <section className={styles.summaryShell} aria-label="Settings summary">
                <article className={styles.summaryCard}>
                    <span className={styles.eyebrow}>User</span>
                    <strong>{session.data.name}</strong>
                    <span className={styles.subtle}>{session.data.email}</span>
                </article>
                <article className={styles.summaryCard}>
                    <span className={styles.eyebrow}>Plan</span>
                    <strong>{roleLabelMap[role]}</strong>
                    <span className={styles.subtle}>{getNotificationModeLabel(role)}</span>
                </article>
                <article className={styles.summaryCard}>
                    <span className={styles.eyebrow}>Tracking</span>
                    <strong>{getRoleLimitLabel(role, subscriptions.used, subscriptions.limit)}</strong>
                    <span className={styles.subtle}>
                        {subscriptions.limit === null ? "Unlimited category tracking" : `${subscriptions.remaining ?? 0} slots remaining`}
                    </span>
                </article>
                <article className={styles.summaryCard}>
                    <span className={styles.eyebrow}>Notification mode</span>
                    <strong>{role === "free" ? "Digest" : "Immediate"}</strong>
                    <span className={styles.subtle}>{getNotificationModeLabel(role)}</span>
                </article>
            </section>

            <div className={styles.tabBar} role="tablist" aria-label="Settings sections">
                {(Object.keys(tabLabels) as SettingsTab[])
                    .filter((tab) => isAdmin || tab !== "admin")
                    .map((tab) => (
                        <button
                            key={tab}
                            type="button"
                            className={styles.tabButton}
                            data-active={activeTab === tab}
                            onClick={() => setTab(tab)}
                            role="tab"
                            aria-selected={activeTab === tab}
                        >
                            {tabLabels[tab]}
                        </button>
                    ))}
            </div>

            {activeTab === "account" ? (
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>Account Basics</h2>
                    </div>
                    <form className={styles.card} onSubmit={onSubmitProfile}>
                        <label className={styles.field}>
                            <span className={styles.label}>Name</span>
                            <input className={styles.input} {...profileForm.register("name")} />
                            {profileForm.formState.errors.name ? (
                                <span className={styles.errorText}>{profileForm.formState.errors.name.message}</span>
                            ) : null}
                        </label>
                        <label className={styles.field}>
                            <span className={styles.label}>Email</span>
                            <input className={styles.input} value={session.data.email} readOnly />
                            <span className={styles.subtle}>Email changes are not available in Phase 5.</span>
                        </label>
                        <div className={styles.metaGrid}>
                            <div>
                                <span className={styles.eyebrow}>Role</span>
                                <div>{roleLabelMap[role]}</div>
                            </div>
                            <div>
                                <span className={styles.eyebrow}>Account status</span>
                                <div>{session.data.isActive ? "Active" : "Inactive"}</div>
                            </div>
                        </div>
                        <button type="submit" disabled={updateProfileMutation.isPending}>
                            {updateProfileMutation.isPending ? "Saving..." : "Save changes"}
                        </button>
                    </form>
                </section>
            ) : null}

            {activeTab === "tracking" ? (
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>Tracking</h2>
                    </div>
                    <article className={styles.card}>
                        <span className={styles.eyebrow}>Usage</span>
                        <strong>{getRoleLimitLabel(role, subscriptions.used, subscriptions.limit)}</strong>
                        <span className={styles.subtle}>
                            {role === "free"
                                ? "Free users receive digest notifications every 6 hours."
                                : role === "paid"
                                  ? "Paid users receive immediate notifications."
                                  : "Admin users can track unlimited categories."}
                        </span>
                    </article>
                    <article className={styles.card}>
                        <div className={styles.sectionHeader}>
                            <h3 className={styles.cardTitle}>Tracked categories</h3>
                        </div>
                        {subscriptions.items.length === 0 ? (
                            <p className={styles.emptyState}>You are not tracking any categories yet.</p>
                        ) : (
                            <div className={styles.list}>
                                {subscriptions.items.map((item) => (
                                    <div key={item.id} className={styles.listItem}>
                                        <div>
                                            <strong>{categoryLabelById.get(item.category.id) ?? item.category.nameEt}</strong>
                                            <div className={styles.subtle}>{item.category.slug}</div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => void deleteSubscriptionMutation.mutateAsync(item.id)}
                                            disabled={deleteSubscriptionMutation.isPending}
                                        >
                                            Stop tracking
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </article>
                    <article className={styles.card}>
                        <h3 className={styles.cardTitle}>Track a new category</h3>
                        <div className={styles.inlineForm}>
                            <label className={styles.field}>
                                <span className={styles.label}>Available categories</span>
                                <select
                                    className={styles.select}
                                    value={effectiveSelectedCategoryId}
                                    onChange={(event) => setSelectedCategoryId(event.target.value)}
                                >
                                    {availableCategoryOptions.map((category) => (
                                        <option key={category.id} value={category.id}>
                                            {category.label}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <button
                                type="button"
                                onClick={() => void onTrackCategory()}
                                disabled={!availableCategoryOptions.length || createSubscriptionMutation.isPending}
                            >
                                {createSubscriptionMutation.isPending ? "Tracking..." : "Track category"}
                            </button>
                        </div>
                        {trackingError ? <p className={styles.errorText}>{trackingError}</p> : null}
                        {!availableCategoryOptions.length ? (
                            <p className={styles.subtle}>No additional categories are available for tracking under your current plan.</p>
                        ) : null}
                    </article>
                </section>
            ) : null}

            {activeTab === "notifications" ? (
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>Notification Channels</h2>
                    </div>
                    <article className={styles.card}>
                        <h3 className={styles.cardTitle}>Add email channel</h3>
                        <div className={styles.inlineForm}>
                            <label className={styles.field}>
                                <span className={styles.label}>Email</span>
                                <input
                                    className={styles.input}
                                    type="email"
                                    value={newChannelEmail}
                                    onChange={(event) => setNewChannelEmail(event.target.value)}
                                />
                            </label>
                            <button
                                type="button"
                                onClick={() => void onCreateChannel()}
                                disabled={!newChannelEmail || createChannelMutation.isPending}
                            >
                                {createChannelMutation.isPending ? "Adding..." : "Add channel"}
                            </button>
                        </div>
                        <p className={styles.subtle}>
                            {role === "free"
                                ? "Free users receive digest email delivery."
                                : "Paid and admin users receive immediate email delivery."}
                        </p>
                    </article>
                    <article className={styles.card}>
                        <h3 className={styles.cardTitle}>Current channels</h3>
                        <div className={styles.list}>
                            {channelsQuery.data.channels.map((channel) => (
                                <div key={channel.id} className={styles.listItem}>
                                    <div>
                                        <strong>{channel.destination}</strong>
                                        <div className={styles.subtle}>
                                            {channel.isDefault ? "Default" : "Secondary"} · {channel.isActive ? "Active" : "Inactive"}
                                        </div>
                                    </div>
                                    <div className={styles.actionRow}>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                void updateChannelMutation.mutateAsync({
                                                    id: channel.id,
                                                    payload: { isDefault: !channel.isDefault },
                                                })
                                            }
                                        >
                                            {channel.isDefault ? "Unset default" : "Make default"}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                void updateChannelMutation.mutateAsync({
                                                    id: channel.id,
                                                    payload: { isActive: !channel.isActive },
                                                })
                                            }
                                        >
                                            {channel.isActive ? "Disable" : "Enable"}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => void deleteChannelMutation.mutateAsync(channel.id)}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </article>
                </section>
            ) : null}

            {activeTab === "plan" ? (
                <section className={styles.section}>
                    <article className={styles.card}>
                        <h2 className={styles.sectionTitle}>Plan</h2>
                        <p className={styles.planHeadline}>You are on the {roleLabelMap[role]} plan.</p>
                        <div className={styles.list}>
                            <div className={styles.listItem}>
                                <span>Category tracking</span>
                                <strong>{subscriptions.limit === null ? "Unlimited" : `Up to ${subscriptions.limit} categories`}</strong>
                            </div>
                            <div className={styles.listItem}>
                                <span>Notifications</span>
                                <strong>{getNotificationModeLabel(role)}</strong>
                            </div>
                            {role === "free" ? (
                                <div className={styles.listItem}>
                                    <span>Upgrade</span>
                                    <strong>Upgrade flow arrives in Phase 6</strong>
                                </div>
                            ) : null}
                        </div>
                    </article>
                </section>
            ) : null}

            {activeTab === "admin" && isAdmin ? (
                <section className={styles.section}>
                    <article className={styles.card}>
                        <h2 className={styles.sectionTitle}>Admin Controls</h2>
                        <div className={styles.inlineForm}>
                            <label className={styles.field}>
                                <span className={styles.label}>Category</span>
                                <select
                                    className={styles.select}
                                    value={effectiveAdminCategoryId}
                                    onChange={(event) => {
                                        const value = event.target.value;
                                        setAdminCategoryId(value);
                                        const selected = categoriesQuery.data.categories.find((category) => category.id === value);
                                        if (selected) {
                                            setAdminScrapeInterval(selected.scrapeIntervalHours);
                                        }
                                    }}
                                >
                                    {categoryOptions.map((category) => (
                                        <option key={category.id} value={category.id}>
                                            {category.label}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className={styles.field}>
                                <span className={styles.label}>Scrape interval</span>
                                <select
                                    className={styles.select}
                                    value={String(effectiveAdminScrapeInterval)}
                                    onChange={(event) =>
                                        setAdminScrapeInterval(Number(event.target.value) as (typeof SCRAPE_INTERVALS)[number])
                                    }
                                >
                                    {SCRAPE_INTERVALS.map((interval) => (
                                        <option key={interval} value={interval}>
                                            {interval} hours
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <button
                                type="button"
                                onClick={() =>
                                    void updateCategorySettingsMutation.mutateAsync({
                                        id: effectiveAdminCategoryId,
                                        payload: { scrapeIntervalHours: effectiveAdminScrapeInterval },
                                    })
                                }
                                disabled={!effectiveAdminCategoryId || updateCategorySettingsMutation.isPending}
                            >
                                {updateCategorySettingsMutation.isPending ? "Saving..." : "Save interval"}
                            </button>
                        </div>
                    </article>
                    <article className={styles.card}>
                        <h3 className={styles.cardTitle}>Manual scrape trigger</h3>
                        <div className={styles.inlineForm}>
                            <button
                                type="button"
                                onClick={() => void triggerRunMutation.mutateAsync({ categoryId: effectiveAdminCategoryId })}
                                disabled={!effectiveAdminCategoryId || triggerRunMutation.isPending}
                            >
                                {triggerRunMutation.isPending ? "Triggering..." : "Scrape now"}
                            </button>
                            {triggerRunMutation.data?.jobId ? (
                                <span className={styles.subtle}>Queued job {triggerRunMutation.data.jobId}</span>
                            ) : null}
                            {triggerRunMutation.data?.scrapeRunId ? (
                                <Link
                                    params={{ runId: triggerRunMutation.data.scrapeRunId }}
                                    search={defaultRunDetailSectionSearch}
                                    to="/app/runs/$runId"
                                >
                                    Open run detail
                                </Link>
                            ) : null}
                        </div>
                    </article>
                </section>
            ) : null}
        </section>
    );
};
