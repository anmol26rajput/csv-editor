"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { UploadedFile } from './FileUploader';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { BubbleMenu as BubbleMenuExtension } from '@tiptap/extension-bubble-menu';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Gapcursor from '@tiptap/extension-gapcursor';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Loader2, Download, Bold, Italic, Strikethrough, Heading1, Heading2, Heading3, List, ListOrdered, Image as ImageIcon, Trash2, AlignLeft, AlignCenter, AlignRight, FilePlus, FileMinus } from 'lucide-react';
import mammoth from 'mammoth';
import { asBlob } from 'html-docx-js-typescript';
import { saveAs } from 'file-saver';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { v4 as uuidv4 } from 'uuid';

interface DocxRichEditorProps {
    file: UploadedFile;
}

export default function DocxRichEditor({ file }: DocxRichEditorProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeImage, setActiveImage] = useState<HTMLElement | null>(null);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Gapcursor,
            Image.configure({
                inline: true,
                allowBase64: true,
                HTMLAttributes: {
                    class: 'rounded-md shadow-sm transition-all duration-200 hover:shadow-md cursor-pointer',
                },
            }),
            TextStyle,
            Color,
        ],
        content: '',
        immediatelyRender: false,
        editorProps: {
            attributes: {
                // Tailwind classes for the A4 page look
                class: 'prose prose-sm sm:prose-base focus:outline-none max-w-none bg-white shadow-lg border border-gray-200 mx-auto my-8 relative',
                style: 'width: 21cm; min-height: 29.7cm; padding: 2.54cm;'
            },
            handleDOMEvents: {
                click: (view, event) => {
                    const target = event.target as HTMLElement;
                    if (target.nodeName === 'IMG') {
                        setActiveImage(target);
                    } else {
                        setActiveImage(null);
                    }
                    return false;
                },
            },
        },
    });

    const addPageBreak = useCallback(() => {
        if (!editor) return;
        editor.chain().focus().insertContent('<hr class="page-break" />').run();
    }, [editor]);

    const addImage = useCallback(() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e: any) => {
            const file = e.target.files?.[0];
            if (!file || !editor) return;

            const reader = new FileReader();
            reader.onload = (readerEvent) => {
                editor.chain().focus().setImage({ src: readerEvent.target?.result as string }).run();
            };
            reader.readAsDataURL(file);
        };
        input.click();
    }, [editor]);

    const resizeImage = (scale: number) => {
        if (!activeImage) return;
        const currentWidth = activeImage.clientWidth;
        activeImage.style.width = `${currentWidth * scale}px`;
        activeImage.style.height = 'auto'; // Maintain aspect ratio
    };

    const deleteCurrentPage = useCallback(() => {
        if (!editor) return;

        const { state, view } = editor;
        const { selection } = state;
        const { $from } = selection;

        let startPos = 0;
        let endPos = state.doc.content.size;

        // Find previous page break
        state.doc.nodesBetween(0, $from.pos, (node, pos) => {
            if (node.type.name === 'horizontalRule') {
                startPos = pos + node.nodeSize;
            }
        });

        // Find next page break
        let foundNext = false;
        state.doc.nodesBetween($from.pos, state.doc.content.size, (node, pos) => {
            if (!foundNext && node.type.name === 'horizontalRule') {
                endPos = pos;
                foundNext = true;
            }
        });

        // Delete the calculated chunk
        editor.chain().focus().deleteRange({ from: startPos, to: endPos }).run();
    }, [editor]);

    useEffect(() => {
        let isMounted = true;

        async function loadDocument() {
            setLoading(true);
            try {
                // Fetch the DOCX as arraybuffer
                const response = await api.get(file.url, { responseType: 'arraybuffer' });
                const arrayBuffer = response.data;

                if (!isMounted) return;

                // Configure mammoth to convert embedded images to base64 inline images
                const options = {
                    convertImage: mammoth.images.imgElement(function (image) {
                        return image.read("base64").then(function (imageBuffer) {
                            return {
                                src: "data:" + image.contentType + ";base64," + imageBuffer
                            };
                        });
                    })
                };

                // Convert to HTML using mammoth
                const result = await mammoth.convertToHtml({ arrayBuffer }, options);

                if (isMounted && editor) {
                    editor.commands.setContent(result.value);
                }
            } catch (err: any) {
                console.error("Failed to load document:", err);
                if (isMounted) {
                    setError(err.message || "Failed to load document");
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        if (file && editor) {
            loadDocument();
        }

        return () => {
            isMounted = false;
        };
    }, [file, editor]);

    const handleExport = async () => {
        if (!editor) return;
        const html = editor.getHTML();

        try {
            // Convert HTML back to DOCX
            // Wrap in basic HTML structure for better formatting
            const fullHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>${html}</body></html>`;
            const blob = await asBlob(fullHtml);

            // Trigger download
            saveAs(blob as Blob, `edited_${file.filename}`);
        } catch (err) {
            console.error("Export failed:", err);
            alert("Failed to export document.");
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border shadow-sm min-h-[600px]">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                <p className="text-gray-600 font-medium">Extracting text and images...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 bg-red-50 text-red-600 rounded-2xl border border-red-200">
                <h3 className="font-bold text-lg mb-2">Error Loading Document</h3>
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 p-3 bg-white border-b shadow-sm">
                {/* Text Formatting */}
                <div className="flex items-center gap-1 border-r pr-2">
                    <button
                        onClick={() => editor?.chain().focus().toggleBold().run()}
                        className={cn("p-2 rounded hover:bg-gray-100 transition-colors", editor?.isActive('bold') && 'bg-indigo-100 text-indigo-700')}
                        title="Bold"
                    >
                        <Bold className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => editor?.chain().focus().toggleItalic().run()}
                        className={cn("p-2 rounded hover:bg-gray-100 transition-colors", editor?.isActive('italic') && 'bg-indigo-100 text-indigo-700')}
                        title="Italic"
                    >
                        <Italic className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => editor?.chain().focus().toggleStrike().run()}
                        className={cn("p-2 rounded hover:bg-gray-100 transition-colors", editor?.isActive('strike') && 'bg-indigo-100 text-indigo-700')}
                        title="Strikethrough"
                    >
                        <Strikethrough className="w-4 h-4" />
                    </button>
                </div>

                {/* Headers */}
                <div className="flex items-center gap-1 border-r pr-2">
                    <button
                        onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
                        className={cn("p-2 rounded hover:bg-gray-100 transition-colors font-bold", editor?.isActive('heading', { level: 1 }) && 'bg-indigo-100 text-indigo-700')}
                        title="Heading 1"
                    >
                        H1
                    </button>
                    <button
                        onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                        className={cn("p-2 rounded hover:bg-gray-100 transition-colors font-bold", editor?.isActive('heading', { level: 2 }) && 'bg-indigo-100 text-indigo-700')}
                        title="Heading 2"
                    >
                        H2
                    </button>
                    <button
                        onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
                        className={cn("p-2 rounded hover:bg-gray-100 transition-colors font-bold", editor?.isActive('heading', { level: 3 }) && 'bg-indigo-100 text-indigo-700')}
                        title="Heading 3"
                    >
                        H3
                    </button>
                </div>

                {/* Lists */}
                <div className="flex items-center gap-1 border-r pr-2">
                    <button
                        onClick={() => editor?.chain().focus().toggleBulletList().run()}
                        className={cn("p-2 rounded hover:bg-gray-100 transition-colors", editor?.isActive('bulletList') && 'bg-indigo-100 text-indigo-700')}
                        title="Bullet List"
                    >
                        <List className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                        className={cn("p-2 rounded hover:bg-gray-100 transition-colors", editor?.isActive('orderedList') && 'bg-indigo-100 text-indigo-700')}
                        title="Numbered List"
                    >
                        <ListOrdered className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex-1" />

                {/* Advanced Tools */}
                <div className="flex items-center gap-1 border-r pr-2 mr-2">
                    <button
                        onClick={addImage}
                        className="p-2 rounded hover:bg-gray-100 transition-colors text-gray-600 hover:text-indigo-600"
                        title="Insert Image"
                    >
                        <ImageIcon className="w-4 h-4" />
                    </button>
                    <button
                        onClick={addPageBreak}
                        className="p-2 rounded hover:bg-gray-100 transition-colors text-gray-600 hover:text-indigo-600"
                        title="Add Page Break"
                    >
                        <FilePlus className="w-4 h-4" />
                    </button>
                    <button
                        onClick={deleteCurrentPage}
                        className="p-2 rounded hover:bg-red-50 transition-colors text-red-500 hover:text-red-700"
                        title="Delete Current Page"
                    >
                        <FileMinus className="w-4 h-4" />
                    </button>
                </div>

                {/* Export Action */}
                <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                >
                    <Download className="w-4 h-4" /> Export DOCX
                </button>
            </div>

            {/* Floating Image Menu */}
            {editor && (
                <BubbleMenu
                    editor={editor}
                    shouldShow={({ editor }) => editor.isActive('image')}
                >
                    <div className="flex items-center gap-1 p-1 bg-white border border-gray-200 shadow-xl rounded-lg">
                        <button
                            onClick={() => resizeImage(1.2)}
                            className="p-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded"
                            title="Increase Size"
                        >
                            +20%
                        </button>
                        <button
                            onClick={() => resizeImage(0.8)}
                            className="p-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded"
                            title="Decrease Size"
                        >
                            -20%
                        </button>
                        <div className="w-px h-4 bg-gray-300 mx-1" />
                        <button
                            onClick={() => editor.chain().focus().deleteSelection().run()}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                            title="Delete Image"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </BubbleMenu>
            )}

            {/* Editor Canvas Container (Background) */}
            <div className="flex-1 bg-gray-100 overflow-y-auto w-full flex justify-center pb-12">
                <EditorContent editor={editor} className="w-full flex justify-center" />
            </div>

            <style jsx global>{`
                /* Tiptap overrides for images inside the editor */
                .ProseMirror img {
                    max-width: 100%;
                    height: auto;
                    display: inline-block;
                    margin: 0.5rem 0;
                }
                .ProseMirror img.ProseMirror-selectednode {
                    outline: 3px solid #6366f1;
                    outline-offset: 2px;
                }
                /* Visual Page Breaks */
                .ProseMirror hr.page-break {
                    border: 0;
                    height: 40px;
                    background-image: linear-gradient(to right, transparent, #e5e7eb 10%, #e5e7eb 90%, transparent);
                    background-size: 100% 2px;
                    background-position: center;
                    background-repeat: no-repeat;
                    margin: 40px -2.54cm; /* pull out to page edges */
                    position: relative;
                    page-break-after: always;
                    opacity: 0.6;
                }
                .ProseMirror hr.page-break::after {
                    content: "Page Break";
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: #f3f4f6;
                    padding: 2px 12px;
                    border-radius: 12px;
                    font-size: 11px;
                    color: #9ca3af;
                    letter-spacing: 0.05em;
                    text-transform: uppercase;
                }
            `}</style>
        </div>
    );
}
