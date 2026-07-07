"use client";

import { useState, useRef, ChangeEvent } from 'react';
import { ArrowDownUp, Copy, Check, Upload, Download, ImageIcon, Type } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

// UTF-8 safe base64 helpers
const encodeText = (text: string) => btoa(String.fromCharCode(...new TextEncoder().encode(text)));
const decodeText = (b64: string) => new TextDecoder().decode(Uint8Array.from(atob(b64), c => c.charCodeAt(0)));

function CopyButton({ value, disabled }: { value: string; disabled?: boolean }) {
    const [copied, setCopied] = useState(false);
    return (
        <Button
            variant="outline"
            size="sm"
            disabled={disabled || !value}
            onClick={async () => {
                await navigator.clipboard.writeText(value);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
            }}
        >
            {copied ? <Check className="mr-2 h-4 w-4 text-green-600" /> : <Copy className="mr-2 h-4 w-4" />}
            {copied ? 'Copied' : 'Copy'}
        </Button>
    );
}

function TextBase64() {
    const [mode, setMode] = useState<'encode' | 'decode'>('encode');
    const [input, setInput] = useState('');
    const [output, setOutput] = useState('');
    const [error, setError] = useState('');

    const run = (value: string, currentMode = mode) => {
        setInput(value);
        setError('');
        if (!value) { setOutput(''); return; }
        try {
            setOutput(currentMode === 'encode' ? encodeText(value) : decodeText(value.replace(/\s/g, '')));
        } catch {
            setOutput('');
            setError(currentMode === 'decode' ? 'Invalid Base64 input' : 'Could not encode input');
        }
    };

    const swap = () => {
        const next = mode === 'encode' ? 'decode' : 'encode';
        setMode(next);
        // Feed the previous output back as input for a natural round-trip
        run(output, next);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="inline-flex items-center rounded-xl bg-ink-100 p-1">
                    {(['encode', 'decode'] as const).map((m) => (
                        <button
                            key={m}
                            onClick={() => { setMode(m); run(input, m); }}
                            className={cn(
                                "rounded-lg px-4 py-1.5 text-sm font-medium capitalize transition-all duration-200",
                                mode === m ? "bg-white text-ink-950 shadow-sm" : "text-ink-500 hover:text-ink-900"
                            )}
                        >
                            {m}
                        </button>
                    ))}
                </div>
                <Button variant="outline" size="sm" onClick={swap} disabled={!output}>
                    <ArrowDownUp className="mr-2 h-4 w-4" /> Use output as input
                </Button>
            </div>

            {error && (
                <div className="rounded-xl border-2 border-red-200 bg-red-50 p-3">
                    <p className="text-sm font-medium text-red-600">{error}</p>
                </div>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wide text-ink-400">
                        {mode === 'encode' ? 'Plain text' : 'Base64'}
                    </p>
                    <textarea
                        value={input}
                        onChange={(e) => run(e.target.value)}
                        spellCheck={false}
                        placeholder={mode === 'encode' ? 'Type or paste text to encode...' : 'Paste Base64 to decode...'}
                        className="h-64 w-full resize-y rounded-xl border-2 border-ink-200 bg-white p-4 font-mono text-sm text-ink-800 focus:border-brand-400 focus:outline-none"
                    />
                </div>
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-bold uppercase tracking-wide text-ink-400">
                            {mode === 'encode' ? 'Base64' : 'Plain text'}
                        </p>
                        <CopyButton value={output} />
                    </div>
                    <textarea
                        value={output}
                        readOnly
                        spellCheck={false}
                        placeholder="Result appears here..."
                        className="h-64 w-full resize-y rounded-xl border-2 border-ink-200 bg-ink-50 p-4 font-mono text-sm text-ink-700 focus:outline-none"
                    />
                </div>
            </div>
        </div>
    );
}

function ImageBase64() {
    const [dataUrl, setDataUrl] = useState('');
    const [b64Input, setB64Input] = useState('');
    const [decodedUrl, setDecodedUrl] = useState('');
    const [decodeError, setDecodeError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => setDataUrl(String(reader.result ?? ''));
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleDecode = (value: string) => {
        setB64Input(value);
        setDecodeError('');
        const trimmed = value.trim();
        if (!trimmed) { setDecodedUrl(''); return; }

        const url = trimmed.startsWith('data:') ? trimmed : `data:image/png;base64,${trimmed.replace(/\s/g, '')}`;
        const probe = new Image();
        probe.onload = () => setDecodedUrl(url);
        probe.onerror = () => { setDecodedUrl(''); setDecodeError('Not a valid Base64-encoded image'); };
        probe.src = url;
    };

    const downloadDecoded = () => {
        const a = document.createElement('a');
        a.href = decodedUrl;
        const mime = decodedUrl.slice(5, decodedUrl.indexOf(';'));
        a.download = `decoded.${(mime.split('/')[1] || 'png').split('+')[0]}`;
        a.click();
    };

    const rawBase64 = dataUrl.includes(',') ? dataUrl.slice(dataUrl.indexOf(',') + 1) : dataUrl;

    return (
        <div className="grid gap-6 lg:grid-cols-2">
            {/* Image -> Base64 */}
            <div className="space-y-3 rounded-2xl border-2 border-ink-200 bg-white p-5">
                <h4 className="font-bold text-ink-900">Image → Base64</h4>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" /> Choose image
                </Button>
                {dataUrl && (
                    <>
                        <img src={dataUrl} alt="Uploaded preview" className="max-h-40 rounded-lg border border-ink-200" />
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-bold uppercase tracking-wide text-ink-400">Base64 ({rawBase64.length.toLocaleString()} chars)</p>
                            <div className="flex gap-2">
                                <CopyButton value={rawBase64} />
                                <CopyButton value={dataUrl} />
                            </div>
                        </div>
                        <p className="text-[11px] text-ink-400 -mt-2">First button copies raw Base64, second copies the full data URI.</p>
                        <textarea
                            value={rawBase64}
                            readOnly
                            className="h-40 w-full resize-y rounded-xl border-2 border-ink-200 bg-ink-50 p-3 font-mono text-xs text-ink-600 focus:outline-none"
                        />
                    </>
                )}
            </div>

            {/* Base64 -> Image */}
            <div className="space-y-3 rounded-2xl border-2 border-ink-200 bg-white p-5">
                <h4 className="font-bold text-ink-900">Base64 → Image</h4>
                <textarea
                    value={b64Input}
                    onChange={(e) => handleDecode(e.target.value)}
                    spellCheck={false}
                    placeholder="Paste Base64 or a full data:image/... URI here..."
                    className="h-40 w-full resize-y rounded-xl border-2 border-ink-200 bg-white p-3 font-mono text-xs text-ink-800 focus:border-brand-400 focus:outline-none"
                />
                {decodeError && <p className="text-sm font-medium text-red-600">{decodeError}</p>}
                {decodedUrl && (
                    <>
                        <img src={decodedUrl} alt="Decoded preview" className="max-h-48 rounded-lg border border-ink-200" />
                        <Button variant="outline" size="sm" onClick={downloadDecoded}>
                            <Download className="mr-2 h-4 w-4" /> Download image
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
}

export default function Base64Tool() {
    const [tab, setTab] = useState<'text' | 'image'>('text');

    return (
        <div className="space-y-6">
            <div className="flex justify-center">
                <div className="inline-flex items-center rounded-full bg-ink-100 p-1">
                    {([['text', 'Text ↔ Base64', Type], ['image', 'Image ↔ Base64', ImageIcon]] as const).map(([id, label, Icon]) => (
                        <button
                            key={id}
                            onClick={() => setTab(id)}
                            className={cn(
                                "inline-flex items-center rounded-full px-5 py-1.5 text-sm font-medium transition-all duration-200",
                                tab === id ? "bg-white text-brand-600 shadow-sm" : "text-ink-500 hover:text-ink-900"
                            )}
                        >
                            <Icon className="mr-2 h-4 w-4" /> {label}
                        </button>
                    ))}
                </div>
            </div>
            {tab === 'text' ? <TextBase64 /> : <ImageBase64 />}
        </div>
    );
}
