import axios from 'axios';

// This is where your Spring Boot app is usually running
const API_URL = 'https://aalap-backend-1.onrender.com/api/auth';

export const AuthService = {
    // The Login Route
    login: async (email: string, password: string) => {
        const response = await axios.post(`${API_URL}/login`, {
            email,
            password
        });
        // If we get a JWT token back, we'll store it later!
        return response.data;
    },

    // The Register Route
    register: async (stageName: string, email: string, password: string) => {
        const response = await axios.post(`${API_URL}/register`, {
            name: stageName, // Mapping 'Stage Name' to your backend 'name'
            email,
            password
        });
        return response.data;
    }
};