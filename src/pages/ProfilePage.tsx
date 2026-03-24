import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface UserInfo {
    id: number;
    name: string;
    email: string;
}

interface ThreadSummary {
    id: number;
    title: string;
    description: string;
    createdBy: UserInfo;
    createdAt: string;
    contributionCount: number;
    rolesWithContributors: { [role: string]: string[] };
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, { dot: string; bg: string; text: string; glow: string }> = {
    composer:        { dot: '#FFD4CA', bg: 'rgba(255,212,202,0.1)',  text: '#FFD4CA', glow: 'rgba(255,212,202,0.3)' },
    lyricist:        { dot: '#FF4439', bg: 'rgba(255,68,57,0.1)',    text: '#FF4439', glow: 'rgba(255,68,57,0.3)'   },
    singer:          { dot: '#FB7185', bg: 'rgba(251,113,133,0.1)',  text: '#FB7185', glow: 'rgba(251,113,133,0.3)' },
    producer:        { dot: '#2DD4BF', bg: 'rgba(45,212,191,0.1)',   text: '#2DD4BF', glow: 'rgba(45,212,191,0.3)'  },
    instrumentalist: { dot: '#A3E635', bg: 'rgba(163,230,53,0.1)',   text: '#A3E635', glow: 'rgba(163,230,53,0.3)'  },
};
const DEFAULT_RC = { dot: '#ffffff20', bg: 'rgba(255,255,255,0.04)', text: '#ffffff40', glow: 'rgba(255,255,255,0.1)' };

function getRoleColor(role: string) {
    return ROLE_COLORS[role.split(' - ')[0].toLowerCase().trim()] ?? DEFAULT_RC;
}

function timeAgo(dateStr: string): string {
    const diff  = Date.now() - new Date(dateStr).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins  < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days  < 7)  return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getInitial(name?: string) {
    return (name ?? '?').charAt(0).toUpperCase();
}

// ─── COUNT-UP HOOK ────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 1400, delay = 0) {
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

// ─── WAVEFORM AVATAR ──────────────────────────────────────────────────────────

function WaveformAvatar({ initial, isReady }: { initial: string; isReady: boolean }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef    = useRef<number>(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d')!;
        const W = canvas.width = 220;
        const H = canvas.height = 220;
        const cx = W / 2, cy = H / 2;

        const draw = (ts: number) => {
            ctx.clearRect(0, 0, W, H);
            const t = ts / 1000;

            const rings = [
                { r: 72, bars: 48, speed: 0.6, amp: 6,  color: 'rgba(255,68,57,0.5)',    width: 1.5 },
                { r: 84, bars: 60, speed: 0.9, amp: 4,  color: 'rgba(255,212,202,0.25)', width: 1   },
                { r: 96, bars: 72, speed: 0.4, amp: 3,  color: 'rgba(71,91,90,0.4)',      width: 1   },
            ];

            rings.forEach(ring => {
                for (let i = 0; i < ring.bars; i++) {
                    const angle = (i / ring.bars) * Math.PI * 2 - Math.PI / 2;
                    const wave  = Math.sin(i * 0.4 + t * ring.speed * 2) * ring.amp
                        + Math.sin(i * 0.15 + t * ring.speed) * (ring.amp * 0.5);
                    const r1    = ring.r;
                    const r2    = ring.r + Math.max(1.5, wave + ring.amp);
                    ctx.beginPath();
                    ctx.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
                    ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
                    ctx.strokeStyle = ring.color;
                    ctx.lineWidth   = ring.width;
                    ctx.stroke();
                }
            });

            // Outer glow ring
            const glowR = 105 + Math.sin(t * 0.8) * 3;
            const grad  = ctx.createRadialGradient(cx, cy, glowR - 4, cx, cy, glowR + 4);
            grad.addColorStop(0, 'rgba(255,68,57,0)');
            grad.addColorStop(0.5, 'rgba(255,68,57,0.12)');
            grad.addColorStop(1, 'rgba(255,68,57,0)');
            ctx.beginPath();
            ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
            ctx.strokeStyle = grad;
            ctx.lineWidth   = 8;
            ctx.stroke();

            rafRef.current = requestAnimationFrame(draw);
        };

        rafRef.current = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(rafRef.current);
    }, []);

