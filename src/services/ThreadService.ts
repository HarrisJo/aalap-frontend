import axios from 'axios';

const API_URL = 'https://aalap-backend-1.onrender.com/api/threads';

const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
};

export const ThreadService = {

    getAllThreads: async () => {
        const response = await axios.get(API_URL, { headers: getAuthHeader() });
        return response.data;
    },

    createThread: async (title: string, description: string) => {
        const response = await axios.post(API_URL,
            { title, description },
            { headers: getAuthHeader() }
        );
        return response.data;
    },

    addContribution: async (
        threadId: number,
        role: string,
        description: string,
        file: File,
        bpm?: number,
        musicalKey?: string
    ) => {
        const formData = new FormData();
        formData.append('role', role);
        formData.append('description', description);
        formData.append('file', file);
        if (bpm)        formData.append('bpm', bpm.toString());
        if (musicalKey) formData.append('musicalKey', musicalKey);

        const response = await axios.post(`${API_URL}/${threadId}/contributions`, formData, {
            headers: { ...getAuthHeader(), 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    // ─── DELETE CONTRIBUTION ─────────────────────────────────────────────────────
    // Deletes the contribution from DB and its file from Cloudinary.
    // The backend will reject with 403 if the logged-in user doesn't own it.

    deleteContribution: async (contributionId: number) => {
        await axios.delete(
            `https://aalap-backend-1.onrender.com/api/threads/contributions/${contributionId}`,
            { headers: getAuthHeader() }
        );
    },

    // ─── REUPLOAD CONTRIBUTION FILE ───────────────────────────────────────────────
    // Replaces only the audio file. Role and description are unchanged.
    // The backend will reject with 403 if the logged-in user doesn't own it.

    reuploadContributionFile: async (contributionId: number, file: File) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await axios.put(
            `https://aalap-backend-1.onrender.com/api/threads/contributions/${contributionId}/file`,
            formData,
            { headers: { ...getAuthHeader(), 'Content-Type': 'multipart/form-data' } }
        );
        return response.data;
    },

    uploadMasterMix: async (threadId: number, file: File) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await axios.post(`${API_URL}/${threadId}/master`, formData, {
            headers: { ...getAuthHeader(), 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },
};