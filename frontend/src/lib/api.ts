import axios from 'axios';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://csv-editorbackend.onrender.com/api/v1',
    headers: {
        'Content-Type': 'application/json',
    },
});

export default api;