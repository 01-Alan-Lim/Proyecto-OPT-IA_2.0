import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://clon-gpt-eqafaxhcb4c3h7ch.canadacentral-01.azurewebsites.net/api/';

const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

apiClient.interceptors.request.use(config => {
    const userId = localStorage.getItem('userId') || 'default-user';
    if (userId) {
        config.headers['x-user-id'] = userId;
    }
    return config;
});

apiClient.interceptors.response.use(
    response => response,
    error => {
        console.error('API Error:', error.response);
        return Promise.reject(error);
    }
);

export const getChatHistory = (userId) => {
    return apiClient.get('/history', {
        headers: { 'x-user-id': userId }
    });
};

export const sendMessage = (userId, message, chatId) => {
    return apiClient.post(
        '/functions',
        { question: message, style: "default" },
        {
            params: { chatId }
        }
    );
};

export const loadChat = (userId, chatId) => {
    return apiClient.post(
        '/functions',
        { action: "load_chat" },
        {
            params: { chatId }
        }
    );
};

export const getChatTopics = (chatId) => {
    return apiClient.get('/topics', {
        params: { chatId }
    });
};

export const generateDocument = (topic, actionType) => {
    return apiClient.post('/generate-document', {
        topic,
        actionType
    });
};

export const downloadDocument = (content, filename) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `documento-${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};