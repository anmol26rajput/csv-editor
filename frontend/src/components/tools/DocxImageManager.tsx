"use client";

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Upload, X, RefreshCw, Download, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { UploadedFile } from './FileUploader';

interface DocxImage {
    id: string;
    data: string;
    format: string;
    size: number;
    width: number;
    height: number;
    filename: string;
}

export default function DocxImageManager({ file }: { file: UploadedFile }) {
    const [images, setImages] = useState<DocxImage[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedImage, setSelectedImage] = useState<DocxImage | null>(null);
    const [result, setResult] = useState<UploadedFile | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        loadImages();
    }, [file]);

    const loadImages = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await api.get(`/api/v1/tools/docx/${file.id}/images/`);
            setImages(response.data.images || []);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to load images');
        } finally {
            setLoading(false);
        }
    };

    const handleAddImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;

        const imageFile = e.target.files[0];
        setUploading(true);
        setError('');

        const formData = new FormData();
        formData.append('file_id', file.id);
        formData.append('image', imageFile);
        formData.append('position', 'end');

        try {
            const response = await api.post('/api/v1/tools/docx/images/add/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setResult(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to add image');
        } finally {
            setUploading(false);
        }
    };

    const handleReplaceImage = async (imageId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;

        const imageFile = e.target.files[0];
        setUploading(true);
        setError('');

        const formData = new FormData();
        formData.append('file_id', file.id);
        formData.append('image_id', imageId);
        formData.append('image', imageFile);

        try {
            const response = await api.post('/api/v1/tools/docx/images/replace/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setResult(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to replace image');
        } finally {
            setUploading(false);
        }
    };

    const handleRemoveImage = async (imageId: string) => {
        if (!confirm('Are you sure you want to remove this image?')) return;

        setUploading(true);
        setError('');

        try {
            const response = await api.post('/api/v1/tools/docx/images/remove/', {
                file_id: file.id,
                image_id: imageId
            });
            setResult(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to remove image');
        } finally {
            setUploading(false);
        }
    };

    if (result) {
        return (
            <div className="text-center py-10 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200 shadow-lg">
                <div className="mb-4 inline-flex items-center justify-center w-16 h-16 bg-blue-500 rounded-full">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h3 className="text-2xl font-bold text-blue-800 mb-2">Images Updated!</h3>
                <p className="text-sm text-blue-600 mb-6">Your document has been updated successfully</p>
                <Button
                    onClick={() => window.open(result.file, '_blank')}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                    <Download className="mr-2 h-4 w-4" /> Download Updated DOCX
                </Button>
                <div className="mt-6">
                    <button
                        onClick={() => setResult(null)}
                        className="text-sm text-gray-600 hover:text-gray-900 font-medium hover:underline transition-colors"
                    >
                        Make More Changes
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-full"></div>
                    <h3 className="text-lg font-bold text-gray-900">Manage Images</h3>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={loadImages}
                    disabled={loading}
                    className="border-2 border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-all duration-300"
                >
                    <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {error && (
                <div className="p-4 border-2 border-red-200 bg-gradient-to-br from-red-50 to-orange-50 rounded-xl">
                    <p className="text-red-600 text-sm font-medium">{error}</p>
                </div>
            )}

            {/* Add Image Section */}
            <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-dashed border-blue-300 hover:border-blue-400 transition-all duration-300">
                <label className="cursor-pointer block">
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleAddImage}
                        className="hidden"
                        disabled={uploading}
                    />
                    <div className="flex flex-col items-center gap-3">
                        <div className="p-4 bg-blue-500 rounded-full">
                            <Upload className="h-8 w-8 text-white" />
                        </div>
                        <div className="text-center">
                            <p className="font-semibold text-gray-900">Add New Image</p>
                            <p className="text-sm text-gray-600 mt-1">Click to upload or drag and drop</p>
                        </div>
                    </div>
                </label>
            </div>

            {/* Images Grid */}
            {loading ? (
                <div className="flex flex-col justify-center items-center py-16 space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
                    <p className="text-gray-500 font-medium">Loading images...</p>
                </div>
            ) : images.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
                    <ImageIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">No images found in this document</p>
                    <p className="text-sm text-gray-500 mt-1">Add images using the upload area above</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {images.map((img) => (
                        <div
                            key={img.id}
                            className="group relative bg-white rounded-xl border-2 border-gray-200 hover:border-blue-300 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300"
                        >
                            <div className="aspect-square relative">
                                <img
                                    src={img.data}
                                    alt={img.filename}
                                    className="w-full h-full object-cover"
                                    onClick={() => setSelectedImage(img)}
                                />

                                {/* Hover Overlay */}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                                    <label className="cursor-pointer">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => handleReplaceImage(img.id, e)}
                                            className="hidden"
                                            disabled={uploading}
                                        />
                                        <div className="p-2 bg-white rounded-lg hover:bg-blue-50 transition-colors">
                                            <RefreshCw className="h-5 w-5 text-blue-600" />
                                        </div>
                                    </label>
                                    <button
                                        onClick={() => handleRemoveImage(img.id)}
                                        disabled={uploading}
                                        className="p-2 bg-white rounded-lg hover:bg-red-50 transition-colors"
                                    >
                                        <X className="h-5 w-5 text-red-600" />
                                    </button>
                                </div>
                            </div>

                            {/* Image Info */}
                            <div className="p-3 bg-gray-50 border-t border-gray-200">
                                <p className="text-xs font-medium text-gray-900 truncate">{img.filename}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {img.width} × {img.height} • {(img.size / 1024).toFixed(1)} KB
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Image Preview Modal */}
            {selectedImage && (
                <div
                    className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
                    onClick={() => setSelectedImage(null)}
                >
                    <div className="max-w-4xl max-h-[90vh] relative">
                        <button
                            onClick={() => setSelectedImage(null)}
                            className="absolute -top-12 right-0 p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
                        >
                            <X className="h-6 w-6 text-gray-900" />
                        </button>
                        <img
                            src={selectedImage.data}
                            alt={selectedImage.filename}
                            className="max-w-full max-h-[90vh] rounded-xl shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>
            )}

            {uploading && (
                <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center">
                    <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
                        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
                        <p className="text-gray-900 font-semibold">Processing...</p>
                    </div>
                </div>
            )}
        </div>
    );
}
