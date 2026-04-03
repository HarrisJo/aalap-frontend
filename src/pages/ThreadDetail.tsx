import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ThreadService } from '../services/ThreadService.ts';
import { createPortal } from 'react-dom';
import { getDetailRoleColor } from '../utils/roleColors';
// ─── TYPES ────────────────────────────────────────────────────────────────────

interface UserInfo { id: number; name: string; }

interface Contribution {
    id: number; role: string; user?: UserInfo;
    filePath?: string;
    fileType?: string;
    description: string; createdAt: string;
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

function getRoleColor(role: string) { return getDetailRoleColor(role); }
function formatTime(secs: number) {
    if (!isFinite(secs) || secs < 0) return '0:00';
    return `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`;
}
function getInitial(name?: string) { return (name ?? '?').charAt(0).toUpperCase(); }
function formatDate(d?: string) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
function generateBars(seed: number, count = 48): number[] {
    const bars: number[] = [];
    let s = seed;
    for (let i = 0; i < count; i++) {
        s = (s * 1664525 + 1013904223) & 0xffffffff;
        bars.push(15 + (Math.abs(s) % 75));
    }
    return bars;
}

// ─── HOOK: responsive ─────────────────────────────────────────────────────────

function useIsMobile(bp = 640) {
    const [v, setV] = useState(() => window.innerWidth < bp);
    useEffect(() => {
        const h = () => setV(window.innerWidth < bp);
        window.addEventListener('resize', h);
        return () => window.removeEventListener('resize', h);
    }, [bp]);
    return v;
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function ThreadDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isMobile = useIsMobile(640);

    const [thread, setThread]       = useState<ThreadDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loggedInUserId, setLoggedInUserId] = useState<number | null>(null);

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

    const [confirmingDeleteThread, setConfirmingDeleteThread] = useState(false);
    const [isDeletingThread, setIsDeletingThread]             = useState(false);

    useEffect(() => {
        // Read the logged-in user's ID from sessionStorage (set on login).
        // The JWT is in an HttpOnly cookie — we can't decode it in JS anymore,
        // which is the whole point. sessionStorage holds only non-sensitive UI state.
        const id = sessionStorage.getItem('userId');
        setLoggedInUserId(id ? Number(id) : null);
    }, []);

