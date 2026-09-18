import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const client = axios.create({ baseURL: API_URL });

client.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

let isRefreshing = false;
let refreshSubscribers: Array<{
    resolve: (token: string) => void;
    reject: (error: any) => void;
}> = [];

function onRefreshed(token: string) {
    refreshSubscribers.forEach((sub) => sub.resolve(token));
    refreshSubscribers = [];
}
function onRefreshError(error: any) {
    refreshSubscribers.forEach((sub) => sub.reject(error));
    refreshSubscribers = [];
}


client.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    refreshSubscribers.push({
                        resolve: (token: string) => {
                            originalRequest.headers.Authorization = `Bearer ${token}`;
                            resolve(client(originalRequest));
                        },
                        reject: (err: any) => reject(err),
                    });
                });
            }
            isRefreshing = true;
            try {
                const refreshToken = localStorage.getItem('refreshToken');
                const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
                localStorage.setItem('accessToken', data.accessToken);
                localStorage.setItem('refreshToken', data.refreshToken);
                isRefreshing = false;
                onRefreshed(data.accessToken);
                originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
                return client(originalRequest);
            } catch (refreshError) {
                isRefreshing = false;
                onRefreshError(refreshError);

                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                window.location.href = '/login';

                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    },
);

export default client;