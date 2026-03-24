import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ThreadService } from '../services/ThreadService.ts';

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface UserInfo { id: number; name: string; email?: string; }

interface Contribution {
    id: number; role: string; user?: UserInfo;
    filePath?: string; description: string; createdAt: string;
}

interface ThreadDetail {
    id: number; title: string; description: string;
    createdBy?: UserInfo; createdAt?: string;
    bpm?: number; musicalKey?: string; masterAudioUrl?: string;
    contributions?: Contribution[];
}

interface Toast { message: string; type: 'success' | 'error'; }

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const ROLES = [
    { value: 'Composer', icon: '🎹' }, { value: 'Lyricist', icon: '✍️' },
    { value: 'Singer',   icon: '🎤' }, { value: 'Producer', icon: '🎛️' },
    { value: 'Instrumentalist', icon: '🎸' },
];

const ROLE_COLORS: Record<string, { label: string; dot: string; glow: string; track: string; bar: string }> = {
    composer:        { label: '#F59E0B', dot: '#F59E0B', glow: 'rgba(245,158,11,0.35)', track: 'rgba(245,158,11,0.06)', bar: '#F59E0B' },
    lyricist:        { label: '#A78BFA', dot: '#A78BFA', glow: 'rgba(167,139,250,0.35)', track: 'rgba(167,139,250,0.06)', bar: '#A78BFA' },
    singer:          { label: '#FB7185', dot: '#FB7185', glow: 'rgba(251,113,133,0.35)', track: 'rgba(251,113,133,0.06)', bar: '#FB7185' },
    producer:        { label: '#2DD4BF', dot: '#2DD4BF', glow: 'rgba(45,212,191,0.35)', track: 'rgba(45,212,191,0.06)', bar: '#2DD4BF' },
    instrumentalist: { label: '#A3E635', dot: '#A3E635', glow: 'rgba(163,230,53,0.35)',  track: 'rgba(163,230,53,0.06)',  bar: '#A3E635' },
};
const DEFAULT_RC = { label: '#ffffff40', dot: '#ffffff30', glow: 'rgba(255,255,255,0.1)', track: 'rgba(255,255,255,0.03)', bar: '#ffffff30' };

