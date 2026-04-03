import axios from 'axios';

// ─── CREDENTIALS ─────────────────────────────────────────────────────────────
// Tell axios to include cookies on every cross-origin request.
// This is what makes the browser send the HttpOnly jwt cookie to the backend.
axios.defaults.withCredentials = true;

// ─── CSRF INTERCEPTOR ────────────────────────────────────────────────────────
// Spring Security sets an XSRF-TOKEN cookie (non-HttpOnly) on every response.
// We read it here and echo it back as X-XSRF-TOKEN on every state-changing
// request so Spring can validate the double-submit cookie pattern.
// Auth endpoints (/api/auth/**) are exempt on the backend and don't need it.
axios.interceptors.request.use((config) => {
    const xsrfCookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('XSRF-TOKEN='));
    if (xsrfCookie) {
        config.headers['X-XSRF-TOKEN'] = decodeURIComponent(xsrfCookie.split('=')[1]);
    }
    return config;
});

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