    const showToast = useCallback((message: string, type: Toast['type']) => {
        setToast({ message, type });
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 3500);
    }, []);

    const fetchThread = useCallback(async () => {
        if (!sessionStorage.getItem('isLoggedIn')) { navigate('/auth'); return; }
        try {
            // Cookie is sent automatically — no Authorization header needed.
            const res = await axios.get(
                `${import.meta.env.VITE_API_URL}/api/threads/${id}`
            );
            setThread(res.data);
        } catch { console.error('Failed to load thread'); }
        finally { setIsLoading(false); }
    }, [id, navigate]);

    useEffect(() => { fetchThread(); }, [fetchThread]);

    useEffect(() => {
        if (!playingId) {
            audioRef.current?.pause();
            audioRef.current = null;
            setProgress(0);
            setDuration(0);
            return;
        }
        const url = playingId === 'master'
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
    }, [playingId, thread, volume]);

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
            showToast('Your contribution is in the mix.', 'success');
            await fetchThread();
        } catch (err) {
            if (axios.isAxiosError(err)) {
                const errorMessage = err.response?.data?.message || err.response?.data || 'Upload failed.';
                showToast(typeof errorMessage === 'string' ? errorMessage : 'Upload failed.', 'error');
            } else {
                showToast('An unexpected error occurred.', 'error');
            }
        } finally { setIsUploading(false); }
    };

    const handleMasterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        setIsUploadingMaster(true);
        try { await ThreadService.uploadMasterMix(Number(id), file); showToast('Master mix uploaded.', 'success'); await fetchThread(); }
        catch { showToast('Master upload failed.', 'error'); }
        finally { setIsUploadingMaster(false); }
    };

    const handleDeleteContribution = async (contributionId: number) => {
        try { await ThreadService.deleteContribution(contributionId); showToast('Stem removed from the session.', 'success'); await fetchThread(); }
        catch { showToast('Could not delete stem. Try again.', 'error'); }
    };

    const handleReuploadContribution = async (contributionId: number, file: File) => {
        try { await ThreadService.reuploadContributionFile(contributionId, file); showToast('Stem updated successfully.', 'success'); await fetchThread(); }
        catch { showToast('Reupload failed. Try again.', 'error'); }
    };

    const handleDeleteThread = async () => {
        setIsDeletingThread(true);
        try {
            await ThreadService.deleteThread(Number(id));
            showToast('Session deleted.', 'success');
            setTimeout(() => navigate('/home'), 1200);
        } catch {
            showToast('Could not delete session. Try again.', 'error');
            setIsDeletingThread(false);
            setConfirmingDeleteThread(false);
        }
    };

    const contributions = thread?.contributions ?? [];
    const hasComposer   = contributions.some(c => c.role.split(' - ')[0].toLowerCase().trim() === 'composer');
    const currentTime   = duration * progress;

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

    return (
        <div className="min-h-screen bg-[#060808] text-white overflow-x-hidden">
            <link href="https://fonts.googleapis.com/css2?family=Anton&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&family=Caveat:wght@400;500;600;700&display=swap" rel="stylesheet" />

            <style>{`
                .font-anton  { font-family: 'Anton', sans-serif; }
                .font-dm     { font-family: 'DM Sans', sans-serif; }
                .font-caveat { font-family: 'Caveat', cursive; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

                @keyframes paper-in     { from { opacity:0; transform: rotate(-8deg) translateY(20px) scale(0.92); } to { opacity:1; transform: rotate(-7deg) translateY(0) scale(1); } }
                @keyframes paper-float  { 0%,100% { transform: rotate(-7deg) translateY(0); } 50% { transform: rotate(-6.2deg) translateY(-4px); } }
                @keyframes paper-pop-in { from { opacity:0; transform: scale(0.95) translateY(30px) rotate(1deg); } to { opacity:1; transform: scale(1) translateY(0) rotate(0); } }
                @keyframes pencil-draw  { from { stroke-dashoffset: 300; opacity:0; } to { stroke-dashoffset: 0; opacity:1; } }
                @keyframes ink-fade-in  { from { opacity:0; transform: translateY(4px); } to { opacity:1; transform: translateY(0); } }
                @keyframes toast-up    { from { opacity:0; transform:translateY(8px); }  to { opacity:1; transform:translateY(0); } }
                @keyframes modal-in    { from { opacity:0; transform:scale(0.97) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }
                @keyframes track-in    { from { opacity:0; transform:translateX(24px); } to { opacity:1; transform:translateX(0); } }
                @keyframes thread-draw { from { stroke-dashoffset: 2000; } to { stroke-dashoffset: 0; } }
                @keyframes node-pulse  { 0%,100% { transform:scale(1); opacity:0.8; } 50% { transform:scale(1.4); opacity:1; } }
                @keyframes bar-play    { 0%,100% { transform:scaleY(0.3); } 50% { transform:scaleY(1); } }
                @keyframes header-in   { from { opacity:0; transform:translateY(-12px); } to { opacity:1; transform:translateY(0); } }
                @keyframes scan-line   { from { transform:translateX(-100%); } to { transform:translateX(100%); } }
                @keyframes ripple-in   { from { transform:scale(0.6); opacity:0; } to { transform:scale(1); opacity:1; } }
                @keyframes thread-pulse-down { 0% { transform:translateY(-100%); opacity:0; } 50% { opacity:1; } 100% { transform:translateY(200%); opacity:0; } }

                .bar-playing { animation: bar-play 0.4s ease-in-out infinite alternate; }
                .track-glow  { transition: box-shadow 0.3s ease; }

                input[type=range] { -webkit-appearance: none; appearance: none; background: transparent; cursor: pointer; }
                input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width:12px; height:12px; border-radius:50%; background:#FF4439; }
                input[type=range]::-webkit-slider-runnable-track { height:2px; border-radius:2px; background: rgba(255,255,255,0.1); }
                button { -webkit-tap-highlight-color: transparent; }
            `}</style>

            {/* TOAST */}
            {toast && (
                <div className={`fixed bottom-8 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-[200] px-5 py-3 rounded-2xl
                    text-sm font-dm backdrop-blur-md border shadow-2xl text-center sm:whitespace-nowrap animate-[toast-up_0.25s_ease-out]
                    ${toast.type === 'success' ? 'bg-[#0a1f1e]/95 border-[#2DD4BF]/30 text-[#2DD4BF]' : 'bg-[#1a0808]/95 border-[#FF4439]/30 text-[#FF4439]'}`}>
                    {toast.message}
                </div>
            )}

            {/* DROP A STEM MODAL */}
            {modalOpen && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={() => setModalOpen(false)} />
                    <div className="relative w-full sm:max-w-[500px] animate-[modal-in_0.25s_ease-out] max-h-[92dvh] sm:max-h-none flex flex-col">
                        <div className="absolute -inset-[1px] rounded-t-2xl sm:rounded-2xl z-0"
                             style={{ background: 'linear-gradient(135deg, rgba(255,68,57,0.5) 0%, rgba(71,91,90,0.2) 100%)' }} />
                        <div className="relative z-10 bg-[#080C0B]/98 backdrop-blur-2xl rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col min-h-0">
                            <div className="h-[2px] shrink-0" style={{ background: 'linear-gradient(90deg, #FF4439, #A78BFA, #2DD4BF)' }} />
                            <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
                                <div className="w-10 h-1 rounded-full bg-white/15" />
                            </div>
                            <div className="p-4 sm:p-7 overflow-y-auto">
                                <div className="flex items-start justify-between mb-5 sm:mb-6">
                                    <div>
                                        <p className="font-dm text-[10px] text-[#FF4439]/60 uppercase tracking-[0.3em] mb-1">Add to session</p>
                                        <h2 className="font-anton text-2xl sm:text-3xl tracking-wide uppercase">Drop a Stem</h2>
                                        <p className="font-dm text-sm text-white/30 mt-1 italic">Add your part to this thread.</p>
                                    </div>
                                    <button onClick={() => setModalOpen(false)}
                                            className="w-9 h-9 rounded-full border border-white/10 bg-white/5 hover:border-[#FF4439]/40 hover:text-[#FF4439] flex items-center justify-center text-white/30 transition-all shrink-0 ml-4">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                                    </button>
                                </div>
                                <form onSubmit={handleAddContribution} className="flex flex-col gap-4 sm:gap-5">
                                    <div className="flex flex-col gap-2">
                                        <label className="font-dm text-[10px] text-white/25 uppercase tracking-widest">Your role</label>
                                        <div className="flex flex-wrap gap-2">
                                            {ROLES.map(r => {
                                                const sel = contribRole === r.value;
                                                const rc = getRoleColor(r.value);
                                                return (
                                                    <button key={r.value} type="button"
                                                            onClick={() => { setContribRole(r.value); if (r.value !== 'Instrumentalist') setContribInstrument(''); }}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-dm text-xs tracking-wide transition-all"
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

                                    <div className="flex flex-col gap-2">
                                        <label className="font-dm text-[10px] text-white/25 uppercase tracking-widest">File</label>
                                        <label className={`relative flex items-center gap-4 px-4 py-3.5 rounded-xl border border-dashed cursor-pointer transition-all
                                            ${contribFile ? 'bg-[#2DD4BF]/5 border-[#2DD4BF]/30' : 'bg-white/[0.02] border-white/10 hover:border-white/20'}`}>
                                            <input type="file" required accept="audio/*, text/plain" onChange={e => setContribFile(e.target.files?.[0] ?? null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                                            <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center transition-colors ${contribFile ? 'bg-[#2DD4BF]/20 text-[#2DD4BF]' : 'bg-white/5 text-white/25'}`}>
                                                {contribFile
                                                    ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
                                                    : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>}
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

            {/* NAVBAR */}
            <nav className="sticky top-0 z-50 bg-[#060808]/90 backdrop-blur-xl border-b border-white/[0.06]"
                 style={{ animation: 'header-in 0.4s ease-out both' }}>
                <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
                    <button onClick={() => navigate('/home')}
                            className="flex items-center gap-2 text-white/30 hover:text-white/70 font-dm text-sm transition-colors group shrink-0">
                        <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
                        </svg>
                        <span className="hidden xs:inline">Feed</span>
                    </button>

                    <div className="flex items-center gap-2 sm:gap-4 min-w-0 overflow-hidden">
                        <div className="hidden sm:flex items-center gap-1.5 text-white/20 font-dm text-[11px] shrink-0">
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

                        {loggedInUserId !== null && thread.createdBy?.id === loggedInUserId && (
                            !confirmingDeleteThread ? (
                                <button
                                    title="Delete this session"
                                    onClick={() => setConfirmingDeleteThread(true)}
                                    className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] text-white/25 hover:text-[#FF4439]/80 hover:border-[#FF4439]/30 hover:bg-[#FF4439]/5 font-dm text-xs transition-all shrink-0"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                    </svg>
                                    <span className="hidden sm:inline">Delete Session</span>
                                </button>
                            ) : (
                                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 bg-[#1a0808]/90 border border-[#FF4439]/30 rounded-lg px-2.5 py-1.5 animate-[modal-in_0.15s_ease-out] shrink-0">
                                    <span className="font-dm text-[10px] sm:text-xs text-white/40">
                                        {isDeletingThread ? 'Deleting…' : 'Delete session?'}
                                    </span>
                                    {!isDeletingThread && (
                                        <>
                                            <button onClick={handleDeleteThread} className="font-dm text-xs text-[#FF4439] hover:text-[#FF4439]/80 font-medium px-1 transition-colors">Yes</button>
                                            <button onClick={() => setConfirmingDeleteThread(false)} className="font-dm text-xs text-white/30 hover:text-white/60 px-1 transition-colors">No</button>
                                        </>
                                    )}
                                </div>
                            )
                        )}
                    </div>
                </div>
            </nav>

            {/* THREAD HEADER */}
            <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-7 sm:pt-10 pb-6 sm:pb-8" style={{ animation: 'header-in 0.5s ease-out 0.1s both' }}>
                <div className="flex items-start justify-between gap-6 sm:gap-12">
                    <div className="flex-1 min-w-0">
                        <p className="font-dm text-[10px] text-white/20 uppercase tracking-[0.3em] mb-2">
                            Session — started by{' '}
                            <button onClick={() => thread.createdBy && navigate(`/users/${thread.createdBy.id}`)}
                                    className="text-[#FFD4CA]/50 hover:text-[#FFD4CA] transition-colors">
                                {thread.createdBy?.name}
                            </button>
                            {thread.createdAt && <> · {formatDate(thread.createdAt)}</>}
                        </p>
                        <h1 className="font-anton text-4xl sm:text-5xl md:text-6xl leading-none tracking-wide uppercase text-white break-words">
                            {thread.title}
                        </h1>
                        {thread.description && (
                            <p className="font-dm text-white/40 text-sm sm:text-base mt-3 leading-relaxed max-w-2xl">
                                {thread.description}
                            </p>
                        )}
                        <button onClick={() => setModalOpen(true)}
                                className="mt-5 sm:mt-6 hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-xl font-anton text-xs tracking-widest uppercase transition-all active:scale-95 bg-[#FF4439] hover:bg-[#B72F30] text-white"
                                style={{ boxShadow: '0 0 20px rgba(255,68,57,0.2)' }}>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
                            Drop a Stem
                        </button>
                    </div>

                    {contributions.length > 0 && (
                        <div className="shrink-0 hidden md:flex items-start gap-6 pt-1">
                            {(thread.bpm || thread.musicalKey) && (
                                <div className="relative self-center"
                                     style={{ animation: 'paper-in 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.4s both' }}>
                                    <div className="absolute -bottom-2 left-2 right-2 h-full rounded-sm opacity-40 blur-md"
                                         style={{ background: 'rgba(0,0,0,0.8)', zIndex: 0 }} />
                                    <div className="relative z-10 w-[148px] px-5 pt-5 pb-6 rounded-sm"
                                         style={{
                                             background: 'linear-gradient(160deg, #f5f0e8 0%, #ede6d6 40%, #e8dfc8 100%)',
                                             animation: 'paper-float 5s ease-in-out 1.2s infinite',
                                             boxShadow: '2px 4px 20px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(0,0,0,0.04)',
                                         }}>
                                        {[0,1,2,3,4,5].map(i => (
                                            <div key={i} className="absolute left-0 right-0 h-px"
                                                 style={{ top: 28 + i * 22, background: 'rgba(100,120,180,0.12)' }} />
                                        ))}
                                        <div className="absolute top-0 bottom-0 left-9 w-px" style={{ background: 'rgba(220,60,60,0.25)' }} />
                                        <svg className="absolute top-2 right-2 opacity-10" width="28" height="20" viewBox="0 0 28 20">
                                            {[2,6,10,14,18].map(y => (
                                                <line key={y} x1="0" y1={y} x2="28" y2={y} stroke="#3a3020" strokeWidth="0.8"
                                                      style={{ strokeDasharray: 28, strokeDashoffset: 28,
                                                          animation: `pencil-draw 0.6s ease-out ${0.8 + y*0.04}s both` }} />
                                            ))}
                                            <ellipse cx="8" cy="15" rx="3" ry="2" fill="#3a3020" opacity="0.7"
                                                     style={{ animation: 'ink-fade-in 0.4s ease-out 1.4s both' }} />
                                            <line x1="11" y1="15" x2="11" y2="5" stroke="#3a3020" strokeWidth="0.9"
                                                  style={{ strokeDasharray: 10, strokeDashoffset: 10,
                                                      animation: 'pencil-draw 0.3s ease-out 1.5s both' }} />
                                        </svg>
                                        <p className="font-caveat text-[10px] text-[#8a7a5a] mb-2 tracking-wide"
                                           style={{ animation: 'ink-fade-in 0.5s ease-out 0.7s both' }}>session notes</p>
                                        {thread.bpm && (
                                            <div className="mb-3" style={{ animation: 'ink-fade-in 0.5s ease-out 0.85s both' }}>
                                                <p className="font-caveat text-[11px] text-[#7a6a4a] leading-none mb-0.5">tempo</p>
                                                <p className="font-caveat leading-none"
                                                   style={{ fontSize: 38, color: '#2a2010', fontWeight: 600, textShadow: '0.5px 0.5px 0 rgba(0,0,0,0.08)' }}>
                                                    {thread.bpm}<span className="text-base font-normal text-[#7a6a4a] ml-1">bpm</span>
                                                </p>
                                            </div>
                                        )}
                                        {thread.bpm && (
                                            <svg width="100%" height="6" className="mb-3 -mt-1 opacity-30">
                                                <path d="M0 3 Q30 1 60 4 Q90 6 110 3" fill="none" stroke="#3a3020" strokeWidth="1.2" strokeLinecap="round"
                                                      style={{ strokeDasharray: 120, strokeDashoffset: 120, animation: 'pencil-draw 0.6s ease-out 1s both' }} />
                                            </svg>
                                        )}
                                        {thread.musicalKey && (
                                            <div style={{ animation: 'ink-fade-in 0.5s ease-out 1.1s both' }}>
                                                <p className="font-caveat text-[11px] text-[#7a6a4a] leading-none mb-0.5">key</p>
                                                <p className="font-caveat leading-none"
                                                   style={{ fontSize: 26, color: '#2a2010', fontWeight: 600, textShadow: '0.5px 0.5px 0 rgba(0,0,0,0.08)' }}>
                                                    {thread.musicalKey}
                                                </p>
                                            </div>
                                        )}
                                        <svg className="absolute bottom-2 right-2 opacity-15" width="24" height="24" viewBox="0 0 24 24">
                                            <path d="M4 20 L8 8 L12 14 L16 6 L20 12" fill="none" stroke="#3a3020" strokeWidth="1" strokeLinecap="round"
                                                  style={{ strokeDasharray: 60, strokeDashoffset: 60, animation: 'pencil-draw 1s ease-out 1.6s both' }} />
                                        </svg>
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-10 h-5 rounded-sm opacity-60"
                                             style={{ background: 'linear-gradient(135deg, rgba(255,235,180,0.8), rgba(255,220,120,0.6))', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', backdropFilter: 'blur(1px)' }} />
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col items-end gap-4">
                                <p className="font-dm text-[9px] uppercase tracking-[0.3em] text-white/15">Woven by</p>
                                <div className="flex flex-col gap-3">
                                    {contributions.map((c, i) => {
                                        const rc = getRoleColor(c.role);
                                        return (
                                            <button key={c.id} onClick={() => c.user?.id && navigate(`/users/${c.user.id}`)}
                                                    className="flex items-center gap-3 group/av transition-all duration-200 hover:-translate-x-1"
                                                    style={{ animation: `track-in 0.4s ease-out ${i * 0.07}s both` }}>
                                                <div className="flex flex-col items-end gap-0.5">
                                                    <span className="font-dm text-xs text-white/50 group-hover/av:text-white/80 transition-colors leading-none">{c.user?.name ?? 'Unknown'}</span>
                                                    <span className="font-dm text-[9px] uppercase tracking-wider leading-none" style={{ color: rc.dot + 'aa' }}>{c.role.split(' - ')[0]}</span>
                                                </div>
                                                <div className="w-9 h-9 rounded-full flex items-center justify-center font-anton text-sm shrink-0 transition-all duration-200 group-hover/av:scale-110"
                                                     style={{ backgroundColor: rc.dot + '18', border: `1.5px solid ${rc.dot}50`, color: rc.dot, boxShadow: `0 0 12px ${rc.dot}20` }}>
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

                {(thread.bpm || thread.musicalKey) && contributions.length > 0 && (
                    <div className="flex md:hidden items-center gap-3 mt-4 flex-wrap">
                        {thread.bpm && (
                            <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5">
                                <span className="font-dm text-[9px] text-white/30 uppercase tracking-widest">BPM</span>
                                <span className="font-anton text-sm text-white/70">{thread.bpm}</span>
                            </div>
                        )}
                        {thread.musicalKey && (
                            <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5">
                                <span className="font-dm text-[9px] text-white/30 uppercase tracking-widest">Key</span>
                                <span className="font-anton text-sm text-white/70">{thread.musicalKey}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* DAW SECTION */}
            <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pb-32">

                {thread.masterAudioUrl ? (
                    <MasterTrack
                        isPlaying={playingId === 'master'}
                        progress={progress}
                        duration={duration}
                        currentTime={currentTime}
                        onToggle={() => togglePlay('master')}
                        onSeek={e => handleSeek(e, 'master')}
                        volume={volume}
                        onVolume={setVolume}
                        isMobile={isMobile}
                    />
                ) : (
                    <label className="relative flex items-center gap-3 px-4 sm:px-5 py-3.5 rounded-xl border border-dashed border-white/[0.06] bg-white/[0.01] hover:border-white/[0.12] hover:bg-white/[0.02] cursor-pointer transition-all group mb-8">
                        <input type="file" accept="audio/*" onChange={handleMasterUpload} disabled={isUploadingMaster} className="absolute inset-0 opacity-0 cursor-pointer" />
                        <svg className="w-4 h-4 text-white/15 group-hover:text-white/30 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
                        </svg>
                        <span className="font-dm text-sm text-white/20 group-hover:text-white/35 transition-colors">
                            {isUploadingMaster ? 'Uploading master mix…' : 'Upload the finished master mix'}
                        </span>
                    </label>
                )}

                {contributions.length > 0 ? (
                    <div className="relative">
                        <p className="font-dm text-[10px] text-white/15 uppercase tracking-[0.3em] mb-4 sm:mb-6">
                            How this was built — {contributions.length} stem{contributions.length !== 1 ? 's' : ''}
                        </p>

                        <div className="relative flex gap-0">
                            {!isMobile && <ThreadSpine contributions={contributions} />}

                            <div className={`flex-1 flex flex-col gap-2 ${isMobile ? '' : 'pl-4'}`}>
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
                                        isOwner={loggedInUserId !== null && contrib.user?.id === loggedInUserId}
                                        onDelete={() => handleDeleteContribution(contrib.id)}
                                        onReupload={(file) => handleReuploadContribution(contrib.id, file)}
                                        isMobile={isMobile}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="relative flex flex-col items-center mt-0">
                            <div className="relative w-[2px] overflow-hidden" style={{ height: 20 }}>
                                <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.08), rgba(255,68,57,0.5))' }} />
                                <div className="absolute inset-x-0 h-8"
                                     style={{ background: 'linear-gradient(to bottom, transparent, #fff, transparent)', animation: 'thread-pulse-down 1.8s ease-in-out infinite', filter: 'blur(1px)' }} />
                            </div>

                            <div className="relative w-2 h-2 z-10">
                                <div className="absolute inset-0 rounded-full animate-ping" style={{ backgroundColor: '#FF4439', opacity: 0.5, animationDuration: '1.4s' }} />
                                <div className="w-2 h-2 rounded-full bg-[#FF4439]" style={{ boxShadow: '0 0 8px rgba(255,68,57,1), 0 0 16px rgba(255,68,57,0.5)' }} />
                            </div>

                            <div className="w-[2px]" style={{ height: 12, background: 'linear-gradient(to bottom, #FF4439, rgba(255,68,57,0.3))' }} />

                            <div className="relative group/cta w-full sm:w-auto">
                                <div className="absolute -inset-[1px] rounded-xl pointer-events-none"
                                     style={{ background: 'linear-gradient(135deg, #FF4439, #7A1A1A)', opacity: 0.5 }} />
                                <button
                                    onClick={() => setModalOpen(true)}
                                    className="relative z-10 w-full sm:w-auto flex items-center justify-center gap-3 px-6 sm:px-8 py-3.5 rounded-xl overflow-hidden transition-all duration-300 active:scale-[0.97]"
                                    style={{ background: '#0a0808' }}
                                >
                                    <div className="absolute inset-0 -translate-x-full group-hover/cta:translate-x-0 transition-transform duration-[350ms] ease-out pointer-events-none" style={{ background: '#7A1A1A' }} />
                                    <div className="absolute inset-0 -translate-x-full group-hover/cta:translate-x-0 transition-transform duration-[350ms] ease-out pointer-events-none" style={{ background: 'linear-gradient(90deg, #B72F30, #FF4439)', transitionDelay: '60ms' }} />
                                    <div className="absolute inset-y-0 w-[40px] -left-[40px] group-hover/cta:left-full transition-all duration-[350ms] ease-out pointer-events-none"
                                         style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)', transitionDelay: '80ms', filter: 'blur(6px)' }} />
                                    <div className="relative z-10 w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-[#FF4439]/20 border border-[#FF4439]/30 group-hover/cta:bg-white/20 group-hover/cta:border-white/30 transition-all duration-300">
                                        <svg className="w-3 h-3 text-[#FF4439] group-hover/cta:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/>
                                        </svg>
                                    </div>
                                    <span className="relative z-10 font-anton text-sm tracking-[0.15em] uppercase text-white/40 group-hover/cta:text-white transition-colors duration-300">
                                        {isMobile ? 'Drop a Stem' : 'Add contribution to this thread'}
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
                    <div className="py-16 sm:py-24 text-center">
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
            <div className="fixed bottom-6 right-5 z-50 sm:hidden">
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
    const TRACK_HEIGHT = 88;
    const GAP = 8;
    const totalH = contributions.length * (TRACK_HEIGHT + GAP);
    const cx = 16;

    return (
        <div className="relative shrink-0" style={{ width: 32 }}>
            <svg width="32" height={totalH} viewBox={`0 0 32 ${totalH}`} className="absolute top-0 left-0">
                <line x1={cx} y1="0" x2={cx} y2={totalH} stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" />
                <line x1={cx} y1="0" x2={cx} y2={totalH} stroke="url(#spineGrad)" strokeWidth="1.5"
                      strokeDasharray={totalH}
                      style={{ animation: 'thread-draw 1.8s cubic-bezier(0.4,0,0.2,1) 0.3s both' }} />
                <defs>
                    <linearGradient id="spineGrad" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
                        {contributions.map((c, i) => {
                            const rc = getRoleColor(c.role);
                            const pct = (i / Math.max(contributions.length - 1, 1)) * 100;
                            return <stop key={i} offset={`${pct}%`} stopColor={rc.dot} stopOpacity="0.7" />;
                        })}
                    </linearGradient>
                </defs>
                {contributions.map((c, i) => {
                    const rc = getRoleColor(c.role);
                    const y = i * (TRACK_HEIGHT + GAP) + (TRACK_HEIGHT / 2);
                    return (
                        <g key={c.id}>
                            <circle cx={cx} cy={y} r="8" fill="none" stroke={rc.dot} strokeWidth="1" opacity="0.2"
                                    style={{ animation: `node-pulse 2.5s ease-in-out ${i * 0.3}s infinite` }} />
                            <circle cx={cx} cy={y} r="4" fill={rc.dot} opacity="0"
                                    style={{ animation: `ripple-in 0.4s ease-out ${0.4 + i * 0.15}s both` }} />
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
    isMobile: boolean;
}

function StemTrack({
                       contrib, index, isPlaying, progress, duration, currentTime,
                       onToggle, onSeek, onCreatorClick, isOwner, onDelete, onReupload, isMobile
                   }: StemTrackProps) {
    const rc   = getRoleColor(contrib.role);
    const barCount = isMobile ? 30 : 52;
    const bars = useMemo(() => generateBars(contrib.id, barCount), [contrib.id, barCount]);

    const hasAudio = contrib.fileType === 'video' || (!contrib.fileType && (contrib.filePath?.endsWith('.mp3') || contrib.filePath?.endsWith('.wav')));
    const hasText  = contrib.fileType === 'raw' || (!contrib.fileType && contrib.filePath?.endsWith('.txt'));

    const reuploadRef = useRef<HTMLInputElement>(null);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [textOpen, setTextOpen] = useState(false);

    const reuploadAccept = hasText ? '.txt,.lrc,.srt,.md,text/plain' : 'audio/*';

    const wrapperStyle: React.CSSProperties = {
        borderColor: isPlaying ? rc.dot + '50' : 'rgba(255,255,255,0.06)',
        backgroundColor: isPlaying ? rc.track : 'rgba(255,255,255,0.02)',
        boxShadow: isPlaying ? `0 0 30px ${rc.glow}, inset 0 0 40px ${rc.track}` : 'none',
        animation: `track-in 0.4s ease-out ${index * 0.08}s both`,
    };

    const renderControls = () => (
        <div className="flex items-center gap-1 shrink-0">
            {hasAudio && (
                <button onClick={onToggle}
                        className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                        style={isPlaying
                            ? { backgroundColor: rc.dot, color: '#000' }
                            : { backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
                    {isPlaying ? <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg> : <svg className="w-3.5 h-3.5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                </button>
            )}
            {hasText && (
                <button onClick={() => setTextOpen(true)}
                        className="px-2.5 py-1.5 rounded-lg font-dm text-[10px] uppercase tracking-widest transition-all"
                        style={{ backgroundColor: rc.dot + '15', border: `1px solid ${rc.dot}40`, color: rc.dot }}>
                    Read
                </button>
            )}
            {contrib.filePath && (
                <a href={contrib.filePath.replace('/upload/', '/upload/fl_attachment/')}
                   target="_blank" rel="noopener noreferrer" download
                   className="w-8 h-8 rounded-lg flex items-center justify-center text-white/15 hover:text-white/50 transition-all">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                </a>
            )}
            {isOwner && (
                <>
                    <input ref={reuploadRef} type="file" accept={reuploadAccept} className="hidden"
                           onChange={e => { const f = e.target.files?.[0]; if (f) onReupload(f); e.target.value = ''; }} />
                    <button title="Replace file" onClick={e => { e.stopPropagation(); reuploadRef.current?.click(); }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/20 hover:text-[#FFD4CA]/80 transition-all">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                    </button>
                    {!confirmingDelete ? (
                        <button title="Delete stem" onClick={e => { e.stopPropagation(); setConfirmingDelete(true); }}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-white/20 hover:text-[#FF4439]/80 transition-all">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                    ) : (
                        <div className="flex items-center gap-1 bg-[#1a0808]/90 border border-[#FF4439]/30 rounded-lg px-2 py-1" onClick={e => e.stopPropagation()}>
                            <span className="font-dm text-[10px] text-white/40">Sure?</span>
                            <button onClick={() => { setConfirmingDelete(false); onDelete(); }} className="font-dm text-[10px] text-[#FF4439] px-1 transition-colors">Yes</button>
                            <button onClick={() => setConfirmingDelete(false)} className="font-dm text-[10px] text-white/30 px-1 transition-colors">No</button>
                        </div>
                    )}
                </>
            )}
        </div>
    );

    if (isMobile) {
        return (
            <>
                <div className="relative rounded-xl overflow-hidden border transition-all duration-300 group" style={wrapperStyle}>
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl transition-opacity duration-300"
                         style={{ backgroundColor: rc.dot, opacity: isPlaying ? 1 : 0.35 }} />
                    <div className="flex flex-col p-3 gap-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <button onClick={onCreatorClick} className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center font-anton text-[10px]" style={{ backgroundColor: rc.dot + '20', border: `1px solid ${rc.dot}50`, color: rc.dot }}>
                                    {getInitial(contrib.user?.name)}
                                </button>
                                <div className="min-w-0">
                                    <span className="font-anton text-[9px] tracking-widest uppercase block leading-none" style={{ color: rc.dot }}>{contrib.role.split(' - ')[0]}</span>
                                    <span className="font-dm text-xs text-white/60 truncate block leading-none mt-1">{contrib.user?.name ?? 'Unknown'}</span>
                                </div>
                            </div>
                            {renderControls()}
                        </div>
                        {hasAudio && (
                            <div className="flex flex-col gap-1.5 mt-1">
                                <div className="flex items-end gap-[2px] h-6 cursor-pointer" onClick={onToggle}>
                                    {bars.map((h, i) => (
                                        <div key={i} className={isPlaying ? 'bar-playing' : ''} style={{ width: 2.5, height: `${h}%`, borderRadius: 1, flexShrink: 0, backgroundColor: (isPlaying && (i / bars.length) < progress) ? rc.bar : rc.dot + '20' }} />
                                    ))}
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-[2px] rounded-full bg-white/5 overflow-hidden" onClick={onSeek}>
                                        <div className="h-full bg-white/20" style={{ width: `${progress * 100}%` }} />
                                    </div>
                                    <span className="font-dm text-[9px] text-white/30 tabular-nums">{isPlaying ? formatTime(currentTime) : formatTime(duration)}</span>
                                </div>
                            </div>
                        )}
                        {contrib.description && <p className="font-dm text-[10px] text-white/25 truncate">{contrib.description}</p>}
                    </div>
                </div>
                {hasText && <LinedPaperModal isOpen={textOpen} onClose={() => setTextOpen(false)} fileUrl={contrib.filePath ?? ''} role={contrib.role} contributor={contrib.user?.name ?? ''} rc={rc} />}
            </>
        );
    }

    return (
        <>
            <div className="relative rounded-xl overflow-hidden border transition-all duration-300 group" style={wrapperStyle}>
                <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl transition-opacity duration-300"
                     style={{ backgroundColor: rc.dot, opacity: isPlaying ? 1 : 0.35 }} />
                <div className="flex items-center gap-4 pl-4 pr-4 py-3">
                    <div className="flex items-center gap-3 w-[180px] shrink-0">
                        <button onClick={onCreatorClick} className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center font-anton text-sm transition-all hover:scale-105" style={{ backgroundColor: rc.dot + '20', border: `1.5px solid ${rc.dot}50`, color: rc.dot }}>
                            {getInitial(contrib.user?.name)}
                        </button>
                        <div className="min-w-0">
                            <span className="font-anton text-[10px] tracking-widest uppercase leading-none block" style={{ color: rc.dot }}>{contrib.role.split(' - ')[0]}</span>
                            <button onClick={onCreatorClick} className="font-dm text-sm text-white/60 hover:text-white transition-colors truncate block leading-none mt-1">{contrib.user?.name ?? 'Unknown'}</button>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col gap-2 min-w-0">
                        {hasAudio ? (
                            <div className="flex items-center gap-3">
                                <button onClick={onToggle} className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all">
                                    {isPlaying ? <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg> : <svg className="w-3 h-3 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                                </button>
                                <div className="flex-1 flex flex-col gap-1.5">
                                    <div className="flex items-end gap-[2px] h-8 cursor-pointer" onClick={onToggle}>
                                        {bars.map((h, i) => (
                                            <div key={i} className={isPlaying ? 'bar-playing' : ''} style={{ width: 3, height: `${h}%`, borderRadius: 1.5, flexShrink: 0, backgroundColor: (isPlaying && (i / bars.length) < progress) ? rc.bar : rc.dot + '20' }} />
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 h-[2px] rounded-full bg-white/5 cursor-pointer relative" onClick={onSeek}>
                                            <div className="absolute inset-y-0 left-0 bg-white/20 rounded-full transition-all" style={{ width: `${progress * 100}%` }} />
                                        </div>
                                        <span className="font-dm text-[10px] text-white/20 tabular-nums w-20 text-right">{isPlaying ? `${formatTime(currentTime)} / ${formatTime(duration)}` : formatTime(duration)}</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <button onClick={() => setTextOpen(true)} className="px-4 py-2 rounded-lg font-dm text-xs uppercase tracking-widest transition-all" style={{ backgroundColor: rc.dot + '12', border: `1px solid ${rc.dot}35`, color: rc.dot }}>Open Lyrics</button>
                            </div>
                        )}
                        {contrib.description && <p className="font-dm text-xs text-white/30 truncate">{contrib.description}</p>}
                    </div>
                    {renderControls()}
                </div>
            </div>
            {!hasAudio && <LinedPaperModal isOpen={textOpen} onClose={() => setTextOpen(false)} fileUrl={contrib.filePath ?? ''} role={contrib.role} contributor={contrib.user?.name ?? ''} rc={rc} />}
        </>
    );
}

// ─── MASTER TRACK ─────────────────────────────────────────────────────────────

interface MasterTrackProps {
    isPlaying: boolean; progress: number; duration: number; currentTime: number;
    onToggle: () => void; onSeek: (e: React.MouseEvent<HTMLDivElement>) => void;
    volume: number; onVolume: (v: number) => void;
    isMobile: boolean;
}

function MasterTrack({ isPlaying, progress, duration, currentTime, onToggle, onSeek, volume, onVolume, isMobile }: MasterTrackProps) {
    const bars = useMemo(() => generateBars(999, isMobile ? 32 : 64), [isMobile]);

    return (
        <div className="relative rounded-2xl overflow-hidden border mb-6 sm:mb-8 transition-all duration-300"
             style={{
                 borderColor: isPlaying ? 'rgba(255,68,57,0.4)' : 'rgba(255,255,255,0.07)',
                 background: isPlaying ? 'rgba(255,68,57,0.05)' : 'rgba(255,255,255,0.02)',
             }}>
            <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, #FF4439, #FFD4CA, #475B5A)' }} />
            <div className="px-4 sm:px-6 py-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="shrink-0 flex items-center gap-4">
                        <div>
                            <p className="font-dm text-[9px] text-[#FF4439]/60 uppercase tracking-[0.25em] mb-1">Master Mix</p>
                            <button onClick={onToggle}
                                    className="w-11 h-11 rounded-full flex items-center justify-center transition-all"
                                    style={isPlaying ? { background: 'linear-gradient(135deg,#FF4439,#B72F30)', color:'#fff' } : { backgroundColor:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.5)' }}>
                                {isPlaying ? <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg> : <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                            </button>
                        </div>
                        {!isMobile && (
                            <div className="flex flex-col gap-2">
                                <svg className="w-3.5 h-3.5 text-white/20" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
                                <input type="range" min="0" max="1" step="0.01" value={volume} onChange={e => onVolume(parseFloat(e.target.value))} className="w-20 accent-[#FF4439]" title={`Volume: ${Math.round(volume*100)}%`} />
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-end gap-[2px] h-12 mb-2 cursor-pointer" onClick={onToggle}>
                            {bars.map((h, i) => (
                                <div key={i} className={isPlaying ? 'bar-playing' : ''}
                                     style={{ width: 3, height:`${h}%`, borderRadius:2, flexShrink:0,
                                         backgroundColor: (isPlaying && (i / bars.length) < progress) ? '#FF4439' : 'rgba(255,68,57,0.2)',
                                         transition:'background-color 0.1s' }} />
                            ))}
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex-1 h-[3px] rounded-full bg-white/[0.06] cursor-pointer overflow-hidden relative" onClick={onSeek}>
                                <div className="h-full rounded-full bg-[#FF4439]" style={{ width:`${progress*100}%` }} />
                            </div>
                            <span className="font-dm text-[10px] text-white/25 tabular-nums w-[100px] text-right">
                                {isPlaying ? `${formatTime(currentTime)} / ${formatTime(duration)}` : `Master (${formatTime(duration)})`}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── LINED PAPER MODAL ────────────────────────────────────────────────────────

interface LinedPaperProps {
    isOpen: boolean; onClose: () => void;
    fileUrl: string; role: string; contributor: string;
    rc: { label: string; dot: string; glow: string };
}

function LinedPaperModal({ isOpen, onClose, fileUrl, role, contributor, rc }: LinedPaperProps) {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let isMounted = true;
        if (!isOpen || !fileUrl) return;

        const loadContent = async () => {
            setLoading(true);
            try {
                const r = await fetch(fileUrl);
                const t = await r.text();
                if (isMounted) setContent(t);
            } catch (e) {
                console.error("Content load failed", e);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadContent();
        return () => { isMounted = false; };
    }, [isOpen, fileUrl]);

    if (!isOpen) return null;

    // Use createPortal to render the modal at the end of document.body
    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-10" onClick={onClose}>
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
            <div className="relative w-full max-w-2xl max-h-[85dvh] flex flex-col animate-[paper-pop-in_0.4s_cubic-bezier(0.34,1.56,0.64,1)]" onClick={e => e.stopPropagation()}>
                {/* ... rest of your existing modal JSX ... */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-20 h-10 z-20 opacity-90"
                     style={{ background: 'linear-gradient(135deg, rgba(255,235,180,0.9), rgba(255,220,120,0.7))', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', transform: 'rotate(-1deg)' }} />
                <div className="relative flex-1 bg-[#fdfaf2] rounded-sm overflow-hidden flex flex-col shadow-[0_30px_60px_rgba(0,0,0,0.5)] border border-[#222]/5">
                    {/* ... (Keep the rest as is) ... */}
                    <div className="h-14 border-b border-[#222]/10 flex items-center justify-between px-8 bg-[#fdfaf2] z-10">
                        <span className="font-caveat text-xl" style={{ color: rc.dot }}>{role} • <span className="opacity-60">{contributor}</span></span>
                        <button onClick={onClose} className="text-[#3a3020]/40 hover:text-[#3a3020] transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
                    </div>
                    <div className="flex-1 overflow-y-auto relative p-8 sm:p-12 no-scrollbar" style={{ background: 'linear-gradient(160deg, #fdfaf2 0%, #f7f1e3 100%)' }}>
                        <div className="absolute top-0 bottom-0 left-12 sm:left-20 w-[1px] bg-[#f00]/15" />
                        <div className="absolute inset-0 pointer-events-none" style={{ background: 'repeating-linear-gradient(transparent, transparent 31px, rgba(100,120,180,0.08) 31px, rgba(100,120,180,0.08) 32px)', marginTop: '12px' }} />
                        <div className="relative z-10 ml-8 sm:ml-16">
                            {loading ? (
                                <div className="py-12 font-caveat text-2xl" style={{ color: rc.dot, opacity: 0.3 }}>Unfolding lyrics...</div>
                            ) : (
                                <pre className="font-caveat text-2xl sm:text-3xl text-[#2a2010] leading-[32px] whitespace-pre-wrap break-words animate-[ink-fade-in_0.8s_ease-out]">{content}</pre>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body // This targets the very end of the HTML body
    );
}