import { act, renderHook } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APP_THEME_STORAGE_KEY } from "../constants/theme.constants";
import { useAppThemePreference } from "./use-app-theme-preference";
import { bootstrapThemeBeforeRender } from "../theme-preference";

type MediaListener = (event: MediaQueryListEvent) => void;

const createMatchMediaMock = (initialMatches: boolean) => {
    let matches = initialMatches;
    const listeners = new Set<MediaListener>();

    const mediaQueryList = {
        get matches() {
            return matches;
        },
        media: "(prefers-color-scheme: dark)",
        onchange: null,
        addEventListener: (_event: "change", listener: MediaListener) => {
            listeners.add(listener);
        },
        removeEventListener: (_event: "change", listener: MediaListener) => {
            listeners.delete(listener);
        },
        addListener: (listener: MediaListener) => {
            listeners.add(listener);
        },
        removeListener: (listener: MediaListener) => {
            listeners.delete(listener);
        },
        dispatchEvent: () => false,
    };

    return {
        matchMedia: vi.fn(() => mediaQueryList),
        emitChange: (nextMatches: boolean) => {
            matches = nextMatches;
            const event = { matches: nextMatches, media: mediaQueryList.media } as MediaQueryListEvent;
            listeners.forEach((listener) => listener(event));
        },
        getListenerCount: () => listeners.size,
    };
};

type LocalStorageMock = {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
    removeItem: (key: string) => void;
    clear: () => void;
};

const createLocalStorageMock = (): LocalStorageMock => {
    const store = new Map<string, string>();

    return {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
            store.set(key, value);
        },
        removeItem: (key: string) => {
            store.delete(key);
        },
        clear: () => {
            store.clear();
        },
    };
};

let localStorageMock: LocalStorageMock;

beforeEach(() => {
    localStorageMock = createLocalStorageMock();
    vi.stubGlobal("localStorage", localStorageMock);
    Object.defineProperty(window, "localStorage", {
        configurable: true,
        value: localStorageMock,
    });
});

afterEach(() => {
    localStorageMock.clear();
    delete document.documentElement.dataset.theme;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe("useAppThemePreference", () => {
    it("loads persisted preference from storage", () => {
        window.localStorage.setItem(APP_THEME_STORAGE_KEY, "dark");
        const mediaQueryMock = createMatchMediaMock(false);
        vi.stubGlobal("matchMedia", mediaQueryMock.matchMedia);

        const { result } = renderHook(() => useAppThemePreference());

        expect(result.current.themePreference).toBe("dark");
        expect(result.current.isDarkMode).toBe(true);
    });

    it("falls back to system preference when no stored preference exists", () => {
        const mediaQueryMock = createMatchMediaMock(true);
        vi.stubGlobal("matchMedia", mediaQueryMock.matchMedia);

        const { result } = renderHook(() => useAppThemePreference());

        expect(result.current.themePreference).toBeNull();
        expect(result.current.isDarkMode).toBe(true);
    });

    it("writes explicit preference and updates html theme dataset when toggled", () => {
        const mediaQueryMock = createMatchMediaMock(false);
        vi.stubGlobal("matchMedia", mediaQueryMock.matchMedia);

        const { result } = renderHook(() => useAppThemePreference());

        act(() => {
            result.current.setDarkMode(true);
        });

        expect(window.localStorage.getItem(APP_THEME_STORAGE_KEY)).toBe("dark");
        expect(document.documentElement.dataset.theme).toBe("dark");
        expect(result.current.isDarkMode).toBe(true);
    });

    it("reacts to system changes when user preference is not explicit", () => {
        const mediaQueryMock = createMatchMediaMock(false);
        vi.stubGlobal("matchMedia", mediaQueryMock.matchMedia);

        const { result } = renderHook(() => useAppThemePreference());
        expect(result.current.isDarkMode).toBe(false);

        act(() => {
            mediaQueryMock.emitChange(true);
        });

        expect(result.current.isDarkMode).toBe(true);
    });

    it("cleans up matchMedia listeners on unmount", () => {
        const mediaQueryMock = createMatchMediaMock(false);
        vi.stubGlobal("matchMedia", mediaQueryMock.matchMedia);

        const { unmount } = renderHook(() => useAppThemePreference());

        expect(mediaQueryMock.getListenerCount()).toBe(1);

        unmount();

        expect(mediaQueryMock.getListenerCount()).toBe(0);
    });

    it("stays stable under strict mode renders", () => {
        const mediaQueryMock = createMatchMediaMock(false);
        vi.stubGlobal("matchMedia", mediaQueryMock.matchMedia);

        const { result } = renderHook(() => useAppThemePreference(), {
            wrapper: StrictMode,
        });

        expect(result.current.isDarkMode).toBe(false);
        expect(result.current.themePreference).toBeNull();
        expect(document.documentElement.dataset.theme).toBe("light");
    });
});

describe("bootstrapThemeBeforeRender", () => {
    it("applies a dark theme attribute when system is dark and no explicit preference exists", () => {
        const mediaQueryMock = createMatchMediaMock(true);
        vi.stubGlobal("matchMedia", mediaQueryMock.matchMedia);

        bootstrapThemeBeforeRender();

        expect(document.documentElement.dataset.theme).toBe("dark");
    });
});
