import axios from 'axios';
import { Message, Poet, PoetInfo } from '../types';

const API_BASE_URL = 'http://localhost:8002';

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
});

// 请求拦截器
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// 响应拦截器
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/';
        }
        return Promise.reject(error);
    }
);

export const authApi = {
    login: async (username: string, password: string) => {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);
        const response = await api.post('/token', formData);
        return response.data;
    },
    register: async (username: string, password: string) => {
        const response = await api.post('/register', { username, password });
        return response.data;
    },
};

export const chatApi = {
    getPoets: async () => {
        const response = await api.get('/poets');
        return response.data;
    },
    getPoetInfo: async (poetName: string) => {
        const response = await api.get(`/poet/${poetName}`);
        return response.data as PoetInfo;
    },
    getChatHistory: async (poetName: string) => {
        const response = await api.get(`/chat/${poetName}/history`);
        return response.data as Message[];
    },
    sendMessage: async (poetName: string, content: string) => {
        const response = await api.post(`/chat/${poetName}`, {
            content,
            poet_name: poetName,
        });
        return response.data;
    },
    searchMessages: async (query: string) => {
        const response = await api.get(`/search?query=${encodeURIComponent(query)}`);
        return response.data as Message[];
    },
}; 