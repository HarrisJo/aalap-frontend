import axios from 'axios';

// ─── CREDENTIALS ─────────────────────────────────────────────────────────────
// Tell axios to include cookies on every cross-origin request.
// This is what makes the browser send the HttpOnly jwt cookie to the backend.
axios.defaults.withCredentials = true;

// NOTE: CSRF protection is disabled on the backend for this stateless REST API.
// The frontend (Vercel) and backend (HF Space / localhost) are on different domains.
// document.cookie in the browser only shows cookies for the CURRENT domain (Vercel),
// NOT for the backend's domain — so the old double-submit cookie CSRF pattern could
// never work cross-origin. The backend is protected by CORS restrictions instead.

// ─── GLOBAL 401 INTERCEPTOR ──────────────────────────────────────────────────
// When a protected API call returns 401 (cookie expired / revoked),
// wipe local UI state and hard-redirect to /auth.
// Auth endpoints are excluded — a 401 there just means wrong credentials.
axios.interceptors.response.use(
    (response) => response,
    (error) => {
        const url: string = error.config?.url ?? '';
        const isAuthEndpoint = url.includes('/api/auth/');
        const alreadyOnAuth  = window.location.pathname === '/auth';

        if (error.response?.status === 401 && !isAuthEndpoint && !alreadyOnAuth) {
            sessionStorage.clear(); // wipe non-sensitive UI state
            window.location.href = '/auth';
        }

        return Promise.reject(error);
    }
);

