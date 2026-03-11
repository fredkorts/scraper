import type { FormEventHandler } from "react";
import type { useForm } from "react-hook-form";
import type { useMeQuery } from "../../auth";
import type { UpdateProfileRequestData } from "./settings-schema.types";

export interface UseSettingsAccountResult {
    session: ReturnType<typeof useMeQuery>;
    profileForm: ReturnType<typeof useForm<UpdateProfileRequestData>>;
    isSavingProfile: boolean;
    onSubmitProfile: FormEventHandler<HTMLFormElement>;
}
