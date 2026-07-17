"use client";

import { useState, useRef, useEffect, useCallback, DragEvent, ChangeEvent, PointerEvent } from 'react';
import { UploadCloud, ZoomIn, ZoomOut, RotateCw, Maximize2, X, Crop, Download } from 'lucide-react';
import { saveAs } from 'file-saver';
import { Button } from '@/components/ui/Button';
import { cn, formatBytes } from '@/lib/utils';

interface LoadedImage {
    el: HTMLImageElement;
    url: string;
    name: string;
    type: string;
    sizeBytes: number;
    width: number;
    height: number;
}

interface Rect {
    x: number;
    y: number;
    w: number;
    h: number;
}

const FORMATS = [
    { mime: 'image/jpeg', label: 'JPG', ext: 'jpg', lossy: true },
    { mime: 'image/png', label: 'PNG', ext: 'png', lossy: false },
    { mime: 'image/webp', label: 'WebP', ext: 'webp', lossy: true },
] as const;

type Mime = typeof FORMATS[number]['mime'];

export default function ImageViewer() {
    const [image, setImage] = useState<LoadedImage | null>(null);
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Edit state — crop is in natural image pixels, so it survives zoom and rotation.
    const [crop, setCrop] = useState<Rect | null>(null);
    const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
    const [outW, setOutW] = useState(0);
    const [outH, setOutH] = useState(0);
    const [lockAspect, setLockAspect] = useState(true);
    const [format, setFormat] = useState<Mime>('image/jpeg');
    const [quality, setQuality] = useState(0.85);
    const [outSize, setOutSize] = useState<number | null>(null);
    const [working, setWorking] = useState(false);

    const source: Rect = crop ?? { x: 0, y: 0, w: image?.width ?? 0, h: image?.height ?? 0 };
    const lossy = FORMATS.find(f => f.mime === format)!.lossy;

    const loadFile = (file: File) => {
        if (!file.type.startsWith('image/')) return;
        const url = URL.createObjectURL(file);
        const probe = new Image();
        probe.onload = () => {
            if (image) URL.revokeObjectURL(image.url);
            setImage({
                el: probe,
                url,
                name: file.name,
                type: file.type,
                sizeBytes: file.size,
                width: probe.naturalWidth,
                height: probe.naturalHeight,
            });
            setZoom(1);
            setRotation(0);
            setCrop(null);
            setOutW(probe.naturalWidth);
            setOutH(probe.naturalHeight);
            setFormat(file.type === 'image/png' ? 'image/png' : 'image/jpeg');
        };
        probe.src = url;
    };

    // Crop, resize, convert and compress are all one canvas draw: take a source
    // rect, scale it into an output of the requested size, encode at the
    // requested type and quality.
    const renderBlob = useCallback(async (): Promise<Blob | null> => {
        if (!image || outW < 1 || outH < 1) return null;
        const swap = rotation === 90 || rotation === 270;
        const canvas = document.createElement('canvas');
        canvas.width = swap ? outH : outW;
        canvas.height = swap ? outW : outH;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        // JPEG has no alpha channel — transparent pixels would encode as black.
        if (format === 'image/jpeg') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.drawImage(image.el, source.x, source.y, source.w, source.h, -outW / 2, -outH / 2, outW, outH);
        return new Promise(resolve => canvas.toBlob(resolve, format, quality));
    }, [image, source.x, source.y, source.w, source.h, outW, outH, rotation, format, quality]);

    // Show the real output size rather than an estimate — it is the same encode
    // the download does, just thrown away.
    useEffect(() => {
        if (!image) return;
        let cancelled = false;
        const timer = setTimeout(async () => {
            const blob = await renderBlob();
            if (!cancelled) setOutSize(blob?.size ?? null);
        }, 250);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [image, renderBlob]);

    const download = async () => {
        if (!image) return;
        setWorking(true);
        try {
            const blob = await renderBlob();
            if (!blob) return;
            const ext = FORMATS.find(f => f.mime === format)!.ext;
            saveAs(blob, `${image.name.replace(/\.[^.]+$/, '')}.${ext}`);
        } finally {
            setWorking(false);
        }
    };

    // offsetX/offsetY are in the image's own coordinate space — the browser
    // undoes the zoom and rotation transforms for us.
    const pointAt = (e: PointerEvent<HTMLImageElement>) => ({
        x: Math.min(Math.max(e.nativeEvent.offsetX, 0), image!.width),
        y: Math.min(Math.max(e.nativeEvent.offsetY, 0), image!.height),
    });

    const startCrop = (e: PointerEvent<HTMLImageElement>) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragStart(pointAt(e));
        setCrop(null);
    };

    const moveCrop = (e: PointerEvent<HTMLImageElement>) => {
        if (!dragStart) return;
        const p = pointAt(e);
        setCrop({
            x: Math.min(dragStart.x, p.x),
            y: Math.min(dragStart.y, p.y),
            w: Math.abs(p.x - dragStart.x),
            h: Math.abs(p.y - dragStart.y),
        });
    };

    const endCrop = () => {
        if (!dragStart || !image) return;
        setDragStart(null);
        setCrop(current => {
            // A click without a drag means "clear the crop", not a 1px crop.
            if (!current || current.w < 8 || current.h < 8) {
                setOutW(image.width);
                setOutH(image.height);
                return null;
            }
            const next = {
                x: Math.round(current.x),
                y: Math.round(current.y),
                w: Math.round(current.w),
                h: Math.round(current.h),
            };
            setOutW(next.w);
            setOutH(next.h);
            return next;
        });
    };

    const changeWidth = (value: number) => {
        setOutW(value);
        if (lockAspect && value > 0) setOutH(Math.max(1, Math.round(value * (source.h / source.w))));
    };

    const changeHeight = (value: number) => {
        setOutH(value);
        if (lockAspect && value > 0) setOutW(Math.max(1, Math.round(value * (source.w / source.h))));
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
                <p className="text-sm text-ink-500">PNG, JPG, WebP, GIF, SVG, AVIF — crop, resize, compress and convert, all in your browser</p>
            </div>
        );
    }

    const resized = outW !== source.w || outH !== source.h;
    const saved = outSize !== null ? 1 - outSize / image.sizeBytes : 0;

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
                <div
                    className="relative shrink-0 transition-transform duration-150"
                    style={{ width: image.width, height: image.height, transform: `scale(${zoom}) rotate(${rotation}deg)` }}
                >
                    <img
                        src={image.url}
                        alt={image.name}
                        draggable={false}
                        onPointerDown={startCrop}
                        onPointerMove={moveCrop}
                        onPointerUp={endCrop}
                        className="block max-w-none cursor-crosshair select-none"
                        style={{ width: image.width, height: image.height }}
                    />
                    {crop && crop.w > 0 && crop.h > 0 && (
                        <div
                            className="pointer-events-none absolute border-2 border-brand-500"
                            style={{
                                left: crop.x,
                                top: crop.y,
                                width: crop.w,
                                height: crop.h,
                                boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
                            }}
                        />
                    )}
                </div>
            </div>

            <div className="grid gap-5 rounded-2xl border-2 border-ink-200 bg-ink-50 p-5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">
                        <Crop className="h-3.5 w-3.5" /> Crop
                    </p>
                    {crop ? (
                        <>
                            <p className="font-mono text-sm text-ink-800">{crop.w} × {crop.h}px</p>
                            <button
                                onClick={() => { setCrop(null); setOutW(image.width); setOutH(image.height); }}
                                className="text-xs font-medium text-brand-700 hover:text-brand-800"
                            >
                                Clear crop
                            </button>
                        </>
                    ) : (
                        <p className="text-sm text-ink-500">Drag a box on the image to crop.</p>
                    )}
                </div>

                <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Resize</p>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            min={1}
                            value={outW}
                            onChange={(e) => changeWidth(Number(e.target.value))}
                            aria-label="Output width in pixels"
                            className="w-20 rounded-lg border-2 border-ink-200 bg-white px-2 py-1 text-sm tabular-nums focus:border-brand-400 focus:outline-none"
                        />
                        <span className="text-ink-400">×</span>
                        <input
                            type="number"
                            min={1}
                            value={outH}
                            onChange={(e) => changeHeight(Number(e.target.value))}
                            aria-label="Output height in pixels"
                            className="w-20 rounded-lg border-2 border-ink-200 bg-white px-2 py-1 text-sm tabular-nums focus:border-brand-400 focus:outline-none"
                        />
                    </div>
                    <label className="flex items-center gap-1.5 text-xs text-ink-500">
                        <input type="checkbox" checked={lockAspect} onChange={(e) => setLockAspect(e.target.checked)} />
                        Lock aspect ratio
                    </label>
                </div>

                <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Convert</p>
                    <div className="inline-flex items-center rounded-lg bg-ink-100 p-1">
                        {FORMATS.map(f => (
                            <button
                                key={f.mime}
                                onClick={() => setFormat(f.mime)}
                                className={cn(
                                    "rounded-md px-3 py-1 text-xs font-medium transition-all duration-200",
                                    format === f.mime ? "bg-white text-ink-950 shadow-sm" : "text-ink-500 hover:text-ink-900"
                                )}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                    {format === 'image/png' && <p className="text-xs text-ink-400">PNG is lossless — resize to shrink it.</p>}
                </div>

                <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Compress</p>
                    <input
                        type="range"
                        min={5}
                        max={100}
                        value={Math.round(quality * 100)}
                        disabled={!lossy}
                        onChange={(e) => setQuality(Number(e.target.value) / 100)}
                        aria-label="Compression quality"
                        className="w-full accent-brand-600 disabled:opacity-40"
                    />
                    <p className="text-xs text-ink-500">
                        {lossy ? `Quality ${Math.round(quality * 100)}%` : 'Not adjustable for PNG'}
                    </p>
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-brand-200 bg-brand-50 p-4">
                <div className="text-sm text-ink-600">
                    <span className="font-semibold text-ink-900">{outW} × {outH}px</span>
                    {crop && <span className="text-ink-500"> · cropped</span>}
                    {resized && <span className="text-ink-500"> · resized</span>}
                    {rotation !== 0 && <span className="text-ink-500"> · rotated {rotation}°</span>}
                    {outSize !== null && (
                        <span className="ml-2 font-mono text-xs">
                            {formatBytes(image.sizeBytes)} → {formatBytes(outSize)}
                            <span className={cn("ml-1.5 font-medium", saved > 0.005 ? "text-brand-700" : "text-ink-400")}>
                                {saved > 0.005
                                    ? `${Math.round(saved * 100)}% smaller`
                                    : saved < -0.005
                                        ? `${Math.round(-saved * 100)}% bigger`
                                        : 'about the same'}
                            </span>
                        </span>
                    )}
                </div>
                <Button onClick={download} isLoading={working}>
                    <Download className="mr-2 h-4 w-4" /> Download
                </Button>
            </div>
        </div>
    );
}
