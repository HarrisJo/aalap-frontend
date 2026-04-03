import axios from 'axios';

// We add the /api/threads right here!
const API_URL = `${import.meta.env.VITE_API_URL}/api/threads`;

// No Authorization headers needed — the HttpOnly jwt cookie is sent
// automatically by the browser on every request (withCredentials is set
// globally in api.ts).

export const ThreadService = {

    getAllThreads: async () => {
        const response = await axios.get(API_URL);
        return response.data;
    },

    createThread: async (title: string, description: string) => {
        const response = await axios.post(API_URL, { title, description });
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

        // Do NOT manually set 'Content-Type': 'multipart/form-data'.
        // axios sets the correct header including the boundary automatically.
        const response = await axios.post(`${API_URL}/${threadId}/contributions`, formData);
        return response.data;
    },

    deleteContribution: async (contributionId: number) => {
        await axios.delete(`${API_URL}/contributions/${contributionId}`);
    },

    reuploadContributionFile: async (contributionId: number, file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await axios.put(
            `${API_URL}/contributions/${contributionId}/file`,
            formData
        );
        return response.data;
    },

    uploadMasterMix: async (threadId: number, file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await axios.post(`${API_URL}/${threadId}/master`, formData);
        return response.data;
    },

    // ─── DELETE THREAD ────────────────────────────────────────────────────────
    deleteThread: async (threadId: number) => {
        await axios.delete(`${API_URL}/${threadId}`);
    },
};