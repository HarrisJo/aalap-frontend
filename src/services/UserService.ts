import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL}/api/users`;

const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
};

export const UserService = {
    // This tells the backend to trigger the deleteUserAccount logic we just wrote
    deleteMyAccount: async () => {
        const response = await axios.delete(`${API_URL}/me`, {
            headers: getAuthHeader()
        });
        return response.data;
    }
};