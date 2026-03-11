import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMeQuery } from "../../auth";
import { useUpdateProfileMutation } from "../mutations";
import { updateProfileRequestSchema } from "../schemas";
import type { UpdateProfileRequestData } from "../types/settings-schema.types";
import type { UseSettingsAccountResult } from "../types/use-settings-account.types";
import { NOTIFICATION_MESSAGES } from "../../../shared/constants/notification-messages";
import { useAppNotification } from "../../../shared/hooks/use-app-notification";
import { normalizeUserError } from "../../../shared/utils/normalize-user-error";

export const useSettingsAccount = (): UseSettingsAccountResult => {
    const session = useMeQuery();
    const updateProfileMutation = useUpdateProfileMutation();
    const { notify } = useAppNotification();

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

    const onSubmitProfile = profileForm.handleSubmit(async (values) => {
        try {
            await updateProfileMutation.mutateAsync(values);
            notify({
                variant: "success",
                message: NOTIFICATION_MESSAGES.settings.accountSaved.message,
                description: NOTIFICATION_MESSAGES.settings.accountSaved.description,
                key: "settings:account:update",
            });
        } catch (error) {
            notify({
                variant: "error",
                message: NOTIFICATION_MESSAGES.settings.accountSaveFailed.message,
                description: normalizeUserError(error, "Failed to update profile"),
                key: "settings:account:update",
            });
        }
    });

    return {
        session,
        profileForm,
        isSavingProfile: updateProfileMutation.isPending,
        onSubmitProfile,
    };
};
