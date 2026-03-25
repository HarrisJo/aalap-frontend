import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface UserInfo { id: number; name: string; email: string; }
interface ThreadSummary {
    id: number; title: string; description: string;
    createdBy: UserInfo; createdAt: string; contributionCount: number;
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

function getRoleColor(role: string) { return ROLE_COLORS[role.split(' - ')[0].toLowerCase().trim()] ?? DEFAULT_RC; }
function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    if (diff / 60000 < 60) return `${Math.floor(diff / 60000)}m ago`;
    if (diff / 3600000 < 24) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff / 86400000 < 7)  return `${Math.floor(diff / 86400000)}d ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function getInitial(name?: string) { return (name ?? '?').charAt(0).toUpperCase(); }

// ─── COUNT-UP HOOK ────────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1400, delay = 0) {
    const [value, setValue] = useState(0);
    useEffect(() => {
        if (target === 0) { setValue(0); return; }
        let start: number | null = null, raf: number;
        const timeout = setTimeout(() => {
            const step = (ts: number) => {
                if (!start) start = ts;
                const progress = Math.min((ts - start) / duration, 1);
                setValue(Math.floor((1 - Math.pow(1 - progress, 3)) * target));
                if (progress < 1) raf = requestAnimationFrame(step); else setValue(target);
            };
            raf = requestAnimationFrame(step);
        }, delay);
        return () => { clearTimeout(timeout); cancelAnimationFrame(raf); };
    }, [target, duration, delay]);
    return value;
}

// ─── VISUAL COMPONENTS ────────────────────────────────────────────────────────
function WaveformAvatar({ initial, isReady }: { initial: string; isReady: boolean }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = canvasRef.current; if (!canvas) return;
        const ctx = canvas.getContext('2d')!; const W = canvas.width = 220, H = canvas.height = 220, cx = W / 2, cy = H / 2;
        let raf: number;
        const draw = (ts: number) => {
            ctx.clearRect(0, 0, W, H); const t = ts / 1000;
            [{ r: 72, bars: 48, speed: 0.6, amp: 6, color: 'rgba(255,68,57,0.5)', width: 1.5 },
                { r: 84, bars: 60, speed: 0.9, amp: 4, color: 'rgba(255,212,202,0.25)', width: 1 },
                { r: 96, bars: 72, speed: 0.4, amp: 3, color: 'rgba(71,91,90,0.4)', width: 1 }].forEach(ring => {
                for (let i = 0; i < ring.bars; i++) {
                    const angle = (i / ring.bars) * Math.PI * 2 - Math.PI / 2;
                    const wave = Math.sin(i * 0.4 + t * ring.speed * 2) * ring.amp + Math.sin(i * 0.15 + t * ring.speed) * (ring.amp * 0.5);
                    ctx.beginPath(); ctx.moveTo(cx + Math.cos(angle) * ring.r, cy + Math.sin(angle) * ring.r);
                    ctx.lineTo(cx + Math.cos(angle) * (ring.r + Math.max(1.5, wave + ring.amp)), cy + Math.sin(angle) * (ring.r + Math.max(1.5, wave + ring.amp)));
                    ctx.strokeStyle = ring.color; ctx.lineWidth = ring.width; ctx.stroke();
                }
            });
            const glowR = 105 + Math.sin(t * 0.8) * 3, grad = ctx.createRadialGradient(cx, cy, glowR - 4, cx, cy, glowR + 4);
            grad.addColorStop(0, 'rgba(255,68,57,0)'); grad.addColorStop(0.5, 'rgba(255,68,57,0.12)'); grad.addColorStop(1, 'rgba(255,68,57,0)');
            ctx.beginPath(); ctx.arc(cx, cy, glowR, 0, Math.PI * 2); ctx.strokeStyle = grad; ctx.lineWidth = 8; ctx.stroke();
            raf = requestAnimationFrame(draw);
        };
        raf = requestAnimationFrame(draw); return () => cancelAnimationFrame(raf);
    }, []);
    return (
        <div className="relative flex items-center justify-center" style={{ width: 220, height: 220 }}>
            <canvas ref={canvasRef} className="absolute inset-0" style={{ opacity: isReady ? 1 : 0, transition: 'opacity 1s ease' }} />
            <div className="relative z-10 w-28 h-28 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(145deg, #1e2b29 0%, #0d1614 100%)', border: '1.5px solid rgba(255,212,202,0.15)', boxShadow: '0 0 0 1px rgba(255,68,57,0.1), 0 0 40px rgba(255,68,57,0.12), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
                <span className="font-anton text-5xl text-[#FFD4CA]">{initial}</span>
            </div>
        </div>
    );
}

function FloatingNotes() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = canvasRef.current; if (!canvas) return;
        const ctx = canvas.getContext('2d')!; const resize = () => { canvas.width = window.innerWidth; canvas.height = 340; };
        resize(); window.addEventListener('resize', resize);
        const NOTES = ['♩','♪','♫','♬','𝄞'];
        const notes = Array.from({ length: 18 }, () => ({ x: Math.random() * window.innerWidth, y: Math.random() * 340, vy: -(0.15 + Math.random() * 0.25), vx: (Math.random() - 0.5) * 0.2, size: 10 + Math.random() * 10, alpha: 0.04 + Math.random() * 0.07, note: NOTES[Math.floor(Math.random() * NOTES.length)], rot: (Math.random() - 0.5) * 0.01, angle: Math.random() * 0.4 - 0.2 }));
        let raf: number;
        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            notes.forEach(n => {
                n.y += n.vy; n.x += n.vx; n.angle += n.rot; if (n.y < -20) { n.y = canvas.height + 20; n.x = Math.random() * canvas.width; }
                ctx.save(); ctx.translate(n.x, n.y); ctx.rotate(n.angle); ctx.globalAlpha = n.alpha; ctx.fillStyle = '#FFD4CA'; ctx.font = `${n.size}px serif`; ctx.fillText(n.note, 0, 0); ctx.restore();
            });
            raf = requestAnimationFrame(draw);
        };
        raf = requestAnimationFrame(draw); return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
    }, []);
    return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />;
}

function RoleDNA({ threads }: { threads: ThreadSummary[] }) {
    const counts: Record<string, number> = {};
    threads.forEach(t => Object.keys(t.rolesWithContributors).forEach(r => { const key = r.split(' - ')[0].toLowerCase().trim(); counts[key] = (counts[key] || 0) + 1; }));
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    if (total === 0) return null;
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return (
        <div className="w-full max-w-xl mx-auto mb-12" style={{ animation: 'fade-up 0.6s ease-out 0.9s both' }}>
            <p className="font-dm text-[9px] uppercase tracking-[0.3em] text-white/20 text-center mb-3">Thread DNA</p>
            <div className="flex h-2 rounded-full overflow-hidden w-full gap-[2px]">
                {entries.map(([role, count], i) => {
                    const rc = getRoleColor(role), pct = (count / total) * 100;
                    return <div key={role} style={{ width: `${pct}%`, height: '100%', borderRadius: 4, backgroundColor: rc.dot, boxShadow: `0 0 6px ${rc.glow}`, animation: `dna-grow 0.8s cubic-bezier(0.34,1.56,0.64,1) ${0.9 + i * 0.1}s both`, transform: 'scaleX(0)', transformOrigin: 'left' }} />;
                })}
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-3">
                {entries.map(([role, count]) => {
                    const rc = getRoleColor(role);
                    return (
                        <div key={role} className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: rc.dot }} />
                            <span className="font-dm text-[9px] uppercase tracking-wider" style={{ color: rc.text }}>{role} · {count}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function PublicProfilePage() {
    const navigate = useNavigate();
    const { id } = useParams(); // Grabs the ID from the URL (/users/8)

    const [userName,     setUserName]     = useState<string>('?');
    const [userEmail,    setUserEmail]    = useState<string>('');
    const [threads,      setThreads]      = useState<ThreadSummary[]>([]);
    const [isLoading,    setIsLoading]    = useState(true);
    const [isReady,      setIsReady]      = useState(false);

    // Fetch the specific user's profile based on the URL ID
    const fetchPublicProfile = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) { navigate('/auth'); return; }

        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/users/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const profile = res.data;
            setThreads(profile.threadsCreated || []);
            setUserName(profile.name || '?');
            setUserEmail(profile.email || '');

        } catch (error) {
            console.error('Failed to load public profile', error);
        } finally {
            setIsLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        fetchPublicProfile();
        setTimeout(() => setIsReady(true), 300);
    }, [fetchPublicProfile]);

    const totalStems          = threads.reduce((sum, t) => sum + t.contributionCount, 0);
    const uniqueCollaborators = new Set(threads.flatMap(t => Object.values(t.rolesWithContributors).flat())).size;

    const countThreads = useCountUp(isLoading ? 0 : threads.length,       1200, 700);
    const countStems   = useCountUp(isLoading ? 0 : totalStems,           1400, 800);
    const countCollabs = useCountUp(isLoading ? 0 : uniqueCollaborators,  1100, 900);

    const initial   = getInitial(userName);
    const nameChars = userName === '?' ? [] : userName.split('');

    return (
        <div className="min-h-screen bg-[#060808] text-[#FCFCFC] overflow-x-hidden">
            <link href="https://fonts.googleapis.com/css2?family=Anton&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap" rel="stylesheet" />
            <style>{`
                .font-anton  { font-family: 'Anton', sans-serif; }
                .font-dm     { font-family: 'DM Sans', sans-serif; }
                
                @keyframes fade-up { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
                @keyframes fade-in { from { opacity:0; } to { opacity:1; } }
                @keyframes char-drop { from { opacity:0; transform:translateY(-40px) scaleY(1.4); } to { opacity:1; transform:translateY(0) scaleY(1); } }
                @keyframes stat-pop { from { opacity:0; transform:scale(0.8) translateY(10px); } to { opacity:1; transform:scale(1) translateY(0); } }
                @keyframes name-line { from { transform:scaleX(0); opacity:0; } to { transform:scaleX(1); opacity:1; } }
                @keyframes glow-breathe { 0%,100% { opacity:0.6; transform:scale(1); } 50% { opacity:1; transform:scale(1.15); } }
                @keyframes dna-grow { from { transform:scaleX(0); } to { transform:scaleX(1); } }
                @keyframes card-rise { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
                
                
                @keyframes scan-right { from { transform:translateX(-100%); } to { transform:translateX(200%); } }
                @keyframes tag-in     { from { opacity:0; transform:scale(0.8); } to { opacity:1; transform:scale(1); } }
            `}</style>

            {/* NAVBAR (No Logout Button) */}
            <nav className="sticky top-0 z-50 bg-[#060808]/70 backdrop-blur-2xl border-b border-white/[0.05]" style={{ animation: 'fade-in 0.4s ease-out both' }}>
                <div className="max-w-[1100px] mx-auto px-6 h-14 flex items-center justify-between">
                    <button onClick={() => navigate('/home')} className="flex items-center gap-2 text-white/25 hover:text-white/70 font-dm text-sm transition-all duration-200 group">
                        <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg> Feed
                    </button>
                    <span className="font-anton text-lg tracking-widest text-white/10 uppercase select-none">Aalap</span>
                    <div className="w-16" /> {/* Spacer to center the logo */}
                </div>
            </nav>

            {/* HERO */}
            <div className="relative overflow-hidden" style={{ minHeight: 340 }}>
                <FloatingNotes />
                <div className="relative z-10 flex flex-col items-center pt-14 pb-10">
                    <div style={{ animation: 'fade-up 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.1s both' }}>
                        <WaveformAvatar initial={initial} isReady={isReady} />
                    </div>
                    <div className="flex flex-wrap justify-center items-end gap-x-[0.25em] gap-y-0 mt-4 w-full px-6 overflow-y-hidden" style={{ lineHeight: 1 }}>
                        {userName !== '?' && userName.split(' ').map((word, wi, words) => {
                            const charOffset = words.slice(0, wi).reduce((acc, w) => acc + w.length + 1, 0);
                            return (
                                <span key={wi} className="inline-flex items-end" style={{ whiteSpace: 'nowrap' }}>
                                    {word.split('').map((char, ci) => (
                                        <span key={ci} className="font-anton tracking-wide uppercase text-[#FCFCFC]" style={{ display: 'inline-block', fontSize: 'clamp(2rem, 11vw, 4.5rem)', animation: `char-drop 0.5s cubic-bezier(0.34,1.56,0.64,1) ${0.35 + (charOffset + ci) * 0.04}s both`, textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}>
                                            {char}
                                        </span>
                                    ))}
                                </span>
                            );
                        })}
                    </div>
                    <div className="mt-1 h-[2px] w-32" style={{ background: 'linear-gradient(90deg, transparent, #FF4439, transparent)', animation: 'name-line 0.6s ease-out 0.8s both' }} />
                    <p className="font-dm text-sm text-white/20 mt-3 tracking-wide" style={{ animation: 'fade-up 0.5s ease-out 0.85s both' }}>{userEmail}</p>
                </div>
            </div>

            {/* STATS BAR */}
            <div className="relative z-10 border-y border-white/[0.05]" style={{ background: 'linear-gradient(90deg, rgba(71,91,90,0.05), rgba(255,68,57,0.03), rgba(71,91,90,0.05))' }}>
                <div className="max-w-[1100px] mx-auto px-6">
                    <div className="grid grid-cols-3 divide-x divide-white/[0.05]">
                        {[{ label: 'Threads', value: countThreads, accent: '#FFD4CA', delay: '0.55s' }, { label: 'Total Stems', value: countStems, accent: '#FF4439', delay: '0.65s' }, { label: 'Collaborators', value: countCollabs, accent: '#8BAFAE', delay: '0.75s' }].map(stat => (
                            <div key={stat.label} className="group relative flex flex-col items-center py-8 cursor-default" style={{ animation: `stat-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) ${stat.delay} both` }}>
                                <p className="font-anton text-4xl sm:text-5xl md:text-6xl leading-none tabular-nums" style={{ color: stat.accent }}>{isLoading ? '—' : stat.value}</p>
                                <p className="font-dm text-[9px] sm:text-[10px] uppercase tracking-[0.15em] sm:tracking-[0.25em] text-white/20 mt-2 text-center">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* BODY */}
            <div className="relative z-10 max-w-[1100px] mx-auto px-6 pt-12 pb-28">
                {!isLoading && <RoleDNA threads={threads} />}

                <div className="flex items-center gap-4 mb-8" style={{ animation: 'fade-up 0.5s ease-out 1s both' }}>
                    <div className="flex items-center gap-3 flex-1">
                        <div className="w-6 h-[1px]" style={{ background: 'linear-gradient(90deg, #FF4439, rgba(255,68,57,0))' }} />
                        <p className="font-dm text-[10px] uppercase tracking-[0.35em] text-white/25">Threads</p>
                    </div>
                </div>

                {isLoading ? (
                    <div className="text-center py-20 text-white/20 font-dm">Loading profile...</div>
                ) : threads.length === 0 ? (
                    <div className="py-20 text-center text-white/20 italic font-dm">This artist hasn't started any threads yet.</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {threads.map((thread, i) => (
                            <ProfileThreadCard
                                key={thread.id}
                                thread={thread}
                                index={i}
                                isFirstVisit={true}
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