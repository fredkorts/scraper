import { LoadingOutlined, SearchOutlined } from "@ant-design/icons";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { KeyboardEventHandler } from "react";
import { AppButton } from "../../../../components/app-button/AppButton";
import { AppInput } from "../../../../components/app-input/AppInput";
import { useDebouncedValue } from "../../../../shared/hooks/use-debounced-value";
import { defaultProductHistoryControls } from "../../history-controls";
import { useProductQuickSearchQuery } from "../../queries";
import styles from "./header-product-quick-search.module.scss";

const QUICK_SEARCH_EVENT_NAME = "pricepulse:header-overlay-open";
const MAX_QUERY_LENGTH = 100;
const MIN_QUERY_LENGTH = 2;

const normalizeQuickSearchQuery = (value: string): string =>
    value.trim().replace(/\s+/g, " ").slice(0, MAX_QUERY_LENGTH);

interface HeaderOverlayOpenEventDetail {
    source: "quick-search" | "account-menu";
}

const dispatchHeaderOverlayOpen = (source: HeaderOverlayOpenEventDetail["source"]) => {
    if (typeof window === "undefined") {
        return;
    }

    window.dispatchEvent(
        new CustomEvent<HeaderOverlayOpenEventDetail>(QUICK_SEARCH_EVENT_NAME, {
            detail: { source },
        }),
    );
};

