"use client";

import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname, Link } from '@/navigation';
import Tesseract from 'tesseract.js';
import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Tesseract lang map
const TESS_LANG_MAP: Record<string, string> = {
    en: 'eng', fr: 'fra', de: 'deu', es: 'spa', it: 'ita', pt: 'por', ru: 'rus', bn: 'ben', hi: 'hin', ar: 'ara', zh: 'chi_sim'
};

// Set worker path for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function MainPage({ locale }: { locale: string }) {
    const t = useTranslations();
    const router = useRouter();
    const pathname = usePathname();
    const currentLocale = useLocale();

    // State
    const [docText, setDocText] = useState('');
    const [region, setRegion] = useState('');
    const [question, setQuestion] = useState('');
    const [result, setResult] = useState('');
    const [loading, setLoading] = useState(false);
    const [ocrStatus, setOcrStatus] = useState<{ msg: string, type: 'ok' | 'err' | 'working' | null }>({ msg: '', type: null });
    const [privacyOpen, setPrivacyOpen] = useState(true);
    const [consent, setConsent] = useState<string | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    // Refs
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    // Load from LocalStorage
    useEffect(() => {
        const savedDoc = localStorage.getItem('documate_last_doc');
        const savedRegion = localStorage.getItem('documate_last_region');
        const savedConsent = localStorage.getItem('documate_ads_consent');
        if (savedConsent) setConsent(savedConsent);
        // Don't auto load doc/region to avoid confusion, user must click Load
    }, []);

    // Language switcher
    const handleLangChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const newLocale = e.target.value;
        router.replace(pathname, { locale: newLocale });
    };

    // Helper: Post-process text
    const postProcess = (s: string) => s.replace(/\u00AD/g, '').replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n');

    // File handling
    const handleFile = async (file: File) => {
        if (!file) return;
        setOcrStatus({ msg: t('loading'), type: 'working' });

        try {
            if (file.type === 'application/pdf') {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                let fullText = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const content = await page.getTextContent();
                    fullText += content.items.map((item: any) => item.str).join(' ') + '\n';
                }
                setDocText(postProcess(fullText));
                setOcrStatus({ msg: `PDF loaded (${pdf.numPages} pages)`, type: 'ok' });
            }
            else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') { // DOCX
                const arrayBuffer = await file.arrayBuffer();
                const res = await mammoth.extractRawText({ arrayBuffer });
                setDocText(postProcess(res.value));
                setOcrStatus({ msg: 'DOCX loaded', type: 'ok' });
            }
            else if (file.type.startsWith('image/')) {
                // OCR
                const lang = TESS_LANG_MAP[currentLocale] || 'eng';
                setOcrStatus({ msg: `OCR processing (${lang})...`, type: 'working' });

                // Enhance image (simple canvas contrast) - skipping complex robust version for conciseness but Tesseract handles a lot
                const { data: { text } } = await Tesseract.recognize(file, lang, {
                    logger: m => {
                        if (m.status === 'recognizing text') setOcrStatus({ msg: `OCR: ${(m.progress * 100).toFixed(0)}%`, type: 'working' });
                    }
                });
                setDocText(postProcess(text));
                setOcrStatus({ msg: 'OCR complete', type: 'ok' });
            }
            else {
                // Try text
                const text = await file.text();
                setDocText(text);
                setOcrStatus({ msg: 'Text file loaded', type: 'ok' });
            }
        } catch (e: any) {
            console.error(e);
            setOcrStatus({ msg: 'Error reading file: ' + e.message, type: 'err' });
        }
    };

    // API Call
    const callExplain = async (selectedText?: string) => {
        const txt = selectedText || docText;
        if (!txt.trim()) { alert(t('noText')); return; }

        setLoading(true);
        setResult('');

        try {
            const res = await fetch('/api/explain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: txt,
                    question: question.trim() || null,
                    lang: currentLocale,
                    region: region.trim() || null
                })
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setResult(data.answer);
        } catch (e: any) {
            setResult('Error: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    // Actions
    const handleSave = () => {
        localStorage.setItem('documate_last_doc', docText);
        localStorage.setItem('documate_last_region', region);
        alert(t('saved'));
    };

    const handleLoad = () => {
        setDocText(localStorage.getItem('documate_last_doc') || '');
        setRegion(localStorage.getItem('documate_last_region') || '');
        alert(t('loaded'));
    };

    const handleClear = (e: React.MouseEvent) => {
        e.preventDefault();
        localStorage.removeItem('documate_last_doc');
        localStorage.removeItem('documate_last_region');
        setDocText('');
        setRegion('');
        alert(t('cleared'));
    };

    // Ads
    const allowAds = () => {
        setConsent('allow');
        localStorage.setItem('documate_ads_consent', 'allow');
        // Adsbygoogle push
        try { (window as any).adsbygoogle = (window as any).adsbygoogle || []; (window as any).adsbygoogle.push({}); } catch (e) { }
    };

    const denyAds = () => {
        setConsent('deny');
        localStorage.setItem('documate_ads_consent', 'deny');
    };

    // Effect to push ad if allowed on mount
    useEffect(() => {
        if (consent === 'allow') {
            try { (window as any).adsbygoogle = (window as any).adsbygoogle || []; (window as any).adsbygoogle.push({}); } catch (e) { }
        }
    }, [consent]);


    return (
        <>
            <header className="sticky top-0 z-10 bg-white shadow-sm p-4">
                <div className="max-w-[1100px] mx-auto flex items-center gap-4">
                    <Link href="/" className="flex items-center gap-3 no-underline text-inherit hover:opacity-80 transition">
                        <div className="text-3xl">📄</div>
                        <div>
                            <h1 className="text-xl font-bold m-0 leading-tight">DocuMate</h1>
                            <p className="text-xs text-slate-500 m-0 hidden sm:block">{t('tagline')}</p>
                        </div>
                    </Link>
                    <div className="ml-auto flex items-center gap-2">
                        <label htmlFor="langSel" className="font-semibold text-sm hidden sm:inline">{t('langName')}</label>
                        <select
                            id="langSel"
                            value={currentLocale}
                            onChange={handleLangChange}
                            className="p-2 border border-slate-200 rounded-lg bg-white text-sm"
                        >
                            {['en', 'fr', 'de', 'es', 'it', 'zh', 'hi', 'ar', 'pt', 'ru', 'bn'].map(l => (
                                <option key={l} value={l}>{l.toUpperCase()}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </header>

            <div className={`max-w-[1100px] mx-auto grid gap-6 p-4 my-6 ${sidebarOpen ? 'grid-cols-1 lg:grid-cols-[1.2fr_0.8fr]' : 'grid-cols-1'}`}>

                {/* Work Card */}
                <section className="bg-white rounded-[14px] shadow-lg p-6">
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold mb-2">{t('heroTitle')}</h2>
                        <p className="text-slate-500">{t('heroSub')}</p>
                    </div>

                    {/* File Inputs */}
                    <div className="flex flex-wrap gap-3 items-center mb-2">
                        <input
                            type="file" id="file"
                            accept=".pdf,.txt,.docx,.png,.jpg,.jpeg,.webp"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
                        />
                        <label htmlFor="file" className="bg-blue-600 text-white px-4 py-2.5 rounded-xl cursor-pointer font-semibold text-sm hover:bg-blue-700 transition">
                            {t('uploadLabel')}
                        </label>

                        <button type="button" onClick={() => cameraInputRef.current?.click()} className="bg-slate-200 text-slate-900 px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-300 transition">
                            {t('btnCamera')}
                        </button>
                        <input
                            type="file" id="camera"
                            accept="image/*" capture="environment"
                            className="hidden"
                            ref={cameraInputRef}
                            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
                        />
                    </div>

                    {/* OCR Status */}
                    {ocrStatus.msg && (
                        <div className={`text-sm mb-4 flex items-center gap-2 ${ocrStatus.type === 'err' ? 'text-red-600' : ocrStatus.type === 'ok' ? 'text-green-600' : 'text-slate-500'}`}>
                            {ocrStatus.type === 'working' && <span className="w-4 h-4 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin"></span>}
                            {ocrStatus.msg}
                        </div>
                    )}

                    <label htmlFor="docText" className="block font-semibold mb-2 mt-4">{t('pasteLabel')}</label>
                    <textarea
                        id="docText"
                        ref={textAreaRef}
                        className="w-full p-3 border border-slate-200 rounded-xl min-h-[200px] focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder={t('phDocText')}
                        value={docText}
                        onChange={e => setDocText(e.target.value)}
                    ></textarea>
                    <div className="text-xs text-slate-400 mt-1">{t('pasteHint')}</div>

                    <label htmlFor="region" className="block font-semibold mb-2 mt-4">{t('regionLabel')}</label>
                    <input
                        type="text" id="region"
                        className="w-full p-3 border border-slate-200 rounded-xl"
                        placeholder={t('phRegion')}
                        value={region}
                        onChange={e => setRegion(e.target.value)}
                    />

                    <div className="flex flex-wrap gap-2 mt-4">
                        <button onClick={() => callExplain()} disabled={loading} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-semibold disabled:opacity-50">
                            {loading ? t('loading') : t('btnExplainAll')}
                        </button>
                        <button onClick={() => {
                            const sel = textAreaRef.current?.value.substring(textAreaRef.current.selectionStart, textAreaRef.current.selectionEnd);
                            if (!sel) return alert(t('nothingSel'));
                            callExplain(sel);
                        }} disabled={loading} className="bg-slate-200 text-slate-900 px-4 py-2.5 rounded-xl font-semibold disabled:opacity-50">
                            {t('btnExplainSel')}
                        </button>
                        <button onClick={handleSave} className="bg-slate-200 text-slate-900 px-4 py-2.5 rounded-xl font-semibold">
                            {t('btnSave')}
                        </button>
                        <button onClick={handleLoad} className="bg-slate-200 text-slate-900 px-4 py-2.5 rounded-xl font-semibold">
                            {t('btnLoad')}
                        </button>
                    </div>

                    <label htmlFor="question" className="block font-semibold mb-2 mt-6">{t('askLabel')}</label>
                    <input
                        type="text" id="question"
                        className="w-full p-3 border border-slate-200 rounded-xl"
                        placeholder={t('phQuestion')}
                        value={question}
                        onChange={e => setQuestion(e.target.value)}
                    />

                    <div className="flex gap-2 mt-3">
                        <button onClick={() => {
                            const sel = textAreaRef.current?.value.substring(textAreaRef.current.selectionStart, textAreaRef.current.selectionEnd);
                            callExplain(sel); // callExplain handles using 'question' state automatically if set
                        }} disabled={loading} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50">
                            {t('btnAskSel')}
                        </button>
                        <button onClick={() => callExplain()} disabled={loading} className="bg-slate-200 text-slate-900 px-4 py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50">
                            {t('btnAskAll')}
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-4">
                        <div className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full text-xs font-semibold">{t('badgeNoStore')}</div>
                        <div className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full text-xs font-semibold">{t('badgeTLS')}</div>
                        <div className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full text-xs font-semibold">{t('badgeMulti')}</div>
                    </div>

                    <h3 className="text-lg font-bold mt-6 mb-2">{t('resultTitle')}</h3>
                    <div className="whitespace-pre-wrap bg-slate-50 border border-slate-200 rounded-xl p-4 min-h-[140px]">
                        {loading ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin"></span> {t('loading')}</span> : result}
                    </div>

                    {/* Ad Slot */}
                    <div className="mt-6 p-4 border border-dashed border-slate-200 rounded-xl bg-slate-50 min-h-[280px] flex items-center justify-center text-slate-300 text-sm">
                        {/* Google AdSense placeholder - actual script loaded in Layout */}
                        <ins className="adsbygoogle"
                            style={{ display: 'block', width: '100%' }}
                            data-ad-client="ca-pub-9411950027978678"
                            data-ad-slot="PASTE_YOUR_AD_SLOT_ID" // Ideally replaced with real ID
                            data-ad-format="auto"
                            data-full-width-responsive="true"></ins>
                    </div>

                </section>

                {/* Sidebar (Privacy & Help) */}
                {sidebarOpen && (
                    <div className="flex flex-col gap-6">
                        <details className="bg-white rounded-[14px] shadow-lg p-5 text-sm text-slate-600 group" open={privacyOpen} onToggle={(e) => setPrivacyOpen(e.currentTarget.open)}>
                            <summary className="flex justify-between items-center cursor-pointer list-none font-bold text-slate-900 mb-2">
                                <span>{t('trustTitle')}</span>
                                <span className="text-blue-600 text-xs">{privacyOpen ? t('hidePrivacy') : t('showPrivacy')}</span>
                            </summary>

                            <div className="mt-2 space-y-2">
                                <p>{t('trust1')}</p>
                                <p>{t('trust2')}</p>
                                <p>{t('trust3')}</p>
                                <p className="border-l-4 border-yellow-500 pl-3 italic">{t('trust4')}</p>
                                <p className="text-yellow-700 font-semibold">{t('trust5')}</p>

                                <details className="mt-4 pt-4 border-t border-slate-100">
                                    <summary className="font-bold cursor-pointer text-slate-800 mb-2">{t('ppTitle')}</summary>
                                    <ul className="space-y-1 pl-4">
                                        <li className="list-none -ml-4"><span className="text-green-600 mr-2">✔</span> {t('pp1')}</li>
                                        <li className="list-none -ml-4"><span className="text-green-600 mr-2">✔</span> {t('pp2')}</li>
                                        <li className="list-none -ml-4"><span className="text-green-600 mr-2">✔</span> {t('pp3')}</li>
                                        <li className="list-none -ml-4"><span className="text-yellow-600 mr-2">⚠</span> {t('pp4')}</li>
                                        <li className="list-none -ml-4"><span className="text-yellow-600 mr-2">⚠</span> {t('pp5')}</li>
                                    </ul>
                                </details>
                            </div>
                        </details>

                        <div className="bg-transparent p-2">
                            <h3 className="font-bold text-lg mb-2">{t('seoTitle')}</h3>
                            <p className="text-sm text-slate-500">{t('seoText')}</p>
                        </div>

                        {/* FAQ Placeholder (can be expanded) */}
                    </div>
                )}

            </div>

            <footer className="max-w-[1100px] mx-auto p-4 mb-20 text-center text-sm text-slate-400">
                <strong>DocuMate</strong> — {t('footer1')} ·
                <button onClick={() => setConsent(null)} className="mx-2 hover:underline">{t('footerConsent')}</button> ·
                <button onClick={handleClear} className="mx-2 hover:underline">{t('footerClear')}</button> ·
                <Link href="/privacy" className="hover:underline">Privacy</Link>
            </footer>

            {/* Consent Box */}
            {(!consent) && (
                <div className="fixed bottom-3 left-3 right-3 bg-slate-900 text-white p-4 rounded-xl shadow-2xl z-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm">{t('consentText')}</div>
                    <div className="flex gap-3">
                        <button onClick={denyAds} className="px-4 py-2 bg-slate-700 rounded-lg font-semibold text-sm hover:bg-slate-600">{t('deny')}</button>
                        <button onClick={allowAds} className="px-4 py-2 bg-blue-600 rounded-lg font-semibold text-sm hover:bg-blue-500">{t('allow')}</button>
                    </div>
                </div>
            )}

            {/* Floating Toggle for Sidebar */}
            {!sidebarOpen && (
                <button
                    onClick={() => setSidebarOpen(true)}
                    className="fixed bottom-4 right-4 bg-slate-900 text-white p-3 rounded-full shadow-xl z-40 hover:scale-105 transition"
                >
                    📄
                </button>
            )}
            {sidebarOpen && (
                <button
                    onClick={() => setSidebarOpen(false)}
                    className="fixed bottom-4 right-4 bg-slate-200 text-slate-600 p-2 rounded-full shadow-lg z-40 hover:bg-slate-300 text-xs hidden lg:block"
                    title={t('hideSidebar')}
                >
                    ✖
                </button>
            )}

        </>
    );
}
