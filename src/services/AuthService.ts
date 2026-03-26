import axios from 'axios';

// We add the /api/auth right here!
const API_URL = `${import.meta.env.VITE_API_URL}/api/auth`;

export const AuthService = {
    login: async (email: string, password: string) => {
        const response = await axios.post(`${API_URL}/login`, {
            email,
            password
        });
        return response.data;
    },

    register: async (stageName: string, email: string, password: string) => {
        const response = await axios.post(`${API_URL}/register`, {
            name: stageName,
            email,
            password
        });
        return response.data;
    }
};