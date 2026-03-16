import { useEffect, useRef } from "react";
import { SettingsAccountTab } from "../../components/account-tab";
import { SettingsAdminTab } from "../../components/admin-tab";
import { SettingsNotificationsTab } from "../../components/notifications-tab";
import { SettingsPlanTab } from "../../components/plan-tab";
import { SettingsSummary } from "../../components/settings-summary";
import { SettingsTabs } from "../../components/settings-tabs";
import { useSettingsAccount } from "../../hooks/use-settings-account";
import { useSettingsAdmin } from "../../hooks/use-settings-admin";
import { useSettingsNotifications } from "../../hooks/use-settings-notifications";
import { useSettingsTabs } from "../../hooks/use-settings-tabs";
import { useSubscriptionsQuery } from "../../queries";
import styles from "./settings-page-view.module.scss";

export const SettingsPageView = () => {
    const headingRef = useRef<HTMLHeadingElement>(null);
    const account = useSettingsAccount();
    const subscriptionsQuery = useSubscriptionsQuery();
    const role = account.session.data?.role ?? "free";
    const notifications = useSettingsNotifications(role);
    const isAdmin = role === "admin";
    const admin = useSettingsAdmin(isAdmin);
    const { activeTab, visibleTabs, setTab } = useSettingsTabs(isAdmin);

    useEffect(() => {
        headingRef.current?.focus();
    }, []);

    if (!account.session.data || !subscriptionsQuery.data || !notifications.channelsQuery.data) {
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
                <p className={styles.lede}>Manage your account, notification channels, and plan access in one place.</p>
            </div>

            <SettingsSummary
                email={account.session.data.email}
                name={account.session.data.name}
                role={role}
                subscriptions={subscriptionsQuery.data}
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

            {activeTab === "notifications" ? (
                <SettingsNotificationsTab
                    channels={notifications.channelsQuery.data.channels}
                    newChannelEmail={notifications.newChannelEmail}
                    role={role}
                    isTelegramAvailable={notifications.isTelegramAvailable}
                    telegramLinkStatus={notifications.telegramLinkStatusQuery.data}
                    telegramDeepLinkUrl={notifications.telegramDeepLinkUrl}
                    isTelegramLinkStatusLoading={notifications.telegramLinkStatusQuery.isFetching}
                    telegramLinkStatusError={
                        notifications.telegramLinkStatusQuery.isError
                            ? notifications.telegramLinkStatusQuery.error.message
                            : null
                    }
                    isCreatePending={notifications.isCreatePending}
                    isStartTelegramPending={notifications.isStartTelegramPending}
                    isConfirmTelegramPending={notifications.isConfirmTelegramPending}
                    onSetNewChannelEmail={notifications.setNewChannelEmail}
                    onCreateChannel={notifications.onCreateChannel}
                    onStartTelegramLink={notifications.onStartTelegramLink}
                    onRefreshTelegramLinkStatus={notifications.onRefreshTelegramLinkStatus}
                    onConfirmTelegramLink={notifications.onConfirmTelegramLink}
                    onToggleChannelDefault={notifications.onToggleChannelDefault}
                    onToggleChannelActive={notifications.onToggleChannelActive}
                    onRemoveChannel={notifications.onRemoveChannel}
                />
            ) : null}

            {activeTab === "plan" ? <SettingsPlanTab role={role} subscriptions={subscriptionsQuery.data} /> : null}

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
