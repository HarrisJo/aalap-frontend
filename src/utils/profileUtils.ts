import { useState, useEffect } from 'react';
import { getProfileRoleColor } from './roleColors';

// ─── SHARED TYPES ─────────────────────────────────────────────────────────────

export interface UserInfo { id: number; name: string; email: string; }

export interface ThreadSummary {
    id: number;
    title: string;
    description: string;
    createdBy: UserInfo;
    createdAt: string;
    contributionCount: number;
    rolesWithContributors: { [role: string]: string[] };
    contributorIds: number[];   // unique contributor user IDs — use these for accurate dedup
}

export interface ContributionResponse {
    id: number;
    role: string;
    noolId: number;
    noolTitle: string;
    description: string;
    filePath: string;
    createdAt: string;
}

export interface ProfileThreadCardProps {
    thread: ThreadSummary;
    index: number;
    isFirstVisit: boolean;
    onClick: () => void;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

export function getRoleColor(role: string) { return getProfileRoleColor(role); }

export function timeAgo(dateStr: string): string {
    const diff  = Date.now() - new Date(dateStr).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins  < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days  < 7)  return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function getInitial(name?: string) {
    return (name ?? '?').charAt(0).toUpperCase();
}

// ─── COUNT-UP HOOK ────────────────────────────────────────────────────────────

export function useCountUp(target: number, duration = 1400, delay = 0) {
    const [value, setValue] = useState(0);
    useEffect(() => {
        if (target === 0) { setValue(0); return; }
        let start: number | null = null;
        let raf: number;
        const timeout = setTimeout(() => {
            const step = (ts: number) => {
                if (!start) start = ts;
                const progress = Math.min((ts - start) / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                setValue(Math.floor(eased * target));
                if (progress < 1) raf = requestAnimationFrame(step);
                else setValue(target);
            };
            raf = requestAnimationFrame(step);
        }, delay);
        return () => { clearTimeout(timeout); cancelAnimationFrame(raf); };
    }, [target, duration, delay]);
    return value;
}

