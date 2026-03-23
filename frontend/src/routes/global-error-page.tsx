import { useEffect } from "react";
import { GlobalErrorPageView } from "../features/public/views";
import { tryRecoverFromChunkLoadError } from "../shared/utils/chunk-load-recovery";

interface GlobalErrorPageProps {
    error: unknown;
    onRetry: () => void;
}

export const GlobalErrorPage = ({ error, onRetry }: GlobalErrorPageProps) => (
    <GlobalErrorPageWithChunkRecovery error={error} onRetry={onRetry} />
);

const GlobalErrorPageWithChunkRecovery = ({ error, onRetry }: GlobalErrorPageProps) => {
    useEffect(() => {
        void tryRecoverFromChunkLoadError(error, () => {
            window.location.reload();
        });
    }, [error]);

    const handleRetry = () => {
        const recovered = tryRecoverFromChunkLoadError(error, () => {
            window.location.reload();
        });

        if (!recovered) {
            onRetry();
        }
    };

    return <GlobalErrorPageView error={error} onRetry={handleRetry} />;
};
