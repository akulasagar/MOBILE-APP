import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// This is the same URL from your AuthScreen
const API_URL =  'http://10.0.2.2:5001'; 

const apiClient = axios.create({
    baseURL: API_URL,
});

// This is the magic! We are using an "interceptor" to modify requests before they are sent.
apiClient.interceptors.request.use(
    async (config) => {
        // Get the token from secure storage
        const token = await SecureStore.getItemAsync('userToken');
        if (token) {
            // If the token exists, add it to the 'x-auth-token' header
            config.headers['x-auth-token'] = token;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default apiClient;