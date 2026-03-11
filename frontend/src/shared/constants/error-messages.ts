export const DEFAULT_USER_ERROR_MESSAGE = "Something went wrong. Please try again.";

export const USER_ERROR_MESSAGES: Record<string, string> = {
    subscription_limit_reached: "You have reached your plan limit for tracked categories.",
    tracking_limit_reached: "You have reached your plan limit for tracked categories and products.",
    already_subscribed: "This category is already tracked.",
    category_not_found: "The selected category could not be found.",
    forbidden: "You do not have permission for this action.",
    validation_error: "Some inputs were invalid. Please review and try again.",
};