    return (
        <div className="relative flex items-center justify-center" style={{ width: 220, height: 220 }}>
            <canvas ref={canvasRef} className="absolute inset-0"
                    style={{ opacity: isReady ? 1 : 0, transition: 'opacity 1s ease' }} />
            <div className="absolute inset-0 pointer-events-none" style={{
                background: 'radial-gradient(ellipse 80px 80px at 50% 50%, rgba(255,68,57,0.2) 0%, transparent 70%)',
                animation: 'glow-breathe 3s ease-in-out infinite',
            }} />
            <div className="relative z-10 w-28 h-28 rounded-full flex items-center justify-center"
                 style={{
                     background: 'linear-gradient(145deg, #1e2b29 0%, #0d1614 100%)',
                     border: '1.5px solid rgba(255,212,202,0.15)',
                     boxShadow: '0 0 0 1px rgba(255,68,57,0.1), 0 0 40px rgba(255,68,57,0.12), inset 0 1px 0 rgba(255,255,255,0.05)',
                 }}>
                <span className="font-anton text-5xl" style={{ color: '#FFD4CA' }}>{initial}</span>
            </div>
        </div>
    );
}

// ─── FLOATING NOTES CANVAS ────────────────────────────────────────────────────

function FloatingNotes() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx    = canvas.getContext('2d')!;
        const resize = () => { canvas.width = window.innerWidth; canvas.height = 340; };
        resize();
        window.addEventListener('resize', resize);

        const NOTES = ['♩','♪','♫','♬','𝄞'];
        const notes = Array.from({ length: 18 }, () => ({
            x: Math.random() * window.innerWidth,
            y: Math.random() * 340,
            vy: -(0.15 + Math.random() * 0.25),
            vx: (Math.random() - 0.5) * 0.2,
            size: 10 + Math.random() * 10,
            alpha: 0.04 + Math.random() * 0.07,
            note: NOTES[Math.floor(Math.random() * NOTES.length)],
            rot: (Math.random() - 0.5) * 0.01,
            angle: Math.random() * 0.4 - 0.2,
        }));

        let raf: number;
        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            notes.forEach(n => {
                n.y += n.vy; n.x += n.vx; n.angle += n.rot;
                if (n.y < -20) { n.y = canvas.height + 20; n.x = Math.random() * canvas.width; }
                ctx.save();
                ctx.translate(n.x, n.y);
                ctx.rotate(n.angle);
                ctx.globalAlpha = n.alpha;
                ctx.fillStyle   = '#FFD4CA';
                ctx.font        = `${n.size}px serif`;
                ctx.fillText(n.note, 0, 0);
                ctx.restore();
            });
            raf = requestAnimationFrame(draw);
        };
        raf = requestAnimationFrame(draw);
        return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
    }, []);
    return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />;
}

// ─── ROLE DNA BAR ─────────────────────────────────────────────────────────────

