import axios from 'axios';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://csv-editorbackend.onrender.com', // Removed /api/v1 to avoid duplication
    headers: {
        'Content-Type': 'application/json',
    },
});

export default api;