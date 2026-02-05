import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
    // A list of all locales that are supported
    locales: ['en', 'fr', 'de', 'es', 'it', 'zh', 'hi', 'ar', 'pt', 'ru', 'bn'],

    // Used when no locale matches
    defaultLocale: 'en',

    // Don't prefix the default locale
    localePrefix: 'as-needed'
});

export const config = {
    // Match only internationalized pathnames
    matcher: ['/', '/(fr|en|de|es|it|zh|hi|ar|pt|ru|bn)/:path*']
};
