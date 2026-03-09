interface FieldA11yOptions {
    formId: string;
    fieldName: string;
    hasError: boolean;
}

const buildErrorId = (formId: string, fieldName: string): string => `${formId}-${fieldName}-error`;

export const getFieldA11yProps = ({ formId, fieldName, hasError }: FieldA11yOptions) => ({
    "aria-invalid": hasError || undefined,
    "aria-describedby": hasError ? buildErrorId(formId, fieldName) : undefined,
});

export const getFieldErrorProps = (formId: string, fieldName: string) => ({
    id: buildErrorId(formId, fieldName),
    role: "alert" as const,
});
