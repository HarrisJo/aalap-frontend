import axios from 'axios';

// We add the /api/threads right here!
const API_URL = `${import.meta.env.VITE_API_URL}/api/threads`;

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

        // ✅ FIX: Do NOT manually set 'Content-Type': 'multipart/form-data'.
        // When axios sees a FormData body, it automatically sets the correct
        // Content-Type header including the required `boundary` parameter.
        // Manually setting it strips the boundary, causing Spring Boot to fail
        // parsing the body and return 500.
        const response = await axios.post(`${API_URL}/${threadId}/contributions`, formData, {
            headers: { ...getAuthHeader() }
        });
        return response.data;
    },

    deleteContribution: async (contributionId: number) => {
        await axios.delete(
            `${API_URL}/contributions/${contributionId}`,
            { headers: getAuthHeader() }
        );
    },

    reuploadContributionFile: async (contributionId: number, file: File) => {
        const formData = new FormData();
        formData.append('file', file);

        // ✅ FIX: Same as above — let axios set Content-Type with the boundary.
        const response = await axios.put(
            `${API_URL}/contributions/${contributionId}/file`,
            formData,
            { headers: { ...getAuthHeader() } }
        );
        return response.data;
    },

    uploadMasterMix: async (threadId: number, file: File) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await axios.post(`${API_URL}/${threadId}/master`, formData, {
            headers: { ...getAuthHeader() }
        });
        return response.data;
    },

    // ─── DELETE THREAD ────────────────────────────────────────────────────────
    // Only callable by the thread creator. Deletes the thread and all its
    // contributions from both Cloudinary and the database.

    deleteThread: async (threadId: number) => {
        await axios.delete(`${API_URL}/${threadId}`, { headers: getAuthHeader() });
    },
};