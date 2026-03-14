import type { CSSProperties } from "react";

interface GoogleIconProps {
    size?: number;
    className?: string;
}

const BASE_STYLE: CSSProperties = {
    display: "block",
    flexShrink: 0,
};

export const GoogleIcon = ({ size = 18, className }: GoogleIconProps) => {
    return (
        <svg
            aria-hidden="true"
            focusable="false"
            width={size}
            height={size}
            viewBox="0 0 18 18"
            className={className}
            style={BASE_STYLE}
        >
            <path
                fill="#4285F4"
                d="M17.64 9.2045c0-.638-.0573-1.2518-.1636-1.8409H9v3.4818h4.8436c-.2086 1.125-.8427 2.0795-1.7968 2.7182v2.2582h2.9086c1.7018-1.5668 2.6836-3.8741 2.6836-6.6173z"
            />
            <path
                fill="#34A853"
                d="M9 18c2.43 0 4.4673-.8068 5.9564-2.1782l-2.9086-2.2582c-.8068.5409-1.8409.8591-3.0478.8591-2.3477 0-4.335-1.5859-5.0432-3.716h-3.0068v2.3291C2.4314 15.9832 5.4818 18 9 18z"
            />
            <path
                fill="#FBBC05"
                d="M3.9568 10.7067c-.18-.5409-.2836-1.1186-.2836-1.7067 0-.5882.1036-1.1659.2836-1.7068V4.9641h-3.0068C.3477 6.1732 0 7.5491 0 9c0 1.4509.3477 2.8268.95 4.0359l3.0068-2.3292z"
            />
            <path
                fill="#EA4335"
                d="M9 3.5773c1.3214 0 2.5077.4541 3.4405 1.3455l2.5814-2.5814C13.4636.8918 11.4259 0 9 0 5.4818 0 2.4314 2.0168.95 4.9641l3.0068 2.3291C4.665 5.1632 6.6523 3.5773 9 3.5773z"
            />
        </svg>
    );
};