export const HeaderProductQuickSearch = () => {
    const navigate = useNavigate();
    const inputRef = useRef<HTMLInputElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const listboxId = useId();
    const [isExpanded, setIsExpanded] = useState(false);
    const [isPanelDismissed, setIsPanelDismissed] = useState(false);
    const [queryInput, setQueryInput] = useState("");
    const [activeIndex, setActiveIndex] = useState(-1);
    const normalizedInput = useMemo(() => normalizeQuickSearchQuery(queryInput), [queryInput]);
    const debouncedQuery = useDebouncedValue(normalizedInput, 300);
    const searchQuery = useProductQuickSearchQuery({
        query: debouncedQuery,
        limit: 8,
    });
    const results = useMemo(() => searchQuery.data?.items ?? [], [searchQuery.data?.items]);
    const canShowPanel = debouncedQuery.length >= MIN_QUERY_LENGTH;
    const isPanelOpen = isExpanded && canShowPanel && !isPanelDismissed;
    const normalizedActiveIndex =
        results.length === 0 ? -1 : activeIndex < 0 || activeIndex >= results.length ? 0 : activeIndex;

    const closePanel = () => {
        setIsPanelDismissed(true);
        setActiveIndex(-1);
    };

    const collapseSearch = () => {
        closePanel();
        setIsExpanded(false);
    };

    const clearQuery = () => {
        setQueryInput("");
        setIsPanelDismissed(false);
        setActiveIndex(-1);
    };

    const openSearch = () => {
        setIsExpanded(true);
        setIsPanelDismissed(false);
        dispatchHeaderOverlayOpen("quick-search");

        queueMicrotask(() => {
            inputRef.current?.focus();
        });
    };

    const selectResult = (productId: string) => {
        collapseSearch();
        clearQuery();

        void navigate({
            to: "/app/products/$productId",
            params: {
                productId,
            },
            search: defaultProductHistoryControls,
        });
    };

    useEffect(() => {
        if (!isExpanded) {
            return;
        }

        const onDocumentPointerDown = (event: PointerEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) {
                closePanel();

                if (normalizedInput.length === 0) {
                    setIsExpanded(false);
                }
            }
        };

        document.addEventListener("pointerdown", onDocumentPointerDown);
        return () => document.removeEventListener("pointerdown", onDocumentPointerDown);
    }, [isExpanded, normalizedInput.length]);

    useEffect(() => {
        const onOverlayOpen = (event: Event) => {
            const customEvent = event as CustomEvent<HeaderOverlayOpenEventDetail>;
            if (customEvent.detail?.source === "quick-search") {
                return;
            }

            closePanel();
            if (normalizedInput.length === 0) {
                setIsExpanded(false);
            }
        };

        window.addEventListener(QUICK_SEARCH_EVENT_NAME, onOverlayOpen);
        return () => window.removeEventListener(QUICK_SEARCH_EVENT_NAME, onOverlayOpen);
    }, [normalizedInput.length]);

    const onInputKeyDown: KeyboardEventHandler<HTMLInputElement> = (event) => {
        if (event.key === "ArrowDown") {
            event.preventDefault();

            if (results.length > 0) {
                setIsPanelDismissed(false);
                setActiveIndex((previous) => {
                    const nextIndex = previous < 0 ? 0 : previous + 1;
                    return nextIndex < results.length ? nextIndex : results.length - 1;
                });
            }

            return;
        }

        if (event.key === "ArrowUp") {
            event.preventDefault();

            if (results.length > 0) {
                setIsPanelDismissed(false);
                setActiveIndex((previous) => {
                    const nextIndex = previous < 0 ? 0 : previous - 1;
                    return nextIndex > 0 ? nextIndex : 0;
                });
            }

            return;
        }

        if (event.key === "Enter" && isPanelOpen && normalizedActiveIndex >= 0) {
            event.preventDefault();
            const selected = results[normalizedActiveIndex];
            if (selected) {
                selectResult(selected.id);
            }
            return;
        }

        if (event.key === "Escape") {
            event.preventDefault();

            if (isPanelOpen) {
                closePanel();
                return;
            }

            if (normalizedInput.length === 0) {
                collapseSearch();
                return;
            }

            clearQuery();
            setIsPanelDismissed(true);
        }
    };

    const renderPanel = () => {
        if (!isPanelOpen || !canShowPanel) {
            return null;
        }

        return (
            <div className={styles.panel} role="listbox" id={listboxId} aria-label="Product quick search results">
                {searchQuery.isPending || searchQuery.isFetching ? (
                    <div className={styles.stateRow} role="status" aria-live="polite">
                        <LoadingOutlined aria-hidden="true" /> Searching products...
                    </div>
                ) : null}

                {!searchQuery.isPending && !searchQuery.isFetching && searchQuery.isError ? (
                    <div className={styles.stateRow} role="alert">
                        Unable to load products right now.
                    </div>
                ) : null}

                {!searchQuery.isPending && !searchQuery.isFetching && !searchQuery.isError && results.length === 0 ? (
                    <div className={styles.stateRow} role="status">
                        No matching products.
                    </div>
                ) : null}

                {!searchQuery.isPending && !searchQuery.isFetching && !searchQuery.isError && results.length > 0 ? (
                    <ul className={styles.resultList} aria-live="polite">
                        {results.map((item, index) => {
                            const isActive = index === normalizedActiveIndex;
                            const optionId = `${listboxId}-option-${item.id}`;

                            return (
                                <li key={item.id}>
                                    <button
                                        id={optionId}
                                        type="button"
                                        role="option"
                                        aria-selected={isActive}
                                        className={styles.resultButton}
                                        data-active={isActive ? "true" : "false"}
                                        onMouseDown={(event) => {
                                            event.preventDefault();
                                            selectResult(item.id);
                                        }}
                                        onMouseEnter={() => setActiveIndex(index)}
                                    >
                                        <img src={item.imageUrl} alt="" className={styles.thumbnail} loading="lazy" />
                                        <span className={styles.resultText}>
                                            <span className={styles.productName}>{item.name}</span>
                                            <span className={styles.categoryName}>{item.categoryName}</span>
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                ) : null}
            </div>
        );
    };

    return (
        <div className={styles.root} ref={containerRef}>
            {!isExpanded ? (
                <AppButton
                    aria-label="Open product search"
                    htmlType="button"
                    icon={<SearchOutlined aria-hidden="true" />}
                    intent="secondary"
                    onClick={openSearch}
                />
            ) : (
                <div className={styles.inputShell}>
                    <AppInput
                        ref={inputRef}
                        id="header-product-search"
                        role="combobox"
                        aria-autocomplete="list"
                        aria-controls={listboxId}
                        aria-expanded={isPanelOpen}
                        aria-activedescendant={
                            isPanelOpen && normalizedActiveIndex >= 0 && results[normalizedActiveIndex]
                                ? `${listboxId}-option-${results[normalizedActiveIndex]?.id}`
                                : undefined
                        }
                        ariaLabel="Search products"
                        className={styles.input}
                        maxLength={MAX_QUERY_LENGTH}
                        placeholder="Search products"
                        prefix={<SearchOutlined aria-hidden="true" />}
                        value={queryInput}
                        onFocus={() => {
                            if (canShowPanel) {
                                setIsPanelDismissed(false);
                            }
                        }}
                        onChange={(event) => {
                            setQueryInput(event.target.value.slice(0, MAX_QUERY_LENGTH));
                            setIsPanelDismissed(false);
                            setActiveIndex(-1);
                        }}
                        onKeyDown={onInputKeyDown}
                    />
                    {renderPanel()}
                </div>
            )}
        </div>
    );
};
