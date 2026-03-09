import type { ScrapeInterval, UserRole } from "@mabrik/shared";
import type { FormEventHandler } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { CategoryOption } from "../../categories/types/category-option";
import type { CategoryTreeNode } from "../../categories/types/category-tree-node";
import type {
    AdminSchedulerStateItemData,
    ChannelData,
    SettingsTab,
    SubscriptionsData,
    UpdateProfileRequestData,
    TriggerRunResponseData,
} from "./settings-schema.types";

export interface SettingsSummaryProps {
    email: string;
    name: string;
    role: UserRole;
    subscriptions: SubscriptionsData;
}

export interface SettingsTabsProps {
    activeTab: SettingsTab;
    visibleTabs: SettingsTab[];
    onSetTab: (tab: SettingsTab) => void;
}

export interface SettingsAccountTabProps {
    form: UseFormReturn<UpdateProfileRequestData>;
    email: string;
    isActive: boolean;
    isSaving: boolean;
    role: UserRole;
    onSubmitProfile: FormEventHandler<HTMLFormElement>;
}

export interface SettingsTrackingTabProps {
    availableCategoryOptions: CategoryOption[];
    availableCategoryTreeData: CategoryTreeNode[];
    categoryLabelById: Map<string, string>;
    role: UserRole;
    selectedCategoryId: string;
    subscriptions: SubscriptionsData;
    trackingError: string | null;
    isCreatePending: boolean;
    isDeletePending: boolean;
    onSelectCategory: (categoryId: string) => void;
    onTrackCategory: () => void;
    onUntrackCategory: (subscriptionId: string) => void;
}

export interface SettingsNotificationsTabProps {
    channels: ChannelData[];
    newChannelEmail: string;
    role: UserRole;
    isCreatePending: boolean;
    onSetNewChannelEmail: (value: string) => void;
    onCreateChannel: () => void;
    onToggleChannelDefault: (channelId: string, isDefault: boolean) => void;
    onToggleChannelActive: (channelId: string, isActive: boolean) => void;
    onRemoveChannel: (channelId: string) => void;
}

export interface SettingsPlanTabProps {
    role: UserRole;
    subscriptions: SubscriptionsData;
}

export interface SettingsAdminTabProps {
    schedulerStateItems: AdminSchedulerStateItemData[];
    schedulerStateCategoryTreeData: CategoryTreeNode[];
    triggerCategoryTreeData: CategoryTreeNode[];
    schedulerStateGeneratedAt?: string;
    schedulerStateError: string | null;
    isSchedulerStateLoading: boolean;
    selectedIntervalCategoryId: string;
    selectedTriggerCategoryId: string;
    selectedScrapeInterval: ScrapeInterval;
    triggerRunResult?: TriggerRunResponseData;
    isSavingInterval: boolean;
    isTriggeringRun: boolean;
    onRetrySchedulerState: () => void;
    onSelectIntervalCategory: (categoryId: string) => void;
    onSelectTriggerCategory: (categoryId: string) => void;
    onSelectScrapeInterval: (scrapeInterval: ScrapeInterval) => void;
    onEditIntervalFromTable: (categoryId: string) => void;
    onSaveScrapeInterval: () => void;
    onTriggerRun: (categoryId?: string) => void;
    getTriggerDisabledReasonByCategoryId: (categoryId: string) => string | null;
}
