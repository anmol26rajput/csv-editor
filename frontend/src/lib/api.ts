import axios from 'axios';

// Helper to strip trailing slashes and /api/v1 from the base URL to prevent duplication
const getBaseUrl = () => {
    let url = process.env.NEXT_PUBLIC_API_URL || 'https://csv-editorbackend.onrender.com';
    // Remove trailing slash
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    // Remove /api/v1 suffix if present (to avoid double /api/v1/api/v1)
    if (url.endsWith('/api/v1')) {
        url = url.slice(0, -7);
    }
    return url;
};

// Resolve file URLs returned by the backend: relative paths like /media/...
// must point at the backend origin, not the Next.js dev server
export const resolveFileUrl = (url: string) => {
    if (!url) return url;
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }
    return getBaseUrl() + (url.startsWith('/') ? url : `/${url}`);
};

const api = axios.create({
    baseURL: getBaseUrl(),
    headers: {
        'Content-Type': 'application/json',
    },
});

export default api;