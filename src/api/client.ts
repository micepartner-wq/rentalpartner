import axios from 'axios';

const apiBaseUrl =
    import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ||
    `${(import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '')}/api`;

const client = axios.create({
    baseURL: apiBaseUrl,
    headers: {
        'Content-Type': 'application/json',
    },
});

export default client;
