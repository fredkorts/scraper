export const extractCookieValue = (setCookies: string[], cookieName: string): string | undefined => {
    const cookie = setCookies.find((entry) => entry.startsWith(`${cookieName}=`));

    if (!cookie) {
        return undefined;
    }

    return cookie.split(";")[0]?.split("=")[1];
};
