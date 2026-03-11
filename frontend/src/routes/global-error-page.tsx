import { GlobalErrorPageView } from "../features/public/views";

interface GlobalErrorPageProps {
    error: unknown;
    onRetry: () => void;
}

export const GlobalErrorPage = ({ error, onRetry }: GlobalErrorPageProps) => (
    <GlobalErrorPageView error={error} onRetry={onRetry} />
);
