// ─── CANONICAL ROLE COLOR PALETTE ────────────────────────────────────────────
// Single source of truth for role colors across the entire app.
// All pages import from here — no more per-page ROLE_COLORS definitions.
//
// Shape variants:
//   ProfileColor  — used by ProfilePage & PublicProfilePage
//   DetailColor   — used by ThreadDetail (DAW view, needs track/bar/glow)
//   FeedColor     — used by HomeFeed (opaque badge bg + readable text)

// ─── PROFILE / PUBLIC PROFILE ─────────────────────────────────────────────────

export type ProfileColor = { dot: string; bg: string; text: string; glow: string };

export const PROFILE_ROLE_COLORS: Record<string, ProfileColor> = {
    composer:        { dot: '#FFD4CA', bg: 'rgba(255,212,202,0.1)',  text: '#FFD4CA', glow: 'rgba(255,212,202,0.3)' },
    lyricist:        { dot: '#FF4439', bg: 'rgba(255,68,57,0.1)',    text: '#FF4439', glow: 'rgba(255,68,57,0.3)'   },
    singer:          { dot: '#FB7185', bg: 'rgba(251,113,133,0.1)',  text: '#FB7185', glow: 'rgba(251,113,133,0.3)' },
    producer:        { dot: '#2DD4BF', bg: 'rgba(45,212,191,0.1)',   text: '#2DD4BF', glow: 'rgba(45,212,191,0.3)'  },
    instrumentalist: { dot: '#A3E635', bg: 'rgba(163,230,53,0.1)',   text: '#A3E635', glow: 'rgba(163,230,53,0.3)'  },
};

const PROFILE_DEFAULT: ProfileColor = {
    dot: '#ffffff20', bg: 'rgba(255,255,255,0.04)', text: '#ffffff40', glow: 'rgba(255,255,255,0.1)',
};

export const getProfileRoleColor = (role: string): ProfileColor =>
    PROFILE_ROLE_COLORS[role.split(' - ')[0].toLowerCase().trim()] ?? PROFILE_DEFAULT;

// ─── THREAD DETAIL ────────────────────────────────────────────────────────────

export type DetailColor = { label: string; dot: string; glow: string; track: string; bar: string };

export const DETAIL_ROLE_COLORS: Record<string, DetailColor> = {
    composer:        { label: '#FFD4CA', dot: '#FFD4CA', glow: 'rgba(255,212,202,0.35)', track: 'rgba(255,212,202,0.06)', bar: '#FFD4CA' },
    lyricist:        { label: '#FF4439', dot: '#FF4439', glow: 'rgba(255,68,57,0.35)',   track: 'rgba(255,68,57,0.06)',   bar: '#FF4439' },
    singer:          { label: '#FB7185', dot: '#FB7185', glow: 'rgba(251,113,133,0.35)', track: 'rgba(251,113,133,0.06)', bar: '#FB7185' },
    producer:        { label: '#2DD4BF', dot: '#2DD4BF', glow: 'rgba(45,212,191,0.35)', track: 'rgba(45,212,191,0.06)',  bar: '#2DD4BF' },
    instrumentalist: { label: '#A3E635', dot: '#A3E635', glow: 'rgba(163,230,53,0.35)', track: 'rgba(163,230,53,0.06)',  bar: '#A3E635' },
};

const DETAIL_DEFAULT: DetailColor = {
    label: '#ffffff40', dot: '#ffffff30', glow: 'rgba(255,255,255,0.1)', track: 'rgba(255,255,255,0.03)', bar: '#ffffff30',
};

export const getDetailRoleColor = (role: string): DetailColor =>
    DETAIL_ROLE_COLORS[role.split(' - ')[0].toLowerCase().trim()] ?? DETAIL_DEFAULT;

// ─── HOME FEED ────────────────────────────────────────────────────────────────
// bg/text are opaque hex values used as inline styles for badge pills.
// text is chosen for readable contrast against the opaque bg.

export type FeedColor = { dot: string; bg: string; text: string };

export const FEED_ROLE_COLORS: Record<string, FeedColor> = {
    composer:        { dot: '#FFD4CA', bg: '#FFD4CA', text: '#1a1a1a' },
    lyricist:        { dot: '#FF4439', bg: '#FF4439', text: '#FCFCFC' },
    singer:          { dot: '#FB7185', bg: '#FB7185', text: '#FCFCFC' },
    producer:        { dot: '#2DD4BF', bg: '#2DD4BF', text: '#1a1a1a' },
    instrumentalist: { dot: '#A3E635', bg: '#A3E635', text: '#1a1a1a' },
};

const FEED_DEFAULT: FeedColor = {
    dot: '#FCFCFC40', bg: 'rgba(255,255,255,0.05)', text: 'rgba(255,255,255,0.4)',
};

export const getFeedRoleColor = (role: string): FeedColor =>
    FEED_ROLE_COLORS[role.split(' - ')[0].toLowerCase().trim()] ?? FEED_DEFAULT;

