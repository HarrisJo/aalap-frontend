import { useState, useEffect, useRef } from 'react';
import type { ThreadSummary, ContributionResponse, ProfileThreadCardProps } from '../utils/profileUtils';
import { getRoleColor, timeAgo, getInitial } from '../utils/profileUtils';

// ─── WAVEFORM AVATAR ──────────────────────────────────────────────────────────

export function WaveformAvatar({ initial, isReady, gravatarUrl }: { initial: string; isReady: boolean; gravatarUrl?: string }) {
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
                { r: 96, bars: 72, speed: 0.4, amp: 3,  color: 'rgba(71,91,90,0.4)',     width: 1   },
            ];

            rings.forEach(ring => {
                for (let i = 0; i < ring.bars; i++) {
                    const angle = (i / ring.bars) * Math.PI * 2 - Math.PI / 2;
                    const wave  = Math.sin(i * 0.4 + t * ring.speed * 2) * ring.amp
                        + Math.sin(i * 0.15 + t * ring.speed) * (ring.amp * 0.5);
                    ctx.beginPath();
                    ctx.moveTo(cx + Math.cos(angle) * ring.r, cy + Math.sin(angle) * ring.r);
                    ctx.lineTo(cx + Math.cos(angle) * (ring.r + Math.max(1.5, wave + ring.amp)),
                               cy + Math.sin(angle) * (ring.r + Math.max(1.5, wave + ring.amp)));
                    ctx.strokeStyle = ring.color;
                    ctx.lineWidth   = ring.width;
                    ctx.stroke();
                }
            });

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
                {gravatarUrl ? (
                    <img
                        src={gravatarUrl}
                        alt={initial}
                        className="w-full h-full rounded-full object-cover"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                ) : (
                    <span className="font-anton text-5xl" style={{ color: '#FFD4CA' }}>{initial}</span>
                )}
            </div>
        </div>
    );
}

// ─── FLOATING NOTES CANVAS ────────────────────────────────────────────────────

export function FloatingNotes() {
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

export function RoleDNA({ threads }: { threads: ThreadSummary[] }) {
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
                        <div key={role} style={{
                            width: `${pct}%`, height: '100%', borderRadius: 4,
                            backgroundColor: rc.dot,
                            boxShadow: `0 0 6px ${rc.glow}`,
                            animation: `dna-grow 0.8s cubic-bezier(0.34,1.56,0.64,1) ${0.9 + i * 0.1}s both`,
                            transform: 'scaleX(0)',
                            transformOrigin: 'left',
                        }} />
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

// ─── CONTRIBUTION CARD ────────────────────────────────────────────────────────

export function ContributionCard({ stem, onClick }: { stem: ContributionResponse; onClick: () => void }) {
    const rc = getRoleColor(stem.role);

    return (
        <div onClick={onClick}
             className="group relative bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 cursor-pointer hover:border-[#FF4439]/30 transition-all">
            <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <span className="font-anton text-[10px] tracking-widest uppercase" style={{ color: rc.dot }}>
                            {stem.role.split(' - ')[0]}
                        </span>
                        <span className="text-[10px] text-white/20">•</span>
                        <span className="font-dm text-[10px] text-white/40 uppercase tracking-wider truncate max-w-[120px]">
                            {stem.noolTitle}
                        </span>
                    </div>
                    <p className="font-dm text-sm text-white/70 line-clamp-1">
                        {stem.description || 'Added to thread'}
                    </p>
                </div>
                <span className="font-dm text-[9px] text-white/20 uppercase tracking-widest whitespace-nowrap">
                    {timeAgo(stem.createdAt)}
                </span>
            </div>
        </div>
    );
}

// ─── PROFILE THREAD CARD ──────────────────────────────────────────────────────

export function ProfileThreadCard({ thread, index, isFirstVisit, onClick }: ProfileThreadCardProps) {
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

            {hovered && (
                <div className="absolute inset-y-0 w-1/2 pointer-events-none"
                     style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.025), transparent)', animation: 'scan-right 0.6s ease-out' }} />
            )}

            <div className="absolute left-0 top-0 bottom-0 w-[2px] transition-all duration-300 origin-bottom"
                 style={{
                     background: 'linear-gradient(to bottom, #FF4439, rgba(255,68,57,0.3))',
                     opacity: hovered ? 1 : 0,
                     transform: hovered ? 'scaleY(1)' : 'scaleY(0)',
                 }} />

            {roles.length > 0 && (
                <div className="h-[1px] w-full opacity-40"
                     style={{ background: `linear-gradient(90deg, ${getRoleColor(roles[0]).dot}, transparent)` }} />
            )}

            <div className="p-6 flex flex-col gap-4">
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

                <div className="flex items-center justify-between pt-3.5 border-t mt-1"
                     style={{ borderColor: hovered ? 'rgba(255,68,57,0.1)' : 'rgba(255,255,255,0.05)', transition: 'border-color 0.3s ease' }}>

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

                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200"
                         style={{
                             background: hovered ? 'rgba(255,68,57,0.08)' : 'rgba(255,255,255,0.03)',
                             border: `1px solid ${hovered ? 'rgba(255,68,57,0.2)' : 'rgba(255,255,255,0.06)'}`,
                         }}>
                        <svg className="w-3 h-3 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                             style={{ color: hovered ? '#FF4439' : 'rgba(255,255,255,0.2)' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
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

