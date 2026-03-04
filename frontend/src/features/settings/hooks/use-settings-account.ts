import { zodResolver } from "@hookform/resolvers/zod";
import type { FormEventHandler } from "react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMeQuery } from "../../auth/queries";
import { useUpdateProfileMutation } from "../mutations";
import { updateProfileRequestSchema } from "../schemas";
import type { UpdateProfileRequestData } from "../types/settings-schema.types";

export interface UseSettingsAccountResult {
    session: ReturnType<typeof useMeQuery>;
    profileForm: ReturnType<typeof useForm<UpdateProfileRequestData>>;
    isSavingProfile: boolean;
    onSubmitProfile: FormEventHandler<HTMLFormElement>;
}

export const useSettingsAccount = (): UseSettingsAccountResult => {
    const session = useMeQuery();
    const updateProfileMutation = useUpdateProfileMutation();

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
        await updateProfileMutation.mutateAsync(values);
    });

    return {
        session,
        profileForm,
        isSavingProfile: updateProfileMutation.isPending,
        onSubmitProfile,
    };
};
