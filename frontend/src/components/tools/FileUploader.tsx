"use client";

import { useState } from 'react';
import api from '@/lib/api';
import { UploadCloud, X, Loader2, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface UploadedFile {
    id: string;
    filename: string;
    file_type: string;
    size_bytes: number;
    file: string;
    created_at?: string;
}

interface FileUploaderProps {
    onUploadComplete: (file: UploadedFile) => void;
    accept?: string;
    label?: string;
}

export default function FileUploader({ onUploadComplete, accept = ".pdf", label = "Upload File" }: FileUploaderProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);

    const uploadFile = async (file: File) => {
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        // Simple type detection
        let type = 'pdf';
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (['csv', 'xlsx', 'docx'].includes(ext || '')) type = ext || 'pdf';
        formData.append('file_type', type);

        try {
            const response = await api.post('/api/v1/documents/upload/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            onUploadComplete(response.data);
        } catch (error) {
            console.error("Upload failed", error);
            alert("Upload failed");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div
            className={cn(
                "border-2 border-dashed rounded-xl p-8 transition-colors flex flex-col items-center justify-center text-center cursor-pointer",
                isDragging ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50",
                uploading && "opacity-50 pointer-events-none"
            )}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    uploadFile(e.dataTransfer.files[0]);
                }
            }}
            onClick={() => document.getElementById('uploader-input')?.click()}
        >
            <input
                type="file"
                id="uploader-input"
                className="hidden"
                accept={accept}
                onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                        uploadFile(e.target.files[0]);
                    }
                }}
            />

            {uploading ? (
                <Loader2 className="h-10 w-10 text-indigo-500 animate-spin mb-2" />
            ) : (
                <UploadCloud className="h-10 w-10 text-gray-400 mb-2" />
            )}

            <p className="text-sm font-medium text-gray-700">
                {uploading ? "Uploading..." : (isDragging ? "Drop to upload" : label)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
                {accept.replace(/\./g, '').toUpperCase()} files supported
            </p>
        </div>
    );
}

export function FileList({ files, onRemove }: { files: UploadedFile[], onRemove: (id: string) => void }) {
    if (files.length === 0) return null;
    return (
        <div className="space-y-2 mt-4">
            {files.map(file => (
                <div key={file.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 p-2 rounded-lg">
                            <FileText className="h-4 w-4 text-indigo-600" />
                        </div>
                        <div className="text-sm">
                            <p className="font-medium text-gray-900 truncate max-w-[200px]">{file.filename}</p>
                            <p className="text-xs text-gray-400">{(file.size_bytes / 1024).toFixed(1)} KB</p>
                        </div>
                    </div>
                    <button
                        onClick={() => onRemove(file.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            ))}
        </div>
    );
}
