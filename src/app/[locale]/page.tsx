import MainPage from '@/components/MainPage';

export default function Home({ params: { locale } }: { params: { locale: string } }) {
    return (
        <main className="min-h-screen bg-bg text-text">
            <MainPage locale={locale} />
        </main>
    );
}
