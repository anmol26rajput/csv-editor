import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Privacy — OmniFile',
};

export default function PrivacyPage() {
    return (
        <article className="max-w-2xl mx-auto py-8 space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Privacy policy</h1>
            <p className="text-ink-600 leading-relaxed">
                OmniFile is built to keep your data yours. Text files opened in the
                text editor are processed entirely in your browser and are never
                uploaded to a server.
            </p>
            <p className="text-ink-600 leading-relaxed">
                CSV, Excel, Word, and PDF files are uploaded to our processing server
                only for the operation you request. Uploaded files are stored
                temporarily to perform the edit or conversion and are not shared with
                third parties or used for any other purpose.
            </p>
            <p className="text-ink-600 leading-relaxed">
                We do not require accounts and we do not sell data. If you have
                questions, open an issue on the project&apos;s GitHub repository.
            </p>
        </article>
    );
}
