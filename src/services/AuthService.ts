import axios from 'axios';

// We add the /api/auth right here!
const API_URL = `${import.meta.env.VITE_API_URL}/api/auth`;

// withCredentials is set globally in api.ts — no need to set it per-call.
// The JWT arrives as an HttpOnly cookie set by the server; it never appears
// in the response body or in localStorage.

export const AuthService = {
    login: async (email: string, password: string) => {
        const response = await axios.post(`${API_URL}/login`, { email, password });
        // Returns { userId, name, email } — the JWT is in the HttpOnly cookie
        return response.data;
    },

    register: async (stageName: string, email: string, password: string) => {
        const response = await axios.post(`${API_URL}/register`, {
            name: stageName,
            email,
            password
        });
        return response.data;
    },

    // Tells the server to clear the HttpOnly jwt cookie (browser can't do it itself).
    logout: async () => {
        await axios.post(`${API_URL}/logout`);
        sessionStorage.clear();
    }
};