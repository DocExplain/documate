import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import Script from 'next/script';
import '../globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
    const messages = (await getMessages({ locale })) as any;
    return {
        title: messages.htmlTitle,
        description: messages.htmlDesc,
        alternates: {
            canonical: `https://documate.work/${locale === 'en' ? '' : locale}`,
            languages: {
                'en': 'https://documate.work',
                'fr': 'https://documate.work/fr',
                'de': 'https://documate.work/de',
                'es': 'https://documate.work/es',
                'it': 'https://documate.work/it',
                'zh': 'https://documate.work/zh',
                'hi': 'https://documate.work/hi',
                'ar': 'https://documate.work/ar',
                'pt': 'https://documate.work/pt',
                'ru': 'https://documate.work/ru',
                'bn': 'https://documate.work/bn',
            }
        }
    };
}

export default async function RootLayout({
    children,
    params: { locale }
}: {
    children: React.ReactNode;
    params: { locale: string };
}) {
    const messages = await getMessages();
    const dir = locale === 'ar' ? 'rtl' : 'ltr';

    return (
        <html lang={locale} dir={dir}>
            <head>
                <Script
                    async
                    src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9411950027978678"
                    crossOrigin="anonymous"
                    strategy="lazyOnload"
                />
            </head>
            <body className={inter.className}>
                <NextIntlClientProvider messages={messages}>
                    {children}
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
