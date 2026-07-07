"use client";

import { useState } from 'react';
import { FileCode2, Braces, Binary, Image as ImageIcon, FileType } from 'lucide-react';
import { cn } from '@/lib/utils';
import MarkdownViewer from '@/components/tools/MarkdownViewer';
import TextViewer from '@/components/tools/TextViewer';
import JsonStudio from '@/components/tools/JsonStudio';
import ImageViewer from '@/components/tools/ImageViewer';
import Base64Tool from '@/components/tools/Base64Tool';

const tabs = [
    { id: 'json' as const, label: 'JSON', icon: Braces },
    { id: 'markdown' as const, label: 'Markdown', icon: FileCode2 },
    { id: 'base64' as const, label: 'Base64', icon: Binary },
    { id: 'image' as const, label: 'Image', icon: ImageIcon },
    { id: 'text' as const, label: 'Text', icon: FileType },
];

type TabId = typeof tabs[number]['id'];

export default function UtilitiesPage() {
    const [activeTab, setActiveTab] = useState<TabId>('json');

    return (
        <div className="space-y-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="max-w-2xl">
                    <h1 className="text-3xl font-bold tracking-tight">Utilities</h1>
                    <p className="mt-2 text-ink-500">
                        JSON, Markdown, Base64, image, and text tools — everything runs in your browser.
                    </p>
                </div>

                <div className="inline-flex items-center rounded-xl bg-ink-100 p-1">
                    {tabs.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => setActiveTab(id)}
                            className={cn(
                                "inline-flex items-center whitespace-nowrap rounded-lg px-4 py-1.5 text-sm font-medium transition-all duration-200",
                                activeTab === id ? "bg-white text-ink-950 shadow-sm" : "text-ink-500 hover:text-ink-900"
                            )}
                        >
                            <Icon className="mr-2 h-4 w-4" /> {label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="animate-fade-in">
                {activeTab === 'json' && <JsonStudio />}
                {activeTab === 'markdown' && <MarkdownViewer />}
                {activeTab === 'base64' && <Base64Tool />}
                {activeTab === 'image' && <ImageViewer />}
                {activeTab === 'text' && <TextViewer />}
            </div>
        </div>
    );
}
