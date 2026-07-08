"use client";

import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { UploadCloud, ZoomIn, ZoomOut, RotateCw, Maximize2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface LoadedImage {
    url: string;
    name: string;
    type: string;
    sizeBytes: number;
    width: number;
    height: number;
}

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function ImageViewer() {
    const [image, setImage] = useState<LoadedImage | null>(null);
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadFile = (file: File) => {
        if (!file.type.startsWith('image/')) return;
        const url = URL.createObjectURL(file);
        const probe = new Image();
        probe.onload = () => {
            if (image) URL.revokeObjectURL(image.url);
            setImage({
                url,
                name: file.name,
                type: file.type,
                sizeBytes: file.size,
                width: probe.naturalWidth,
                height: probe.naturalHeight,
            });
            setZoom(1);
            setRotation(0);
        };
        probe.src = url;
    };

    const handleDrop = (e: DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) loadFile(file);
    };

    const handleSelect = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) loadFile(file);
        e.target.value = '';
    };

    if (!image) {
        return (
            <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                    "mx-auto flex max-w-2xl cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-16 transition-all duration-200",
                    isDragging ? "border-brand-400 bg-brand-50" : "border-ink-200 bg-ink-50 hover:border-brand-300 hover:bg-brand-50/50"
                )}
            >
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleSelect} className="hidden" />
                <UploadCloud className="h-10 w-10 text-brand-400" />
                <p className="font-semibold text-ink-800">Drop an image here or click to browse</p>
                <p className="text-sm text-ink-500">PNG, JPG, WebP, GIF, SVG, AVIF — viewed locally, never uploaded</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-ink-500">
                    <span className="rounded-full bg-ink-100 px-3 py-1 text-ink-800">{image.name}</span>
                    <span className="rounded-full bg-ink-100 px-3 py-1">{image.width} × {image.height}px</span>
                    <span className="rounded-full bg-ink-100 px-3 py-1">{formatBytes(image.sizeBytes)}</span>
                    <span className="rounded-full bg-ink-100 px-3 py-1">{image.type}</span>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setZoom(z => Math.max(0.1, +(z - 0.25).toFixed(2)))}>
                        <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="inline-flex min-w-16 items-center justify-center rounded-lg border-2 border-ink-200 px-2 text-sm font-medium text-ink-700">
                        {Math.round(zoom * 100)}%
                    </span>
                    <Button variant="outline" size="sm" onClick={() => setZoom(z => Math.min(8, +(z + 0.25).toFixed(2)))}>
                        <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setZoom(1); setRotation(0); }}>
                        <Maximize2 className="mr-2 h-4 w-4" /> Fit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setRotation(r => (r + 90) % 360)}>
                        <RotateCw className="mr-2 h-4 w-4" /> Rotate
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { URL.revokeObjectURL(image.url); setImage(null); }}>
                        <X className="mr-2 h-4 w-4" /> Close
                    </Button>
                </div>
            </div>

            <div
                className="flex h-[32rem] items-center justify-center overflow-auto rounded-xl border-2 border-ink-200"
                style={{
                    backgroundImage:
                        'linear-gradient(45deg, #eee 25%, transparent 25%), linear-gradient(-45deg, #eee 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #eee 75%), linear-gradient(-45deg, transparent 75%, #eee 75%)',
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0',
                    backgroundColor: '#fff',
                }}
            >
                <img
                    src={image.url}
                    alt={image.name}
                    className="max-w-none transition-transform duration-150"
                    style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
                />
            </div>
        </div>
    );
}
