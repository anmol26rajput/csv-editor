"use client";

import { useState, useMemo, useRef, ChangeEvent } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Upload, Download, Copy, Check, Eye, Columns2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import CompressButton from './CompressButton';

const SAMPLE = `# Markdown Viewer

Write or paste **Markdown** on the left and see it rendered live.

## Features

- Live preview as you type
- Upload \`.md\` files
- Download or copy your work

> Everything runs in your browser — nothing is uploaded.

\`\`\`js
const greeting = "Hello, Markdown!";
console.log(greeting);
\`\`\`

| Syntax | Description |
| ------ | ----------- |
| Header | Title       |
| List   | Items       |
`;

type Layout = 'split' | 'edit' | 'preview';

const EDITOR_PLACEHOLDER = `Write or paste Markdown here, e.g.

# Heading

Some **bold** and *italic* text.

- List item
- Another item

> A quote

\`\`\`
code block
\`\`\``;

export default function MarkdownViewer() {
    const [markdown, setMarkdown] = useState('');
    const [layout, setLayout] = useState<Layout>('split');
    const [filename, setFilename] = useState('document.md');
    const [copied, setCopied] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const html = useMemo(() => {
        const raw = marked.parse(markdown, { async: false }) as string;
        return DOMPurify.sanitize(raw);
    }, [markdown]);

    const handleUpload = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setFilename(file.name);
        const reader = new FileReader();
        reader.onload = () => setMarkdown(String(reader.result ?? ''));
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleDownload = () => {
        const blob = new Blob([markdown], { type: 'text/markdown' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename || 'document.md';
        a.click();
        URL.revokeObjectURL(a.href);
    };

    const handleCopy = async () => {
        await navigator.clipboard.writeText(markdown);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    const layoutButtons: { id: Layout; label: string; icon: typeof Eye }[] = [
        { id: 'edit', label: 'Editor', icon: Pencil },
        { id: 'split', label: 'Split', icon: Columns2 },
        { id: 'preview', label: 'Preview', icon: Eye },
    ];

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center rounded-xl bg-ink-100 p-1">
                    {layoutButtons.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => setLayout(id)}
                            className={cn(
                                "inline-flex items-center rounded-lg px-4 py-1.5 text-sm font-medium transition-all duration-200",
                                layout === id ? "bg-white text-ink-950 shadow-sm" : "text-ink-500 hover:text-ink-900"
                            )}
                        >
                            <Icon className="mr-2 h-4 w-4" /> {label}
                        </button>
                    ))}
                </div>
                <div className="flex gap-2">
                    <input ref={fileInputRef} type="file" accept=".md,.markdown,.txt" onChange={handleUpload} className="hidden" />
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="mr-2 h-4 w-4" /> Open .md
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleCopy}>
                        {copied ? <Check className="mr-2 h-4 w-4 text-green-600" /> : <Copy className="mr-2 h-4 w-4" />}
                        {copied ? 'Copied' : 'Copy'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDownload}>
                        <Download className="mr-2 h-4 w-4" /> Download
                    </Button>
                    <CompressButton text={markdown} filename={filename || 'document.md'} />
                </div>
            </div>

            <div className={cn("grid gap-4", layout === 'split' && "lg:grid-cols-2")}>
                {layout !== 'preview' && (
                    <textarea
                        value={markdown}
                        onChange={(e) => setMarkdown(e.target.value)}
                        spellCheck={false}
                        className="w-full h-[32rem] resize-y rounded-xl border-2 border-ink-200 bg-white p-4 font-mono text-sm text-ink-800 focus:border-brand-400 focus:outline-none"
                        placeholder={EDITOR_PLACEHOLDER}
                    />
                )}
                {layout !== 'edit' && (
                    <div
                        className="markdown-preview h-[32rem] overflow-auto rounded-xl border-2 border-ink-200 bg-white p-6"
                        dangerouslySetInnerHTML={{ __html: html }}
                    />
                )}
            </div>
        </div>
    );
}