function RoleDNA({ threads }: { threads: ThreadSummary[] }) {
    const counts: Record<string, number> = {};
    threads.forEach(t =>
        Object.keys(t.rolesWithContributors).forEach(r => {
            const key = r.split(' - ')[0].toLowerCase().trim();
            counts[key] = (counts[key] || 0) + 1;
        })
    );
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    if (total === 0) return null;

    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);

    return (
        <div className="w-full max-w-xl mx-auto mb-12"
             style={{ animation: 'fade-up 0.6s ease-out 0.9s both' }}>
            <p className="font-dm text-[9px] uppercase tracking-[0.3em] text-white/20 text-center mb-3">
                Thread DNA
            </p>
            <div className="flex h-2 rounded-full overflow-hidden w-full gap-[2px]">
                {entries.map(([role, count], i) => {
                    const rc  = getRoleColor(role);
                    const pct = (count / total) * 100;
                    return (
                        <div key={role}
                             style={{
                                 width: `${pct}%`, height: '100%', borderRadius: 4,
                                 backgroundColor: rc.dot,
                                 boxShadow: `0 0 6px ${rc.glow}`,
                                 animation: `dna-grow 0.8s cubic-bezier(0.34,1.56,0.64,1) ${0.9 + i * 0.1}s both`,
                                 transform: 'scaleX(0)',
                                 transformOrigin: 'left',
                             }}
                        />
                    );
                })}
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-3">
                {entries.map(([role, count]) => {
                    const rc = getRoleColor(role);
                    return (
                        <div key={role} className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: rc.dot }} />
                            <span className="font-dm text-[9px] uppercase tracking-wider" style={{ color: rc.text }}>
                                {role} · {count}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function ProfilePage() {
    const navigate = useNavigate();

    const [userName,     setUserName]     = useState<string>('?');
    const [userEmail,    setUserEmail]    = useState<string>('');
    const [threads,      setThreads]      = useState<ThreadSummary[]>([]);
    const [isLoading,    setIsLoading]    = useState(true);
    const [isReady,      setIsReady]      = useState(false);
    const [isFirstVisit, setIsFirstVisit] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) { navigate('/auth'); return; }
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            setUserEmail(payload.sub || '');
        } catch { navigate('/auth'); }
        if (!sessionStorage.getItem('profileAnimated')) {
            setIsFirstVisit(true);
            sessionStorage.setItem('profileAnimated', 'true');
        }
        setTimeout(() => setIsReady(true), 300);
    }, [navigate]);

    // REPLACE the entire fetchMyThreads function with this:
    const fetchMyProfile = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            // Hit the new optimized VIP endpoint
            const res = await axios.get('https://aalap-backend-1.onrender.com/api/users/me', {
                headers: { Authorization: `Bearer ${token}` },
            });

            const profile = res.data; // This is now a UserProfileResponse object

            // Set the state using the direct profile data
            setThreads(profile.threadsCreated || []);
            setUserName(profile.name || '?');
            setUserEmail(profile.email || '');

            // If you ever want to show "My Contributions to Other Threads" in the future,
            // you now have access to it here via: profile.contributions

        } catch (error) {
            console.error('Failed to load profile', error);
            // Fallback just in case the token is old/invalid
            if (axios.isAxiosError(error) && error.response?.status === 401) {
                navigate('/auth');
            }
        } finally {
            setIsLoading(false);
        }
    }, [navigate]);

    // UPDATE the useEffect to call the new function
    useEffect(() => { fetchMyProfile(); }, [fetchMyProfile]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        sessionStorage.clear();
        navigate('/');
    };

    const totalStems          = threads.reduce((sum, t) => sum + t.contributionCount, 0);
    const uniqueCollaborators = new Set(threads.flatMap(t => Object.values(t.rolesWithContributors).flat())).size;

    const countThreads = useCountUp(isLoading ? 0 : threads.length,       1200, 700);
    const countStems   = useCountUp(isLoading ? 0 : totalStems,            1400, 800);
    const countCollabs = useCountUp(isLoading ? 0 : uniqueCollaborators,   1100, 900);

    const initial   = getInitial(userName);
    const nameChars = userName === '?' ? [] : userName.split('');

    return (
        <div className="min-h-screen bg-[#060808] text-[#FCFCFC] overflow-x-hidden">

            <link href="https://fonts.googleapis.com/css2?family=Anton&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap" rel="stylesheet" />

            <style>{`
                .font-anton  { font-family: 'Anton', sans-serif; }
                .font-dm     { font-family: 'DM Sans', sans-serif; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

                @keyframes fade-up      { from { opacity:0; transform:translateY(20px); }  to { opacity:1; transform:translateY(0); } }
                @keyframes fade-in      { from { opacity:0; }                              to { opacity:1; } }
                @keyframes char-drop    { from { opacity:0; transform:translateY(-40px) scaleY(1.4); } to { opacity:1; transform:translateY(0) scaleY(1); } }
                @keyframes card-rise    { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
                @keyframes stat-pop     { from { opacity:0; transform:scale(0.8) translateY(10px); } to { opacity:1; transform:scale(1) translateY(0); } }
                @keyframes glow-breathe { 0%,100% { opacity:0.6; transform:scale(1); }    50% { opacity:1; transform:scale(1.15); } }
                @keyframes scan-right   { from { transform:translateX(-100%); }           to { transform:translateX(200%); } }
                @keyframes dna-grow     { from { transform:scaleX(0); }                   to { transform:scaleX(1); } }
                @keyframes name-line    { from { transform:scaleX(0); opacity:0; }        to { transform:scaleX(1); opacity:1; } }
                @keyframes tag-in       { from { opacity:0; transform:scale(0.8); }       to { opacity:1; transform:scale(1); } }
                @keyframes spotlight    { 0%,100% { opacity:0.15; }  50% { opacity:0.3; } }
            `}</style>

            {/* AMBIENT BACKGROUND */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-15%] left-[-8%] w-[700px] h-[700px] rounded-full"
                     style={{ background: 'radial-gradient(circle, rgba(71,91,90,0.12) 0%, transparent 65%)', animation: 'glow-breathe 6s ease-in-out infinite' }} />
                <div className="absolute bottom-[-10%] right-[-8%] w-[500px] h-[500px] rounded-full"
                     style={{ background: 'radial-gradient(circle, rgba(255,68,57,0.07) 0%, transparent 65%)', animation: 'glow-breathe 4s ease-in-out 2s infinite' }} />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[2px] h-[340px]"
                     style={{ background: 'linear-gradient(to bottom, rgba(255,68,57,0.3), transparent)', animation: 'spotlight 5s ease-in-out infinite' }} />
            </div>

            {/* ── NAVBAR ──────────────────────────────────────────────────────── */}
            <nav className="sticky top-0 z-50 bg-[#060808]/70 backdrop-blur-2xl border-b border-white/[0.05]"
                 style={{ animation: 'fade-in 0.4s ease-out both' }}>
                <div className="max-w-[1100px] mx-auto px-6 h-14 flex items-center justify-between">
                    <button onClick={() => navigate('/home')}
                            className="flex items-center gap-2 text-white/25 hover:text-white/70 font-dm text-sm transition-all duration-200 group">
                        <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
                        </svg>
                        Feed
                    </button>
                    <span className="font-anton text-lg tracking-widest text-white/10 uppercase select-none">Aalap</span>
                    <button onClick={handleLogout}
                            className="flex items-center gap-2 font-dm text-[11px] text-white/20 hover:text-[#FF4439]/70 uppercase tracking-widest transition-all duration-200 group">
                        <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                        </svg>
                        Logout
                    </button>
                </div>
            </nav>

            {/* ── HERO ────────────────────────────────────────────────────────── */}
            <div className="relative overflow-hidden" style={{ minHeight: 340 }}>
                <FloatingNotes />

                {/* Giant background initial */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
                    <span className="font-anton leading-none"
                          style={{
                              fontSize: 'clamp(200px, 35vw, 420px)',
                              color: 'transparent',
                              WebkitTextStroke: '1px rgba(255,212,202,0.04)',
                              letterSpacing: '-0.02em',
                              animation: isFirstVisit ? 'fade-in 1s ease-out 0.2s both' : undefined,
                          }}>
                        {initial}
                    </span>
                </div>

                <div className="relative z-10 flex flex-col items-center pt-14 pb-10">
                    {/* Waveform avatar */}
                    <div style={{ animation: isFirstVisit ? 'fade-up 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.1s both' : undefined }}>
                        <WaveformAvatar initial={initial} isReady={isReady} />
                    </div>

                    {/* Name — char by char drop */}
                    <div className="flex items-end gap-0 mt-4 overflow-hidden" style={{ lineHeight: 1 }}>
                        {nameChars.map((char, i) => (
                            <span key={i} className="font-anton text-6xl md:text-7xl tracking-wide uppercase"
                                  style={{
                                      display: 'inline-block',
                                      color: char === ' ' ? 'transparent' : '#FCFCFC',
                                      minWidth: char === ' ' ? '0.3em' : undefined,
                                      animation: isFirstVisit ? `char-drop 0.5s cubic-bezier(0.34,1.56,0.64,1) ${0.35 + i * 0.04}s both` : undefined,
                                      textShadow: '0 2px 20px rgba(0,0,0,0.5)',
                                  }}>
                                {char === ' ' ? '\u00A0' : char}
                            </span>
                        ))}
                    </div>

                    {/* Red underline sweep */}
                    <div className="mt-1 h-[2px] w-32"
                         style={{
                             background: 'linear-gradient(90deg, transparent, #FF4439, transparent)',
                             animation: isFirstVisit ? 'name-line 0.6s ease-out 0.8s both' : undefined,
                             transformOrigin: 'center',
                         }} />

                    <p className="font-dm text-sm text-white/20 mt-3 tracking-wide"
                       style={{ animation: isFirstVisit ? 'fade-up 0.5s ease-out 0.85s both' : undefined }}>
                        {userEmail}
                    </p>

                    <div className="flex items-center gap-2 mt-2"
                         style={{ animation: isFirstVisit ? 'fade-up 0.5s ease-out 0.95s both' : undefined }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF4439]"
                              style={{ animation: 'glow-breathe 2s ease-in-out infinite', boxShadow: '0 0 6px rgba(255,68,57,0.8)' }} />
                        <span className="font-dm text-[10px] uppercase tracking-[0.35em] text-[#FF4439]/50">
                            Aalap Artist
                        </span>
                    </div>
                </div>
            </div>

            {/* ── STATS BAR ───────────────────────────────────────────────────── */}
            <div className="relative z-10 border-y border-white/[0.05]"
                 style={{ background: 'linear-gradient(90deg, rgba(71,91,90,0.05), rgba(255,68,57,0.03), rgba(71,91,90,0.05))' }}>
                <div className="max-w-[1100px] mx-auto px-6">
                    <div className="grid grid-cols-3 divide-x divide-white/[0.05]">
                        {[
                            { label: 'Threads',       value: countThreads, accent: '#FFD4CA', delay: '0.55s' },
                            { label: 'Total Stems',   value: countStems,   accent: '#FF4439', delay: '0.65s' },
                            { label: 'Collaborators', value: countCollabs, accent: '#8BAFAE', delay: '0.75s' },
                        ].map((stat) => (
                            <div key={stat.label}
                                 className="group relative flex flex-col items-center py-8 cursor-default border border-transparent hover:border-[#FF4439]/10 transition-all duration-300 rounded-none"
                                 style={{ animation: isFirstVisit ? `stat-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) ${stat.delay} both` : undefined }}>
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                                     style={{ background: `radial-gradient(ellipse 120px 80px at 50% 100%, ${stat.accent}08 0%, transparent 70%)` }} />
                                <p className="font-anton text-5xl md:text-6xl leading-none tabular-nums group-hover:scale-105 transition-transform duration-200"
                                   style={{ color: stat.accent, textShadow: `0 0 30px ${stat.accent}40` }}>
                                    {isLoading ? '—' : stat.value}
                                </p>
                                <p className="font-dm text-[10px] uppercase tracking-[0.25em] text-white/20 mt-2">
                                    {stat.label}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── BODY ────────────────────────────────────────────────────────── */}
            <div className="relative z-10 max-w-[1100px] mx-auto px-6 pt-12 pb-28">

                {!isLoading && <RoleDNA threads={threads} />}

                {/* Section header */}
                <div className="flex items-center gap-4 mb-8"
                     style={{ animation: isFirstVisit ? 'fade-up 0.5s ease-out 1s both' : undefined }}>
                    <div className="flex items-center gap-3 flex-1">
                        <div className="w-6 h-[1px]"
                             style={{ background: 'linear-gradient(90deg, #FF4439, rgba(255,68,57,0))' }} />
                        <p className="font-dm text-[10px] uppercase tracking-[0.35em] text-white/25">My Threads</p>
                    </div>
                    {!isLoading && threads.length > 0 && (
                        <button onClick={() => navigate('/home')}
                                className="font-dm text-[11px] text-white/15 hover:text-[#FFD4CA]/50 transition-colors uppercase tracking-widest">
                            All threads →
                        </button>
                    )}
                </div>

                {/* Loading skeleton */}
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="rounded-2xl border border-white/[0.04] bg-white/[0.015] p-6 animate-pulse"
                                 style={{ opacity: 1 - i * 0.18 }}>
                                <div className="h-6 bg-white/[0.05] rounded-lg w-2/3 mb-4" />
                                <div className="h-3 bg-white/[0.03] rounded w-full mb-2" />
                                <div className="h-3 bg-white/[0.03] rounded w-3/4 mb-5" />
                                <div className="flex gap-2 mb-5">
                                    {[1,2,3].map(j => <div key={j} className="h-5 w-16 bg-white/[0.04] rounded-md" />)}
                                </div>
                                <div className="h-px bg-white/[0.04] mb-4" />
                                <div className="flex justify-between">
                                    <div className="flex -space-x-1">
                                        {[1,2,3].map(j => <div key={j} className="w-6 h-6 rounded-full bg-white/[0.05]" />)}
                                    </div>
                                    <div className="h-6 w-20 bg-white/[0.04] rounded-lg" />
                                </div>
                            </div>
                        ))}
                    </div>

                ) : threads.length === 0 ? (
                    <div className="py-28 flex flex-col items-center"
                         style={{ animation: 'fade-up 0.5s ease-out 0.3s both' }}>
                        <div className="w-20 h-20 rounded-full border border-white/[0.05] flex items-center justify-center mb-6"
                             style={{ background: 'radial-gradient(circle, rgba(255,68,57,0.05) 0%, transparent 70%)' }}>
                            <svg className="w-8 h-8 text-white/10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
                            </svg>
                        </div>
                        <p className="font-dm text-white/20 italic text-base mb-2">No threads yet.</p>
                        <p className="font-dm text-white/10 text-sm mb-8">Plant the first seed. Let others grow it.</p>
                        <button onClick={() => navigate('/home')}
                                className="group relative font-anton text-sm tracking-[0.2em] uppercase px-8 py-3.5 rounded-xl overflow-hidden border border-[#FF4439]/30 text-[#FF4439]/60 hover:text-white transition-colors duration-300">
                            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out"
                                 style={{ background: 'linear-gradient(90deg, #B72F30, #FF4439)' }} />
                            <span className="relative z-10">Start a Thread</span>
                        </button>
                    </div>

                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {threads.map((thread, i) => (
                            <ProfileThreadCard
                                key={thread.id}
                                thread={thread}
                                index={i}
                                isFirstVisit={isFirstVisit}
                                onClick={() => navigate(`/threads/${thread.id}`)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── PROFILE THREAD CARD ──────────────────────────────────────────────────────

interface ProfileThreadCardProps {
    thread: ThreadSummary;
    index: number;
    isFirstVisit: boolean;
    onClick: () => void;
}

function ProfileThreadCard({ thread, index, isFirstVisit, onClick }: ProfileThreadCardProps) {
    const roles           = Object.keys(thread.rolesWithContributors);
    const allContributors = Object.values(thread.rolesWithContributors).flat();
    const [hovered, setHovered] = useState(false);

    return (
        <div className="group relative rounded-2xl overflow-hidden cursor-pointer"
             style={{
                 background: hovered
                     ? 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,68,57,0.02) 100%)'
                     : 'rgba(255,255,255,0.015)',
                 border: `1px solid ${hovered ? 'rgba(255,68,57,0.2)' : 'rgba(255,255,255,0.05)'}`,
                 boxShadow: hovered ? '0 16px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,68,57,0.08)' : 'none',
                 transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
                 transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease, border-color 0.3s ease, background 0.3s ease',
                 animation: isFirstVisit ? `card-rise 0.5s ease-out ${0.9 + index * 0.1}s both` : undefined,
             }}
             onClick={onClick}
             onMouseEnter={() => setHovered(true)}
             onMouseLeave={() => setHovered(false)}>

            {/* Shimmer sweep */}
            {hovered && (
                <div className="absolute inset-y-0 w-1/2 pointer-events-none"
                     style={{
                         background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.025), transparent)',
                         animation: 'scan-right 0.6s ease-out',
                     }} />
            )}

            {/* Left accent bar */}
            <div className="absolute left-0 top-0 bottom-0 w-[2px] transition-all duration-300 origin-bottom"
                 style={{
                     background: 'linear-gradient(to bottom, #FF4439, rgba(255,68,57,0.3))',
                     opacity: hovered ? 1 : 0,
                     transform: hovered ? 'scaleY(1)' : 'scaleY(0)',
                 }} />

            {/* Top role color stripe */}
            {roles.length > 0 && (
                <div className="h-[1px] w-full opacity-40"
                     style={{ background: `linear-gradient(90deg, ${getRoleColor(roles[0]).dot}, transparent)` }} />
            )}

            <div className="p-6 flex flex-col gap-4">
                {/* Title + time */}
                <div className="flex items-start justify-between gap-3">
                    <h3 className="font-anton text-2xl tracking-wide uppercase leading-none text-white/80 group-hover:text-white transition-colors duration-200">
                        {thread.title}
                    </h3>
                    <span className="font-dm text-[10px] text-[#FFD4CA]/30 uppercase tracking-widest shrink-0 mt-0.5 whitespace-nowrap">
                        {timeAgo(thread.createdAt)}
                    </span>
                </div>

                {thread.description && (
                    <p className="font-dm text-sm text-white/35 leading-relaxed line-clamp-2 -mt-1">
                        {thread.description}
                    </p>
                )}

                {/* Role tags */}
                {roles.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                        {roles.slice(0, 5).map((role, i) => {
                            const rc = getRoleColor(role);
                            return (
                                <span key={role}
                                      className="font-dm text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-lg"
                                      style={{
                                          backgroundColor: rc.bg, color: rc.text,
                                          border: `1px solid ${rc.dot}18`,
                                          animation: isFirstVisit ? `tag-in 0.3s ease-out ${1.1 + index * 0.1 + i * 0.05}s both` : undefined,
                                      }}>
                                    {role.split(' - ')[0]}
                                </span>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-[#475B5A]" />
                        <span className="font-dm text-[10px] text-white/20 uppercase tracking-wider italic">
                            Awaiting first voice
                        </span>
                    </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-3.5 border-t mt-1"
                     style={{ borderColor: hovered ? 'rgba(255,68,57,0.1)' : 'rgba(255,255,255,0.05)', transition: 'border-color 0.3s ease' }}>

                    {/* Stacked avatars */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center">
                            {allContributors.slice(0, 5).map((name, i) => (
                                <div key={i}
                                     className="w-7 h-7 rounded-full flex items-center justify-center font-anton text-[11px] border"
                                     style={{
                                         marginLeft: i > 0 ? -8 : 0, zIndex: 10 - i,
                                         backgroundColor: '#0d1614', borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)',
                                     }}>
                                    {getInitial(name)}
                                </div>
                            ))}
                            {allContributors.length > 5 && (
                                <div className="w-7 h-7 rounded-full flex items-center justify-center font-dm text-[9px] border"
                                     style={{ marginLeft: -8, zIndex: 0, backgroundColor: '#0d1614', borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.25)' }}>
                                    +{allContributors.length - 5}
                                </div>
                            )}
                        </div>
                        {allContributors.length === 0 && (
                            <span className="font-dm text-[10px] text-white/15 italic">No contributors yet</span>
                        )}
                    </div>

                    {/* Stem count */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200"
                         style={{
                             background: hovered ? 'rgba(255,68,57,0.08)' : 'rgba(255,255,255,0.03)',
                             border: `1px solid ${hovered ? 'rgba(255,68,57,0.2)' : 'rgba(255,255,255,0.06)'}`,
                         }}>
                        <svg className="w-3 h-3 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                             style={{ color: hovered ? '#FF4439' : 'rgba(255,255,255,0.2)' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
                        </svg>
                        <span className="font-dm text-[11px] uppercase tracking-widest transition-colors duration-200"
                              style={{ color: hovered ? 'rgba(255,212,202,0.7)' : 'rgba(255,255,255,0.25)' }}>
                            {thread.contributionCount} {thread.contributionCount === 1 ? 'stem' : 'stems'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}