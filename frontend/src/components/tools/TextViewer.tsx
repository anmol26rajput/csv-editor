"use client";

import { useState, useMemo, useRef, ChangeEvent } from 'react';
import { Upload, Download, Copy, Check, WrapText, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import CompressButton from './CompressButton';

export default function TextViewer() {
    const [text, setText] = useState('');
    const [filename, setFilename] = useState('untitled.txt');
    const [wrap, setWrap] = useState(true);
    const [copied, setCopied] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const stats = useMemo(() => {
        const lines = text ? text.split('\n').length : 0;
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const chars = text.length;
        const bytes = new Blob([text]).size;
        return { lines, words, chars, bytes };
    }, [text]);

    const lineNumbers = useMemo(
        () => Array.from({ length: Math.max(stats.lines, 1) }, (_, i) => i + 1).join('\n'),
        [stats.lines]
    );

    const handleUpload = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setFilename(file.name);
        const reader = new FileReader();
        reader.onload = () => setText(String(reader.result ?? ''));
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleDownload = () => {
        const blob = new Blob([text], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename || 'untitled.txt';
        a.click();
        URL.revokeObjectURL(a.href);
    };

    const handleCopy = async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-ink-500">
                    {([['Lines', stats.lines], ['Words', stats.words], ['Characters', stats.chars], ['Bytes', stats.bytes]] as const).map(([label, value]) => (
                        <span key={label} className="rounded-full bg-ink-100 px-3 py-1">
                            {label}: <span className="text-ink-800">{value.toLocaleString()}</span>
                        </span>
                    ))}
                </div>
                <div className="flex gap-2">
                    <input ref={fileInputRef} type="file" accept=".txt,.log,.csv,.md,.json,.xml,.yml,.yaml,.ini,.conf,text/*" onChange={handleUpload} className="hidden" />
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="mr-2 h-4 w-4" /> Open file
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setWrap(w => !w)}
                        className={cn(wrap && "bg-brand-50 border-brand-200 text-brand-700")}
                    >
                        <WrapText className="mr-2 h-4 w-4" /> Wrap
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleCopy} disabled={!text}>
                        {copied ? <Check className="mr-2 h-4 w-4 text-green-600" /> : <Copy className="mr-2 h-4 w-4" />}
                        {copied ? 'Copied' : 'Copy'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDownload} disabled={!text}>
                        <Download className="mr-2 h-4 w-4" /> Download
                    </Button>
                    <CompressButton text={text} filename={filename} />
                    <Button variant="outline" size="sm" onClick={() => { setText(''); setFilename('untitled.txt'); }} disabled={!text}>
                        <Trash2 className="mr-2 h-4 w-4" /> Clear
                    </Button>
                </div>
            </div>

            <div className="flex rounded-xl border-2 border-ink-200 bg-white overflow-hidden">
                <pre className="select-none border-r border-ink-100 bg-ink-50 px-3 py-4 text-right font-mono text-sm leading-6 text-ink-300">
                    {lineNumbers}
                </pre>
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    spellCheck={false}
                    wrap={wrap ? 'soft' : 'off'}
                    placeholder="Paste text here or open a file to view it..."
                    className={cn(
                        "h-[32rem] w-full resize-y bg-white p-4 font-mono text-sm leading-6 text-ink-800 focus:outline-none",
                        !wrap && "overflow-x-auto whitespace-pre"
                    )}
                />
            </div>
        </div>
    );
}
