import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL}/api/users`;

// No Authorization headers needed — the HttpOnly jwt cookie is sent
// automatically by the browser on every request (withCredentials is set
// globally in api.ts).

export const UserService = {
    // password is required — the backend verifies it before deleting the account.
    deleteMyAccount: async (password: string) => {
        const response = await axios.delete(`${API_URL}/me`, { data: { password } });
        return response.data;
    }
};