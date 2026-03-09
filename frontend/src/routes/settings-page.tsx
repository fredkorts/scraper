import { useEffect, useRef } from "react";
import { SettingsAccountTab } from "../features/settings/components/account-tab";
import { SettingsAdminTab } from "../features/settings/components/admin-tab";
import { SettingsNotificationsTab } from "../features/settings/components/notifications-tab";
import { SettingsPlanTab } from "../features/settings/components/plan-tab";
import { SettingsSummary } from "../features/settings/components/settings-summary";
import { SettingsTabs } from "../features/settings/components/settings-tabs";
import { SettingsTrackingTab } from "../features/settings/components/tracking-tab";
import { useSettingsAccount } from "../features/settings/hooks/use-settings-account";
import { useSettingsAdmin } from "../features/settings/hooks/use-settings-admin";
import { useSettingsNotifications } from "../features/settings/hooks/use-settings-notifications";
import { useSettingsTabs } from "../features/settings/hooks/use-settings-tabs";
import { useSettingsTracking } from "../features/settings/hooks/use-settings-tracking";
import styles from "./settings-page.module.scss";

export const SettingsPage = () => {
    const headingRef = useRef<HTMLHeadingElement>(null);
    const account = useSettingsAccount();
    const tracking = useSettingsTracking();
    const notifications = useSettingsNotifications();
    const role = account.session.data?.role ?? "free";
    const isAdmin = role === "admin";
    const admin = useSettingsAdmin(isAdmin);
    const { activeTab, visibleTabs, setTab } = useSettingsTabs(isAdmin);

    useEffect(() => {
        headingRef.current?.focus();
    }, []);

    if (
        !account.session.data ||
        !tracking.subscriptionsQuery.data ||
        !tracking.categoriesQuery.data ||
        !notifications.channelsQuery.data
    ) {
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

            <SettingsSummary
                email={account.session.data.email}
                name={account.session.data.name}
                role={role}
                subscriptions={tracking.subscriptionsQuery.data}
            />

            <SettingsTabs activeTab={activeTab} visibleTabs={visibleTabs} onSetTab={setTab} />

            {activeTab === "account" ? (
                <SettingsAccountTab
                    form={account.profileForm}
                    email={account.session.data.email}
                    isActive={account.session.data.isActive}
                    isSaving={account.isSavingProfile}
                    role={role}
                    onSubmitProfile={account.onSubmitProfile}
                />
            ) : null}

            {activeTab === "tracking" ? (
                <SettingsTrackingTab
                    availableCategoryOptions={tracking.availableCategoryOptions}
                    availableCategoryTreeData={tracking.availableCategoryTreeData}
                    categoryLabelById={tracking.categoryLabelById}
                    role={role}
                    selectedCategoryId={tracking.effectiveSelectedCategoryId}
                    subscriptions={tracking.subscriptionsQuery.data}
                    trackingError={tracking.trackingError}
                    isCreatePending={tracking.isCreatePending}
                    isDeletePending={tracking.isDeletePending}
                    onSelectCategory={tracking.setSelectedCategoryId}
                    onTrackCategory={tracking.onTrackCategory}
                    onUntrackCategory={tracking.onUntrackCategory}
                />
            ) : null}

            {activeTab === "notifications" ? (
                <SettingsNotificationsTab
                    channels={notifications.channelsQuery.data.channels}
                    newChannelEmail={notifications.newChannelEmail}
                    role={role}
                    isCreatePending={notifications.isCreatePending}
                    onSetNewChannelEmail={notifications.setNewChannelEmail}
                    onCreateChannel={notifications.onCreateChannel}
                    onToggleChannelDefault={notifications.onToggleChannelDefault}
                    onToggleChannelActive={notifications.onToggleChannelActive}
                    onRemoveChannel={notifications.onRemoveChannel}
                />
            ) : null}

            {activeTab === "plan" ? (
                <SettingsPlanTab role={role} subscriptions={tracking.subscriptionsQuery.data} />
            ) : null}

            {activeTab === "admin" && isAdmin ? (
                <SettingsAdminTab
                    schedulerStateItems={admin.schedulerStateItems}
                    schedulerStateCategoryTreeData={admin.schedulerStateCategoryTreeData}
                    triggerCategoryTreeData={admin.triggerCategoryTreeData}
                    schedulerStateGeneratedAt={admin.schedulerStateGeneratedAt}
                    schedulerStateError={admin.schedulerStateQuery.error ? "Unable to load scheduler state." : null}
                    isSchedulerStateLoading={admin.schedulerStateQuery.isLoading}
                    selectedIntervalCategoryId={admin.selectedIntervalCategoryId}
                    selectedTriggerCategoryId={admin.selectedTriggerCategoryId}
                    selectedScrapeInterval={admin.selectedScrapeInterval}
                    triggerRunResult={admin.triggerRunResult}
                    isSavingInterval={admin.isSavingInterval}
                    isTriggeringRun={admin.isTriggeringRun}
                    onRetrySchedulerState={() => void admin.schedulerStateQuery.refetch()}
                    onSelectIntervalCategory={admin.setSelectedIntervalCategoryId}
                    onSelectTriggerCategory={admin.setSelectedTriggerCategoryId}
                    onSelectScrapeInterval={admin.setSelectedScrapeInterval}
                    onEditIntervalFromTable={admin.prefillIntervalFromTable}
                    onSaveScrapeInterval={admin.onSaveScrapeInterval}
                    onTriggerRun={admin.onTriggerRun}
                    getTriggerDisabledReasonByCategoryId={admin.getTriggerDisabledReasonByCategoryId}
                />
            ) : null}
        </section>
    );
};
