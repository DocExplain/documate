import { createSharedPathnamesNavigation } from 'next-intl/navigation';

export const locales = ['en', 'fr', 'de', 'es', 'it', 'zh', 'hi', 'ar', 'pt', 'ru', 'bn'] as const;
export const localePrefix = 'as-needed'; // Default

export const { Link, redirect, usePathname, useRouter } =
    createSharedPathnamesNavigation({ locales, localePrefix });
