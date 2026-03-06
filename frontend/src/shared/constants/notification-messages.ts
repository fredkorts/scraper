export const NOTIFICATION_MESSAGES = {
    settings: {
        accountSaved: {
            message: "Profile updated",
            description: "Your account name was saved successfully.",
        },
        accountSaveFailed: {
            message: "Profile update failed",
        },
        categoryTracked: {
            message: "Category tracked",
        },
        categoryTrackFailed: {
            message: "Could not track category",
        },
        categoryUntracked: {
            message: "Tracking removed",
        },
        categoryUntrackFailed: {
            message: "Could not remove tracking",
        },
        channelCreated: {
            message: "Channel added",
        },
        channelCreateFailed: {
            message: "Could not add channel",
        },
        channelUpdated: {
            message: "Channel updated",
        },
        channelUpdateFailed: {
            message: "Could not update channel",
        },
        channelRemoved: {
            message: "Channel removed",
        },
        channelRemoveFailed: {
            message: "Could not remove channel",
        },
        intervalSaved: {
            message: "Scrape interval saved",
        },
        intervalSaveFailed: {
            message: "Could not save scrape interval",
        },
        runTriggered: {
            message: "Scrape accepted",
        },
        runTriggerFailed: {
            message: "Could not trigger scrape",
        },
    },
    session: {
        logoutFailed: {
            message: "Sign out failed",
        },
    },
} as const;
