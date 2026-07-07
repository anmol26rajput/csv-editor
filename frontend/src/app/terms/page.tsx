import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Terms — OmniFile',
};

export default function TermsPage() {
    return (
        <article className="max-w-2xl mx-auto py-8 space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Terms of service</h1>
            <p className="text-ink-600 leading-relaxed">
                OmniFile is provided free of charge, as is, without warranty of any
                kind. Always keep a backup of important files before editing them.
            </p>
            <p className="text-ink-600 leading-relaxed">
                You are responsible for the content of the files you process. Do not
                use the service for unlawful content or to infringe the rights of
                others.
            </p>
            <p className="text-ink-600 leading-relaxed">
                We may update these terms as the product evolves. Continued use of
                the service after a change constitutes acceptance of the new terms.
            </p>
        </article>
    );
}