function getRoleColor(role: string) {
    return ROLE_COLORS[role.split(' - ')[0].toLowerCase().trim()] ?? DEFAULT_RC;
}
function formatTime(secs: number) {
    if (!isFinite(secs) || secs < 0) return '0:00';
    return `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`;
}
function getInitial(name?: string) { return (name ?? '?').charAt(0).toUpperCase(); }
function formatDate(d?: string) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Generate pseudo-waveform bars (random heights, seeded by id)
function generateBars(seed: number, count = 48): number[] {
    const bars: number[] = [];
    let s = seed;
    for (let i = 0; i < count; i++) {
        s = (s * 1664525 + 1013904223) & 0xffffffff;
        bars.push(15 + (Math.abs(s) % 75));
    }
    return bars;
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function ThreadDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [thread, setThread]       = useState<ThreadDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loggedInEmail, setLoggedInEmail] = useState<string | null>(null);

    const audioRef                  = useRef<HTMLAudioElement | null>(null);
    const [playingId, setPlayingId] = useState<number | string | null>(null);
    const [progress, setProgress]   = useState(0);
    const [duration, setDuration]   = useState(0);
    const [volume, setVolume]       = useState(0.8);

    const [toast, setToast]         = useState<Toast | null>(null);
    const toastTimer                = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [modalOpen, setModalOpen]                     = useState(false);
    const [contribRole, setContribRole]                 = useState('');
    const [contribInstrument, setContribInstrument]     = useState('');
    const [contribDescription, setContribDescription]   = useState('');
    const [contribFile, setContribFile]                 = useState<File | null>(null);
    const [contribBpm, setContribBpm]                   = useState('');
    const [contribKey, setContribKey]                   = useState('');
    const [isUploading, setIsUploading]                 = useState(false);
    const [isUploadingMaster, setIsUploadingMaster]     = useState(false);

    // Decode JWT once on mount to know who is logged in
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            setLoggedInEmail(payload.sub ?? null);  // sub is the email
        } catch {
            console.warn('Could not decode JWT payload');
        }
    }, []);

    const showToast = useCallback((message: string, type: Toast['type']) => {
        setToast({ message, type });
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 3500);
    }, []);

    const fetchThread = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) { navigate('/auth'); return; }
        try {
            const res = await axios.get(
                `${import.meta.env.VITE_API_URL}/api/threads/${id}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setThread(res.data);
        } catch { console.error('Failed to load thread'); }
        finally { setIsLoading(false); }
    }, [id, navigate]);

    useEffect(() => { fetchThread(); }, [fetchThread]);

    // Audio engine
    useEffect(() => {
        if (!playingId) { audioRef.current?.pause(); audioRef.current = null; setProgress(0); setDuration(0); return; }
        let url = playingId === 'master'
            ? thread?.masterAudioUrl ?? ''
            : thread?.contributions?.find(c => c.id === playingId)?.filePath ?? '';
        if (!url) { setPlayingId(null); return; }
        audioRef.current?.pause();
        const audio = new Audio(url);
        audio.volume = volume;
        audio.onloadedmetadata = () => setDuration(audio.duration);
        audio.ontimeupdate     = () => setProgress(audio.currentTime / (audio.duration || 1));
        audio.onended          = () => { setPlayingId(null); setProgress(0); setDuration(0); };
        audio.play().catch(e => console.error('Play error:', e));
        audioRef.current = audio;
        return () => { audio.pause(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [playingId, thread]);

    useEffect(() => { if (audioRef.current) audioRef.current.volume = volume; }, [volume]);

    const togglePlay = (trackId: number | string) => setPlayingId(prev => prev === trackId ? null : trackId);

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>, trackId: number | string) => {
        if (playingId !== trackId || !audioRef.current) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
        audioRef.current.currentTime = ratio * (audioRef.current.duration || 0);
        setProgress(ratio);
    };

    const handleAddContribution = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!contribFile || !contribRole) { showToast('Choose a role and a file first.', 'error'); return; }

        let finalRole = contribRole;
        if (contribRole === 'Instrumentalist' && contribInstrument.trim()) finalRole = `Instrumentalist - ${contribInstrument.trim()}`;

        const isComposer = contribRole === 'Composer';
        setIsUploading(true);

        try {
            await ThreadService.addContribution(Number(id), finalRole, contribDescription, contribFile,
                isComposer ? Number(contribBpm) : undefined, isComposer ? contribKey : undefined);

            setModalOpen(false);
            setContribRole(''); setContribInstrument(''); setContribDescription('');
            setContribFile(null); setContribBpm(''); setContribKey('');
            showToast('Your stem is in the mix.', 'success');
            await fetchThread();

        } catch (err) {
            // 🛑 NO MORE 'any'! Safe TypeScript checking for Axios errors
            if (axios.isAxiosError(err)) {
                // Safely grab the message from our new Spring Boot ErrorResponse DTO,
                // or fallback to the raw data if it's a string.
                const errorMessage = err.response?.data?.message || err.response?.data || 'Upload failed.';
                showToast(typeof errorMessage === 'string' ? errorMessage : 'Upload failed.', 'error');
            } else {
                showToast('An unexpected error occurred.', 'error');
            }
        } finally {
            setIsUploading(false);
        }
    };

    const handleMasterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        setIsUploadingMaster(true);
        try { await ThreadService.uploadMasterMix(Number(id), file); showToast('Master mix uploaded.', 'success'); await fetchThread(); }
        catch { showToast('Master upload failed.', 'error'); }
        finally { setIsUploadingMaster(false); }
    };

    const handleDeleteContribution = async (contributionId: number) => {
        try {
            await ThreadService.deleteContribution(contributionId);
            showToast('Stem removed from the session.', 'success');
            await fetchThread();
        } catch {
            showToast('Could not delete stem. Try again.', 'error');
        }
    };

    const handleReuploadContribution = async (contributionId: number, file: File) => {
        try {
            await ThreadService.reuploadContributionFile(contributionId, file);
            showToast('Stem updated successfully.', 'success');
            await fetchThread();
        } catch {
            showToast('Reupload failed. Try again.', 'error');
        }
    };

    const contributions = thread?.contributions ?? [];
    const hasComposer   = contributions.some(c => c.role.split(' - ')[0].toLowerCase().trim() === 'composer');
    const currentTime   = duration * progress;

    // ── Loading ────────────────────────────────────────────────────────────────
    if (isLoading) return (
        <div className="min-h-screen bg-[#060808] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="flex gap-1">
                    {[0,1,2,3,4].map(i => (
                        <div key={i} className="w-1 rounded-full bg-[#FF4439]"
                             style={{ height: 32, animation: `daw-load 1s ease-in-out ${i*0.1}s infinite alternate`,
                                 animationName: 'dawLoad' }} />
                    ))}
                </div>
                <span className="font-anton text-xs text-white/20 tracking-[0.3em] uppercase">Loading Session</span>
            </div>
            <style>{`@keyframes dawLoad { from { transform: scaleY(0.2); opacity:0.3 } to { transform: scaleY(1); opacity:1 } }`}</style>
        </div>
    );

    if (!thread) return (
        <div className="min-h-screen bg-[#060808] flex flex-col items-center justify-center gap-4">
            <span className="font-anton text-3xl text-white/40 uppercase tracking-wide">Thread not found</span>
            <button onClick={() => navigate('/home')} className="font-dm text-sm text-white/20 hover:text-white/50 transition-colors">← Back to feed</button>
        </div>
    );

    // ── RENDER ────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-[#060808] text-white overflow-x-hidden">
            <link href="https://fonts.googleapis.com/css2?family=Anton&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&family=Caveat:wght@400;500;600;700&display=swap" rel="stylesheet" />

            <style>{`
                .font-anton { font-family: 'Anton', sans-serif; }
                .font-dm    { font-family: 'DM Sans', sans-serif; }
                .font-caveat { font-family: 'Caveat', cursive; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

                @keyframes paper-in     { from { opacity:0; transform: rotate(-8deg) translateY(20px) scale(0.92); } to { opacity:1; transform: rotate(-7deg) translateY(0) scale(1); } }
                @keyframes paper-float  { 0%,100% { transform: rotate(-7deg) translateY(0); } 50% { transform: rotate(-6.2deg) translateY(-4px); } }
                @keyframes pencil-draw  { from { stroke-dashoffset: 300; opacity:0; } to { stroke-dashoffset: 0; opacity:1; } }
                @keyframes ink-fade-in  { from { opacity:0; transform: translateY(4px); } to { opacity:1; transform: translateY(0); } }

                @keyframes toast-up    { from { opacity:0; transform:translateY(8px); }  to { opacity:1; transform:translateY(0); } }
                @keyframes modal-in    { from { opacity:0; transform:scale(0.97) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }
                @keyframes track-in    { from { opacity:0; transform:translateX(24px); } to { opacity:1; transform:translateX(0); } }
                @keyframes thread-draw { from { stroke-dashoffset: 2000; } to { stroke-dashoffset: 0; } }
                @keyframes node-pulse  { 0%,100% { transform:scale(1); opacity:0.8; } 50% { transform:scale(1.4); opacity:1; } }
                @keyframes bar-play    { 0%,100% { transform:scaleY(0.3); } 50% { transform:scaleY(1); } }
                @keyframes header-in   { from { opacity:0; transform:translateY(-12px); } to { opacity:1; transform:translateY(0); } }
                @keyframes glow-pulse  { 0%,100% { opacity:0.4; } 50% { opacity:1; } }
                @keyframes scan-line   { from { transform:translateX(-100%); } to { transform:translateX(100%); } }
                @keyframes dawLoad     { from { transform:scaleY(0.2); opacity:0.3 } to { transform:scaleY(1); opacity:1 } }
                @keyframes ripple-in   { from { transform:scale(0.6); opacity:0; } to { transform:scale(1); opacity:1; } }
                @keyframes thread-pulse-down { 0% { transform:translateY(-100%); opacity:0; } 50% { opacity:1; } 100% { transform:translateY(200%); opacity:0; } }

                .bar-playing { animation: bar-play 0.4s ease-in-out infinite alternate; }
                .track-glow  { transition: box-shadow 0.3s ease; }

                input[type=range] { -webkit-appearance: none; appearance: none; background: transparent; cursor: pointer; }
                input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width:12px; height:12px; border-radius:50%; background:#FF4439; }
                input[type=range]::-webkit-slider-runnable-track { height:2px; border-radius:2px; background: rgba(255,255,255,0.1); }
            `}</style>

            {/* TOAST */}
            {toast && (
                <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-2xl
                    text-sm font-dm backdrop-blur-md border shadow-2xl whitespace-nowrap animate-[toast-up_0.25s_ease-out]
                    ${toast.type === 'success' ? 'bg-[#0a1f1e]/95 border-[#2DD4BF]/30 text-[#2DD4BF]' : 'bg-[#1a0808]/95 border-[#FF4439]/30 text-[#FF4439]'}`}>
                    {toast.message}
                </div>
            )}

            {/* DROP A STEM MODAL */}
            {modalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={() => setModalOpen(false)} />
                    <div className="relative w-full max-w-[500px] animate-[modal-in_0.25s_ease-out]">
                        <div className="absolute -inset-[1px] rounded-2xl z-0"
                             style={{ background: 'linear-gradient(135deg, rgba(255,68,57,0.5) 0%, rgba(71,91,90,0.2) 100%)' }} />
                        <div className="relative z-10 bg-[#080C0B]/98 backdrop-blur-2xl rounded-2xl overflow-hidden">
                            <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, #FF4439, #A78BFA, #2DD4BF)' }} />
                            <div className="p-7">
                                <div className="flex items-start justify-between mb-6">
                                    <div>
                                        <p className="font-dm text-[10px] text-[#FF4439]/60 uppercase tracking-[0.3em] mb-1">Add to session</p>
                                        <h2 className="font-anton text-3xl tracking-wide uppercase">Drop a Stem</h2>
                                        <p className="font-dm text-sm text-white/30 mt-1 italic">Add your part to this thread.</p>
                                    </div>
                                    <button onClick={() => setModalOpen(false)}
                                            className="w-9 h-9 rounded-full border border-white/10 bg-white/5 hover:border-[#FF4439]/40 hover:text-[#FF4439] flex items-center justify-center text-white/30 transition-all">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                                    </button>
                                </div>
                                <form onSubmit={handleAddContribution} className="flex flex-col gap-5">
                                    {/* Role pills */}
                                    <div className="flex flex-col gap-2">
                                        <label className="font-dm text-[10px] text-white/25 uppercase tracking-widest">Your role</label>
                                        <div className="flex flex-wrap gap-2">
                                            {ROLES.map(r => {
                                                const sel = contribRole === r.value;
                                                const rc = getRoleColor(r.value);
                                                return (
                                                    <button key={r.value} type="button"
                                                            onClick={() => { setContribRole(r.value); if (r.value !== 'Instrumentalist') setContribInstrument(''); }}
                                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-dm text-xs tracking-wide transition-all`}
                                                            style={sel
                                                                ? { borderColor: rc.dot, backgroundColor: rc.track, color: rc.dot, boxShadow: `0 0 12px ${rc.glow}` }
                                                                : { borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.4)' }}>
                                                        <span>{r.icon}</span>{r.value}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {contribRole === 'Composer' && hasComposer && (
                                            <p className="font-dm text-xs text-[#FF4439]/80 mt-1">This thread already has a composer.</p>
                                        )}
                                    </div>

                                    {contribRole === 'Instrumentalist' && (
                                        <div className="flex flex-col gap-2">
                                            <label className="font-dm text-[10px] text-white/25 uppercase tracking-widest">Which instrument?</label>
                                            <input type="text" required value={contribInstrument} onChange={e => setContribInstrument(e.target.value)}
                                                   placeholder="e.g. Piano, Tabla, Electric Guitar"
                                                   className="w-full bg-white/[0.03] border border-white/10 text-white placeholder:text-white/20 px-4 py-3 rounded-xl font-dm text-sm focus:outline-none focus:border-white/25 transition-colors" />
                                        </div>
                                    )}

                                    {contribRole === 'Composer' && !hasComposer && (
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="flex flex-col gap-2">
                                                <label className="font-dm text-[10px] text-white/25 uppercase tracking-widest">Tempo (BPM)</label>
                                                <input type="number" required value={contribBpm} onChange={e => setContribBpm(e.target.value)} placeholder="e.g. 128"
                                                       className="w-full bg-white/[0.03] border border-white/10 text-white placeholder:text-white/20 px-4 py-3 rounded-xl font-dm text-sm focus:outline-none focus:border-white/25 transition-colors" />
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <label className="font-dm text-[10px] text-white/25 uppercase tracking-widest">Key / Scale</label>
                                                <input type="text" required value={contribKey} onChange={e => setContribKey(e.target.value)} placeholder="e.g. C Major"
                                                       className="w-full bg-white/[0.03] border border-white/10 text-white placeholder:text-white/20 px-4 py-3 rounded-xl font-dm text-sm focus:outline-none focus:border-white/25 transition-colors" />
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex flex-col gap-2">
                                        <label className="font-dm text-[10px] text-white/25 uppercase tracking-widest">What did you add?</label>
                                        <textarea rows={2} value={contribDescription} onChange={e => setContribDescription(e.target.value)}
                                                  placeholder="Briefly describe your contribution..."
                                                  className="w-full bg-white/[0.03] border border-white/10 text-white placeholder:text-white/20 px-4 py-3 rounded-xl font-dm text-sm focus:outline-none focus:border-white/25 transition-colors resize-none" />
                                    </div>

                                    {/* File upload */}
                                    <div className="flex flex-col gap-2">
                                        <label className="font-dm text-[10px] text-white/25 uppercase tracking-widest">File</label>
                                        <label className={`relative flex items-center gap-4 px-5 py-4 rounded-xl border border-dashed cursor-pointer transition-all
                                            ${contribFile ? 'bg-[#2DD4BF]/5 border-[#2DD4BF]/30' : 'bg-white/[0.02] border-white/10 hover:border-white/20'}`}>
                                            <input type="file" required accept="audio/*, text/plain" onChange={e => setContribFile(e.target.files?.[0] ?? null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                                            <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center transition-colors ${contribFile ? 'bg-[#2DD4BF]/20 text-[#2DD4BF]' : 'bg-white/5 text-white/25'}`}>
                                                {contribFile
                                                    ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
                                                    : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                {contribFile ? (
                                                    <><span className="font-dm text-sm text-[#2DD4BF] truncate">{contribFile.name}</span>
                                                        <span className="font-dm text-xs text-white/30 mt-0.5">{(contribFile.size/1048576).toFixed(2)} MB</span></>
                                                ) : (
                                                    <><span className="font-dm text-sm text-white/35">Choose a file</span>
                                                        <span className="font-dm text-xs text-white/20 mt-0.5">MP3, WAV, FLAC, TXT</span></>
                                                )}
                                            </div>
                                        </label>
                                    </div>

                                    <button type="submit" disabled={isUploading || (contribRole === 'Composer' && hasComposer)}
                                            className={`group/btn relative w-full py-3.5 rounded-xl font-anton tracking-[0.2em] text-sm uppercase overflow-hidden transition-all active:scale-[0.98]
                                                ${(isUploading || (contribRole === 'Composer' && hasComposer)) ? 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5' : 'text-white/70 hover:text-white border border-[#2DD4BF]/30 hover:border-[#2DD4BF]/60'}`}>
                                        <div className="absolute inset-0 translate-x-[-100%] group-hover/btn:translate-x-0 transition-transform duration-300 ease-out"
                                             style={{ background: 'linear-gradient(135deg, #0a3a35 0%, #0d2e2a 100%)' }} />
                                        <span className="relative z-10 flex items-center justify-center gap-2">
                                            {isUploading ? <>
                                                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                                                Uploading...
                                            </> : 'Add to Thread'}
                                        </span>
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── NAVBAR ──────────────────────────────────────────────────────── */}
            <nav className="sticky top-0 z-50 bg-[#060808]/90 backdrop-blur-xl border-b border-white/[0.06]"
                 style={{ animation: 'header-in 0.4s ease-out both' }}>
                <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between">
                    <button onClick={() => navigate('/home')}
                            className="flex items-center gap-2 text-white/30 hover:text-white/70 font-dm text-sm transition-colors group">
                        <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
                        </svg>
                        Feed
                    </button>
                    <div className="flex items-center gap-1.5 text-white/20 font-dm text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF4439]/60 animate-pulse shrink-0" />
                        <span>Last updated</span>
                        <span className="text-white/35">
                            {contributions.length > 0
                                ? (() => {
                                    const latest = contributions.reduce((a, b) =>
                                        new Date(a.createdAt) > new Date(b.createdAt) ? a : b
                                    );
                                    const diff = Date.now() - new Date(latest.createdAt).getTime();
                                    const mins  = Math.floor(diff / 60000);
                                    const hours = Math.floor(diff / 3600000);
                                    const days  = Math.floor(diff / 86400000);
                                    if (mins < 60)  return `${mins}m ago`;
                                    if (hours < 24) return `${hours}h ago`;
                                    if (days < 7)   return `${days}d ago`;
                                    return new Date(latest.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                })()
                                : formatDate(thread.createdAt)
                            }
                        </span>
                    </div>
                </div>
            </nav>

            {/* ── THREAD HEADER ───────────────────────────────────────────────── */}
            <div className="max-w-[1200px] mx-auto px-6 pt-10 pb-8" style={{ animation: 'header-in 0.5s ease-out 0.1s both' }}>
                <div className="flex items-start justify-between gap-12">

                    {/* Left — title + description + cta */}
                    <div className="flex-1 min-w-0">
                        <p className="font-dm text-[10px] text-white/20 uppercase tracking-[0.3em] mb-2">
                            Session — started by{' '}
                            <button onClick={() => thread.createdBy && navigate(`/users/${thread.createdBy.id}`)}
                                    className="text-[#FFD4CA]/50 hover:text-[#FFD4CA] transition-colors">
                                {thread.createdBy?.name}
                            </button>
                            {thread.createdAt && <> · {formatDate(thread.createdAt)}</>}
                        </p>
                        <h1 className="font-anton text-5xl md:text-6xl leading-none tracking-wide uppercase text-white">
                            {thread.title}
                        </h1>
                        {thread.description && (
                            <p className="font-dm text-white/40 text-base mt-3 leading-relaxed max-w-2xl">
                                {thread.description}
                            </p>
                        )}
                        <button onClick={() => setModalOpen(true)}
                                className="mt-6 flex items-center gap-2 px-5 py-2.5 rounded-xl font-anton text-xs tracking-widest uppercase transition-all active:scale-95 bg-[#FF4439] hover:bg-[#B72F30] text-white"
                                style={{ boxShadow: '0 0 20px rgba(255,68,57,0.2)' }}>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
                            Drop a Stem
                        </button>
                    </div>

                    {/* Right — paper note + contributors */}
                    {contributions.length > 0 && (
                        <div className="shrink-0 hidden md:flex items-start gap-6 pt-1">

                            {/* ── PAPER NOTE ── */}
                            {(thread.bpm || thread.musicalKey) && (
                                <div className="relative self-center"
                                     style={{ animation: 'paper-in 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.4s both' }}>

                                    {/* Drop shadow beneath paper */}
                                    <div className="absolute -bottom-2 left-2 right-2 h-full rounded-sm opacity-40 blur-md"
                                         style={{ background: 'rgba(0,0,0,0.8)', zIndex: 0 }} />

                                    {/* Paper body */}
                                    <div className="relative z-10 w-[148px] px-5 pt-5 pb-6 rounded-sm"
                                         style={{
                                             background: 'linear-gradient(160deg, #f5f0e8 0%, #ede6d6 40%, #e8dfc8 100%)',
                                             animation: 'paper-float 5s ease-in-out 1.2s infinite',
                                             boxShadow: '2px 4px 20px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(0,0,0,0.04)',
                                         }}>

                                        {/* Ruled lines behind text */}
                                        {[0,1,2,3,4,5].map(i => (
                                            <div key={i} className="absolute left-0 right-0 h-px"
                                                 style={{ top: 28 + i * 22, background: 'rgba(100,120,180,0.12)' }} />
                                        ))}

                                        {/* Top red margin line */}
                                        <div className="absolute top-0 bottom-0 left-9 w-px"
                                             style={{ background: 'rgba(220,60,60,0.25)' }} />

                                        {/* Pencil sketch — musical staff lines */}
                                        <svg className="absolute top-2 right-2 opacity-10" width="28" height="20" viewBox="0 0 28 20">
                                            {[2,6,10,14,18].map(y => (
                                                <line key={y} x1="0" y1={y} x2="28" y2={y} stroke="#3a3020" strokeWidth="0.8"
                                                      style={{ strokeDasharray: 28, strokeDashoffset: 28,
                                                          animation: `pencil-draw 0.6s ease-out ${0.8 + y*0.04}s both` }} />
                                            ))}
                                            {/* Quarter note */}
                                            <ellipse cx="8" cy="15" rx="3" ry="2" fill="#3a3020" opacity="0.7"
                                                     style={{ animation: 'ink-fade-in 0.4s ease-out 1.4s both' }} />
                                            <line x1="11" y1="15" x2="11" y2="5" stroke="#3a3020" strokeWidth="0.9"
                                                  style={{ strokeDasharray: 10, strokeDashoffset: 10,
                                                      animation: 'pencil-draw 0.3s ease-out 1.5s both' }} />
                                        </svg>

                                        {/* Label */}
                                        <p className="font-caveat text-[10px] text-[#8a7a5a] mb-2 tracking-wide"
                                           style={{ animation: 'ink-fade-in 0.5s ease-out 0.7s both' }}>
                                            session notes
                                        </p>

                                        {/* BPM */}
                                        {thread.bpm && (
                                            <div className="mb-3" style={{ animation: 'ink-fade-in 0.5s ease-out 0.85s both' }}>
                                                <p className="font-caveat text-[11px] text-[#7a6a4a] leading-none mb-0.5">tempo</p>
                                                <p className="font-caveat leading-none"
                                                   style={{ fontSize: 38, color: '#2a2010', fontWeight: 600,
                                                       textShadow: '0.5px 0.5px 0 rgba(0,0,0,0.08)' }}>
                                                    {thread.bpm}
                                                    <span className="text-base font-normal text-[#7a6a4a] ml-1">bpm</span>
                                                </p>
                                            </div>
                                        )}

                                        {/* Pencil underline */}
                                        {thread.bpm && (
                                            <svg width="100%" height="6" className="mb-3 -mt-1 opacity-30">
                                                <path d="M0 3 Q30 1 60 4 Q90 6 110 3" fill="none" stroke="#3a3020" strokeWidth="1.2" strokeLinecap="round"
                                                      style={{ strokeDasharray: 120, strokeDashoffset: 120,
                                                          animation: 'pencil-draw 0.6s ease-out 1s both' }} />
                                            </svg>
                                        )}

                                        {/* Key */}
                                        {thread.musicalKey && (
                                            <div style={{ animation: 'ink-fade-in 0.5s ease-out 1.1s both' }}>
                                                <p className="font-caveat text-[11px] text-[#7a6a4a] leading-none mb-0.5">key</p>
                                                <p className="font-caveat leading-none"
                                                   style={{ fontSize: 26, color: '#2a2010', fontWeight: 600,
                                                       textShadow: '0.5px 0.5px 0 rgba(0,0,0,0.08)' }}>
                                                    {thread.musicalKey}
                                                </p>
                                            </div>
                                        )}

                                        {/* Pencil scribble doodle bottom corner */}
                                        <svg className="absolute bottom-2 right-2 opacity-15" width="24" height="24" viewBox="0 0 24 24">
                                            <path d="M4 20 L8 8 L12 14 L16 6 L20 12" fill="none" stroke="#3a3020" strokeWidth="1" strokeLinecap="round"
                                                  style={{ strokeDasharray: 60, strokeDashoffset: 60,
                                                      animation: 'pencil-draw 1s ease-out 1.6s both' }} />
                                        </svg>

                                        {/* Tape strip at top */}
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-10 h-5 rounded-sm opacity-60"
                                             style={{ background: 'linear-gradient(135deg, rgba(255,235,180,0.8), rgba(255,220,120,0.6))',
                                                 boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                                 backdropFilter: 'blur(1px)' }} />
                                    </div>
                                </div>
                            )}

                            {/* ── CONTRIBUTORS ── */}
                            <div className="flex flex-col items-end gap-4">
                                <p className="font-dm text-[9px] uppercase tracking-[0.3em] text-white/15">
                                    Woven by
                                </p>
                                <div className="flex flex-col gap-3">
                                    {contributions.map((c, i) => {
                                        const rc = getRoleColor(c.role);
                                        return (
                                            <button
                                                key={c.id}
                                                onClick={() => c.user?.id && navigate(`/users/${c.user.id}`)}
                                                className="flex items-center gap-3 group/av transition-all duration-200 hover:-translate-x-1"
                                                style={{ animation: `track-in 0.4s ease-out ${i * 0.07}s both` }}
                                            >
                                                <div className="flex flex-col items-end gap-0.5">
                                                    <span className="font-dm text-xs text-white/50 group-hover/av:text-white/80 transition-colors leading-none">
                                                        {c.user?.name ?? 'Unknown'}
                                                    </span>
                                                    <span className="font-dm text-[9px] uppercase tracking-wider leading-none"
                                                          style={{ color: rc.dot + 'aa' }}>
                                                        {c.role.split(' - ')[0]}
                                                    </span>
                                                </div>
                                                <div className="w-9 h-9 rounded-full flex items-center justify-center font-anton text-sm shrink-0 transition-all duration-200 group-hover/av:scale-110"
                                                     style={{
                                                         backgroundColor: rc.dot + '18',
                                                         border: `1.5px solid ${rc.dot}50`,
                                                         color: rc.dot,
                                                         boxShadow: `0 0 12px ${rc.dot}20`,
                                                     }}>
                                                    {getInitial(c.user?.name)}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="w-[1px] h-6 self-end mr-[17px]"
                                     style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.08), transparent)' }} />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── DAW SECTION ─────────────────────────────────────────────────── */}
            <div className="max-w-[1200px] mx-auto px-6 pb-32">

                {/* MASTER TRACK */}
                {thread.masterAudioUrl ? (
                    <MasterTrack
                        url={thread.masterAudioUrl}
                        isPlaying={playingId === 'master'}
                        progress={progress}
                        duration={duration}
                        currentTime={currentTime}
                        onToggle={() => togglePlay('master')}
                        onSeek={e => handleSeek(e, 'master')}
                        volume={volume}
                        onVolume={setVolume}
                    />
                ) : (
                    <label className="relative flex items-center gap-3 px-5 py-3.5 rounded-xl border border-dashed border-white/[0.06] bg-white/[0.01] hover:border-white/[0.12] hover:bg-white/[0.02] cursor-pointer transition-all group mb-8">
                        <input type="file" accept="audio/*" onChange={handleMasterUpload} disabled={isUploadingMaster} className="absolute inset-0 opacity-0 cursor-pointer" />
                        <svg className="w-4 h-4 text-white/15 group-hover:text-white/30 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
                        </svg>
                        <span className="font-dm text-sm text-white/20 group-hover:text-white/35 transition-colors">
                            {isUploadingMaster ? 'Uploading master mix...' : 'Upload the finished master mix'}
                        </span>
                    </label>
                )}

                {/* DAW TRACKS */}
                {contributions.length > 0 ? (
                    <div className="relative">
                        {/* Label */}
                        <p className="font-dm text-[10px] text-white/15 uppercase tracking-[0.3em] mb-6">
                            How this was built — {contributions.length} stem{contributions.length !== 1 ? 's' : ''}
                        </p>

                        {/* Thread spine + tracks */}
                        <div className="relative flex gap-0">

                            {/* SVG Thread spine */}
                            <ThreadSpine contributions={contributions} />

                            {/* Track lanes */}
                            <div className="flex-1 flex flex-col gap-2 pl-4">
                                {contributions.map((contrib, i) => (
                                    <StemTrack
                                        key={contrib.id}
                                        contrib={contrib}
                                        index={i}
                                        isPlaying={playingId === contrib.id}
                                        progress={progress}
                                        duration={duration}
                                        currentTime={currentTime}
                                        onToggle={() => togglePlay(contrib.id)}
                                        onSeek={e => handleSeek(e, contrib.id)}
                                        onCreatorClick={() => contrib.user?.id && navigate(`/users/${contrib.user.id}`)}
                                        isOwner={loggedInEmail !== null && contrib.user?.email === loggedInEmail}
                                        onDelete={() => handleDeleteContribution(contrib.id)}
                                        onReupload={(file) => handleReuploadContribution(contrib.id, file)}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Thread line + CTA */}
                        <div className="relative flex flex-col items-center mt-0">

                            {/* Short gradient line from last stem */}
                            <div className="relative w-[2px] overflow-hidden" style={{ height: 20 }}>
                                <div className="absolute inset-0"
                                     style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.08), rgba(255,68,57,0.5))' }} />
                                <div className="absolute inset-x-0 h-8"
                                     style={{ background: 'linear-gradient(to bottom, transparent, #fff, transparent)',
                                         animation: 'thread-pulse-down 1.8s ease-in-out infinite',
                                         filter: 'blur(1px)' }} />
                            </div>

                            {/* Pulsing node */}
                            <div className="relative w-2 h-2 z-10">
                                <div className="absolute inset-0 rounded-full animate-ping"
                                     style={{ backgroundColor: '#FF4439', opacity: 0.5, animationDuration: '1.4s' }} />
                                <div className="w-2 h-2 rounded-full bg-[#FF4439]"
                                     style={{ boxShadow: '0 0 8px rgba(255,68,57,1), 0 0 16px rgba(255,68,57,0.5)' }} />
                            </div>

                            {/* Connector */}
                            <div className="w-[2px]" style={{ height: 12,
                                background: 'linear-gradient(to bottom, #FF4439, rgba(255,68,57,0.3))' }} />

                            {/* THE BUTTON */}
                            <div className="relative group/cta">

                                {/* Simple red border — no blur, no bloom */}
                                <div className="absolute -inset-[1px] rounded-xl pointer-events-none"
                                     style={{ background: 'linear-gradient(135deg, #FF4439, #7A1A1A)',
                                         opacity: 0.5 }} />

                                <button
                                    onClick={() => setModalOpen(true)}
                                    className="relative z-10 flex items-center gap-3 px-8 py-3.5 rounded-xl overflow-hidden transition-all duration-300 active:scale-[0.97]"
                                    style={{ background: '#0a0808' }}
                                >
                                    {/* Layer 1 — dark crimson base floods in first */}
                                    <div className="absolute inset-0 -translate-x-full group-hover/cta:translate-x-0 transition-transform duration-[350ms] ease-out pointer-events-none"
                                         style={{ background: '#7A1A1A' }} />
                                    {/* Layer 2 — bright red chases it slightly delayed */}
                                    <div className="absolute inset-0 -translate-x-full group-hover/cta:translate-x-0 transition-transform duration-[350ms] ease-out pointer-events-none"
                                         style={{ background: 'linear-gradient(90deg, #B72F30, #FF4439)', transitionDelay: '60ms' }} />
                                    {/* Layer 3 — hot white leading edge flash */}
                                    <div className="absolute inset-y-0 w-[40px] -left-[40px] group-hover/cta:left-full transition-all duration-[350ms] ease-out pointer-events-none"
                                         style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
                                             transitionDelay: '80ms', filter: 'blur(6px)' }} />

                                    {/* Icon */}
                                    <div className="relative z-10 w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-[#FF4439]/20 border border-[#FF4439]/30 group-hover/cta:bg-white/20 group-hover/cta:border-white/30 transition-all duration-300">
                                        <svg className="w-3 h-3 text-[#FF4439] group-hover/cta:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/>
                                        </svg>
                                    </div>

                                    <span className="relative z-10 font-anton text-sm tracking-[0.15em] uppercase text-white/40 group-hover/cta:text-white transition-colors duration-300">
                                        Add contribution to this thread
                                    </span>

                                    <svg className="relative z-10 w-3.5 h-3.5 text-white/15 group-hover/cta:text-white/70 group-hover/cta:translate-x-1 transition-all duration-300 shrink-0"
                                         fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="py-24 text-center">
                        <div className="w-16 h-16 rounded-full border border-white/10 bg-white/[0.02] flex items-center justify-center mx-auto mb-5">
                            <svg className="w-7 h-7 text-white/15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
                            </svg>
                        </div>
                        <p className="font-dm text-white/20 text-base italic mb-6">No stems yet. Be the first to shape this track.</p>
                        <button onClick={() => setModalOpen(true)}
                                className="font-anton text-sm tracking-widest uppercase text-[#FF4439] border border-[#FF4439]/30 px-6 py-3 rounded-xl hover:bg-[#FF4439]/10 transition-colors">
                            Drop the first stem
                        </button>
                    </div>
                )}
            </div>

            {/* Mobile FAB */}
            <div className="fixed bottom-6 right-6 z-50 sm:hidden">
                <button onClick={() => setModalOpen(true)}
                        className="w-14 h-14 rounded-full bg-[#FF4439] hover:bg-[#B72F30] text-white flex items-center justify-center active:scale-95 transition-all"
                        style={{ boxShadow: '0 0 30px rgba(255,68,57,0.4)' }}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
                </button>
            </div>
        </div>
    );
}

// ─── THREAD SPINE SVG ─────────────────────────────────────────────────────────

function ThreadSpine({ contributions }: { contributions: Contribution[] }) {
    const TRACK_HEIGHT = 88; // px per track (approximate)
    const GAP = 8;
    const totalH = contributions.length * (TRACK_HEIGHT + GAP);
    const cx = 16;

    return (
        <div className="relative shrink-0" style={{ width: 32 }}>
            <svg width="32" height={totalH} viewBox={`0 0 32 ${totalH}`} className="absolute top-0 left-0">
                {/* Main spine line */}
                <line
                    x1={cx} y1="0" x2={cx} y2={totalH}
                    stroke="rgba(255,255,255,0.06)" strokeWidth="1.5"
                />
                {/* Animated colored spine */}
                <line
                    x1={cx} y1="0" x2={cx} y2={totalH}
                    stroke="url(#spineGrad)" strokeWidth="1.5"
                    strokeDasharray={totalH}
                    style={{ animation: 'thread-draw 1.8s cubic-bezier(0.4,0,0.2,1) 0.3s both' }}
                />

                <defs>
                    <linearGradient id="spineGrad" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
                        {contributions.map((c, i) => {
                            const rc = getRoleColor(c.role);
                            const pct = (i / Math.max(contributions.length - 1, 1)) * 100;
                            return <stop key={i} offset={`${pct}%`} stopColor={rc.dot} stopOpacity="0.7" />;
                        })}
                    </linearGradient>
                </defs>

                {/* Node per track */}
                {contributions.map((c, i) => {
                    const rc = getRoleColor(c.role);
                    const y = i * (TRACK_HEIGHT + GAP) + (TRACK_HEIGHT / 2);
                    return (
                        <g key={c.id}>
                            {/* Glow ring */}
                            <circle cx={cx} cy={y} r="8" fill="none" stroke={rc.dot} strokeWidth="1" opacity="0.2"
                                    style={{ animation: `node-pulse 2.5s ease-in-out ${i * 0.3}s infinite` }} />
                            {/* Core dot */}
                            <circle cx={cx} cy={y} r="4" fill={rc.dot} opacity="0"
                                    style={{ animation: `ripple-in 0.4s ease-out ${0.4 + i * 0.15}s both` }} />
                            {/* Connector tick to track */}
                            <line x1={cx} y1={y} x2="32" y2={y} stroke={rc.dot} strokeWidth="1" opacity="0.3" />
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}

// ─── STEM TRACK ───────────────────────────────────────────────────────────────

interface StemTrackProps {
    contrib: Contribution; index: number;
    isPlaying: boolean; progress: number; duration: number; currentTime: number;
    onToggle: () => void; onSeek: (e: React.MouseEvent<HTMLDivElement>) => void;
    onCreatorClick: () => void;
    isOwner: boolean;
    onDelete: () => void;
    onReupload: (file: File) => void;
}

function StemTrack({ contrib, index, isPlaying, progress, duration, currentTime, onToggle, onSeek, onCreatorClick, isOwner, onDelete, onReupload }: StemTrackProps) {
    const rc = getRoleColor(contrib.role);
    const bars = useMemo(() => generateBars(contrib.id, 52), [contrib.id]);
    const hasAudio = !!contrib.filePath;
    const reuploadRef = useRef<HTMLInputElement>(null);
    const [confirmingDelete, setConfirmingDelete] = useState(false);

    return (
        <div
            className="relative rounded-xl overflow-hidden border transition-all duration-300 group"
            style={{
                borderColor: isPlaying ? rc.dot + '50' : 'rgba(255,255,255,0.06)',
                backgroundColor: isPlaying ? rc.track : 'rgba(255,255,255,0.02)',
                boxShadow: isPlaying ? `0 0 30px ${rc.glow}, inset 0 0 40px ${rc.track}` : 'none',
                animation: `track-in 0.4s ease-out ${index * 0.08}s both`,
            }}
        >
            {/* Left colored border */}
            <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl transition-opacity duration-300"
                 style={{ backgroundColor: rc.dot, opacity: isPlaying ? 1 : 0.35 }} />

            {/* Scan line when playing */}
            {isPlaying && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
                    <div className="absolute inset-y-0 w-[60%] opacity-[0.04]"
                         style={{ background: `linear-gradient(90deg, transparent, ${rc.dot}, transparent)`,
                             animation: 'scan-line 2s linear infinite' }} />
                </div>
            )}

            <div className="flex items-center gap-0 pl-4 pr-4 py-3">

                {/* Role + Artist info */}
                <div className="flex items-center gap-3 w-[200px] shrink-0">
                    {/* Avatar */}
                    <button onClick={onCreatorClick}
                            className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center font-anton text-sm transition-all hover:scale-105"
                            style={{ backgroundColor: rc.dot + '20', border: `1.5px solid ${rc.dot}50`, color: rc.dot, boxShadow: isPlaying ? `0 0 12px ${rc.glow}` : 'none' }}>
                        {getInitial(contrib.user?.name)}
                    </button>
                    <div className="min-w-0">
                        {/* Role badge */}
                        <div className="flex items-center gap-1 mb-0.5">
                            <span className="font-anton text-[10px] tracking-widest uppercase leading-none"
                                  style={{ color: rc.dot }}>
                                {contrib.role.split(' - ')[0]}
                            </span>
                            {contrib.role.includes(' - ') && (
                                <span className="font-dm text-[9px] text-white/30">· {contrib.role.split(' - ')[1]}</span>
                            )}
                        </div>
                        {/* Name */}
                        <button onClick={onCreatorClick} className="font-dm text-sm text-white/60 hover:text-white transition-colors leading-none truncate block max-w-[120px]">
                            {contrib.user?.name ?? 'Unknown'}
                        </button>
                        {/* Date */}
                        <span className="font-dm text-[9px] text-white/20 leading-none mt-0.5 block">
                            {formatDate(contrib.createdAt)}
                        </span>
                    </div>
                </div>

                {/* Play button */}
                {hasAudio && (
                    <button onClick={onToggle}
                            className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center transition-all mx-3"
                            style={isPlaying
                                ? { backgroundColor: rc.dot, color: '#000', boxShadow: `0 0 16px ${rc.glow}` }
                                : { backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>
                        {isPlaying
                            ? <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg>
                            : <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                    </button>
                )}

                {/* Waveform + progress */}
                <div className="flex-1 flex flex-col gap-2 min-w-0">
                    {/* Waveform bars */}
                    {hasAudio && (
                        <div className="flex items-end gap-[2px] h-10 cursor-pointer" onClick={onToggle}>
                            {bars.map((h, i) => {
                                const inProgress = isPlaying && (i / bars.length) < progress;
                                return (
                                    <div
                                        key={i}
                                        className={isPlaying ? 'bar-playing' : ''}
                                        style={{
                                            width: 3,
                                            height: `${h}%`,
                                            borderRadius: 2,
                                            backgroundColor: inProgress ? rc.bar : rc.dot + '30',
                                            transition: 'background-color 0.1s',
                                            animationDelay: isPlaying ? `${(i % 8) * 0.05}s` : '0s',
                                            animationDuration: isPlaying ? `${0.3 + (i % 5) * 0.08}s` : '0s',
                                            flexShrink: 0,
                                        }}
                                    />
                                );
                            })}
                        </div>
                    )}

                    {/* Description */}
                    {contrib.description && (
                        <p className="font-dm text-xs text-white/30 leading-relaxed truncate">{contrib.description}</p>
                    )}

                    {/* Progress bar (seekable) */}
                    {hasAudio && (
                        <div className="flex items-center gap-3">
                            <div className="flex-1 h-[3px] rounded-full bg-white/[0.06] cursor-pointer overflow-hidden group/prog" onClick={onSeek}>
                                <div className="h-full rounded-full transition-all duration-100"
                                     style={{ width: `${isPlaying ? progress * 100 : 0}%`, backgroundColor: rc.bar }} />
                            </div>
                            <span className="font-dm text-[10px] text-white/20 tabular-nums shrink-0 w-[80px] text-right">
                                {isPlaying ? `${formatTime(currentTime)} / ${formatTime(duration)}` : formatTime(duration)}
                            </span>
                        </div>
                    )}
                </div>

                {/* Download */}
                {hasAudio && (
                    <a href={contrib.filePath?.replace('/upload/', '/upload/fl_attachment/')}
                       target="_blank" rel="noopener noreferrer" download={`stem-${contrib.role}`}
                       title="Download" onClick={e => e.stopPropagation()}
                       className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-white/15 hover:text-white/50 hover:bg-white/5 transition-all ml-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                        </svg>
                    </a>
                )}

                {/* Owner-only: Reupload + Delete */}
                {isOwner && (
                    <div className="flex items-center gap-1 ml-1 shrink-0">

                        {/* Hidden file input for reupload */}
                        <input
                            ref={reuploadRef}
                            type="file"
                            accept="audio/*"
                            className="hidden"
                            onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) onReupload(file);
                                e.target.value = '';
                            }}
                        />

                        {/* Reupload button */}
                        <button
                            title="Replace your file"
                            onClick={e => { e.stopPropagation(); reuploadRef.current?.click(); }}
                            className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-white/20 hover:text-[#FFD4CA]/80 hover:bg-[#FFD4CA]/8 transition-all"
                        >
                            {/* Upload/replace icon */}
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                            </svg>
                        </button>

                        {/* Delete: normal state → confirm state */}
                        {!confirmingDelete ? (
                            <button
                                title="Delete this stem"
                                onClick={e => { e.stopPropagation(); setConfirmingDelete(true); }}
                                className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-white/20 hover:text-[#FF4439]/80 hover:bg-[#FF4439]/8 transition-all"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                </svg>
                            </button>
                        ) : (
                            /* Inline "Are you sure?" confirmation */
                            <div
                                className="flex items-center gap-1 bg-[#1a0808]/90 border border-[#FF4439]/30 rounded-lg px-2 py-1 animate-[modal-in_0.15s_ease-out]"
                                onClick={e => e.stopPropagation()}
                            >
                                <span className="font-dm text-[10px] text-white/40 whitespace-nowrap">Sure?</span>
                                <button
                                    onClick={() => { setConfirmingDelete(false); onDelete(); }}
                                    className="font-dm text-[10px] text-[#FF4439] hover:text-[#FF4439]/80 font-medium px-1 transition-colors"
                                >
                                    Yes
                                </button>
                                <button
                                    onClick={() => setConfirmingDelete(false)}
                                    className="font-dm text-[10px] text-white/30 hover:text-white/60 px-1 transition-colors"
                                >
                                    No
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── MASTER TRACK ─────────────────────────────────────────────────────────────

interface MasterTrackProps {
    url: string; isPlaying: boolean; progress: number; duration: number; currentTime: number;
    onToggle: () => void; onSeek: (e: React.MouseEvent<HTMLDivElement>) => void;
    volume: number; onVolume: (v: number) => void;
}

function MasterTrack({ url: _url, isPlaying, progress, duration, currentTime, onToggle, onSeek, volume, onVolume }: MasterTrackProps) {
    const bars = useMemo(() => generateBars(999, 64), []);

    return (
        <div className="relative rounded-2xl overflow-hidden border mb-8 transition-all duration-300"
             style={{
                 borderColor: isPlaying ? 'rgba(255,68,57,0.4)' : 'rgba(255,255,255,0.07)',
                 background: isPlaying ? 'rgba(255,68,57,0.05)' : 'rgba(255,255,255,0.02)',
                 boxShadow: isPlaying ? '0 0 40px rgba(255,68,57,0.12)' : 'none',
             }}>
            <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, #FF4439, #FFD4CA, #475B5A)' }} />
            {isPlaying && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute inset-y-0 w-[60%] opacity-[0.03]"
                         style={{ background: 'linear-gradient(90deg, transparent, #FF4439, transparent)', animation: 'scan-line 2s linear infinite' }} />
                </div>
            )}
            <div className="px-6 py-4">
                <div className="flex items-center gap-4">
                    <div className="shrink-0">
                        <p className="font-dm text-[9px] text-[#FF4439]/60 uppercase tracking-[0.25em] mb-1">Master Mix</p>
                        <button onClick={onToggle}
                                className="w-11 h-11 rounded-full flex items-center justify-center transition-all"
                                style={isPlaying
                                    ? { background: 'linear-gradient(135deg,#FF4439,#B72F30)', color:'#fff', boxShadow:'0 0 20px rgba(255,68,57,0.35)' }
                                    : { backgroundColor:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.5)' }}>
                            {isPlaying
                                ? <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg>
                                : <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                        </button>
                    </div>

                    <div className="flex-1 min-w-0">
                        {/* Waveform */}
                        <div className="flex items-end gap-[2px] h-12 mb-2 cursor-pointer" onClick={onToggle}>
                            {bars.map((h, i) => {
                                const inProg = isPlaying && (i / bars.length) < progress;
                                return (
                                    <div key={i} className={isPlaying ? 'bar-playing' : ''}
                                         style={{ width: 3, height:`${h}%`, borderRadius:2, flexShrink:0,
                                             backgroundColor: inProg ? '#FF4439' : 'rgba(255,68,57,0.2)',
                                             transition:'background-color 0.1s',
                                             animationDelay: isPlaying ? `${(i%8)*0.05}s`:'0s',
                                             animationDuration: isPlaying ? `${0.3+(i%5)*0.08}s`:'0s' }} />
                                );
                            })}
                        </div>
                        {/* Seek */}
                        <div className="flex items-center gap-3">
                            <div className="flex-1 h-[3px] rounded-full bg-white/[0.06] cursor-pointer overflow-hidden" onClick={onSeek}>
                                <div className="h-full rounded-full bg-[#FF4439] transition-all duration-100"
                                     style={{ width:`${isPlaying ? progress*100 : 0}%` }} />
                            </div>
                            <span className="font-dm text-[10px] text-white/25 tabular-nums w-[90px] text-right shrink-0">
                                {isPlaying ? `${formatTime(currentTime)} / ${formatTime(duration)}` : formatTime(duration)}
                            </span>
                        </div>
                    </div>

                    {/* Volume */}
                    <div className="flex items-center gap-2 shrink-0">
                        <svg className="w-3.5 h-3.5 text-white/20" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
                        </svg>
                        <input type="range" min="0" max="1" step="0.01" value={volume}
                               onChange={e => onVolume(parseFloat(e.target.value))}
                               className="w-20 accent-[#FF4439]" />
                    </div>
                </div>
            </div>
        </div>
    );
}