import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

// --- TYPES ---
interface UserInfo {
    id: number;
    name: string;
    email?: string;
    avatar?: string;
}

interface Contribution {
    id: number;
    role: string;
    user?: UserInfo;
    filePath?: string;
    description: string;
    createdAt: string;
}

interface ThreadDetail {
    id: number;
    title: string;
    description: string;
    createdBy?: UserInfo;
    createdAt?: string;
    bpm?: number;
    musicalKey?: string;
    masterAudioUrl?: string;
    contributions?: Contribution[];
}

export default function ThreadDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [thread, setThread] = useState<ThreadDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // UI States for the DAW
    const [playingTrackId, setPlayingTrackId] = useState<number | string | null>(null);
    const [mutedTracks, setMutedTracks] = useState<Set<number>>(new Set());
    const [soloTrackId, setSoloTrackId] = useState<number | null>(null);

    // UI State for Right Sidebar Accordion
    const [activeSidebarTab, setActiveSidebarTab] = useState<'details' | 'log'>('details');

    // Simulated waveform data for visual flair
    const waveformHeights = [
        20, 35, 60, 45, 80, 100, 75, 40, 25, 50, 90, 85, 45, 30, 65, 55,
        20, 40, 80, 95, 70, 35, 50, 85, 100, 60, 40, 25, 55, 75, 90, 45,
        30, 65, 50, 20, 45, 80, 100, 75, 40, 25, 60, 85, 95, 55, 35, 70
    ];

    const toggleMute = (trackId: number) => {
        setMutedTracks(prev => {
            const next = new Set(prev);
            if (next.has(trackId)) next.delete(trackId);
            else next.add(trackId);
            return next;
        });
    };

    const toggleSolo = (trackId: number) => {
        setSoloTrackId(prev => prev === trackId ? null : trackId);
    };

    useEffect(() => {
        const fetchThreadDetails = async () => {
            const token = localStorage.getItem('token');
            if (!token) { navigate('/auth'); return; }

            try {
                const response = await axios.get(`https://aalap-backend-1.onrender.com/api/threads/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setThread(response.data);
            } catch (error) {
                console.error("Failed to load studio session:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchThreadDetails();
    }, [id, navigate]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0A0E0D] flex items-center justify-center relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-500/10 blur-[100px] rounded-full"></div>
                <div className="text-[#FFD4CA] font-anton text-2xl animate-pulse tracking-wide relative z-10 uppercase">Powering up Studio...</div>
            </div>
        );
    }

    if (!thread) {
        return (
            <div className="min-h-screen bg-[#0A0E0D] flex flex-col items-center justify-center gap-6">
                <div className="text-[#FF4439] font-anton text-3xl tracking-wide uppercase">Studio Not Found</div>
                <button onClick={() => navigate('/home')} className="text-white/50 hover:text-white font-dm px-6 py-2 rounded-full border border-white/10 transition-colors">Return to Feed</button>
            </div>
        );
    }

    const safeContributions = thread.contributions || [];
    const formattedDate = thread.createdAt
        ? new Date(thread.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        : 'Unknown Date';

    return (
        <div className="min-h-screen bg-[#0A0E0D] text-[#FCFCFC] overflow-hidden flex justify-center relative selection:bg-[#FF4439]/30">

            <style>
                {`
                    @import url('https://fonts.googleapis.com/css2?family=Anton&family=DM+Sans:wght@300;400;500&display=swap');
                    @keyframes playing-pulse { 0%, 100% { opacity: 0.5; height: 20%; } 50% { opacity: 1; height: 100%; } }
                    @keyframes thread-flow { from { stroke-dashoffset: 24; } to { stroke-dashoffset: 0; } }
                    @keyframes tab-fade-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
                    @keyframes studio-flash { 0%, 100% { opacity: 0.05; transform: scale(1); } 50% { opacity: 0.12; transform: scale(1.1); } }
                    .no-scrollbar::-webkit-scrollbar { display: none; }
                    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                    input[type=range] { -webkit-appearance: none; background: transparent; }
                    input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; height: 16px; width: 8px; border-radius: 4px; background: #FCFCFC; cursor: pointer; margin-top: -6px; }
                    input[type=range]::-webkit-slider-runnable-track { width: 100%; height: 4px; cursor: pointer; background: rgba(255,255,255,0.1); border-radius: 2px; }
                    .font-anton { font-family: 'Anton', sans-serif; }
                    .font-dm { font-family: 'DM Sans', sans-serif; }
                    .font-cormorant { font-family: 'Cormorant Garamond', serif; }
                    
                    /* STUDIO BACKGROUND STYLES */
                    .studio-vignette { background: radial-gradient(circle at 50% 50%, #111a19 0%, #0a0e0d 100%); }
                    .noise-texture {
                        background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
                        opacity: 0.02;
                    }
                `}
            </style>

            {/* --- CINEMATIC BACKGROUND STACK --- */}
            <div className="absolute inset-0 studio-vignette pointer-events-none z-0"></div>
            <div className="absolute inset-0 noise-texture pointer-events-none z-0"></div>

            {/* The Top Left Flash / Pulse */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-teal-500 rounded-full blur-[120px] animate-[studio-flash_8s_ease-in-out_infinite] pointer-events-none z-0"></div>

            {/* Corner Ambient Glows */}
            <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-teal-900/10 blur-[120px] rounded-full pointer-events-none z-0"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[30%] h-[30%] bg-[#FF4439]/5 blur-[120px] rounded-full pointer-events-none z-0"></div>

            <div className="w-full max-w-[1600px] grid grid-cols-12 h-screen relative z-10 px-6 gap-8">

                {/* LEFT NAV SIDEBAR */}
                <aside className="col-span-1 hidden lg:flex flex-col items-center py-8 h-full border-r border-white/5">
                    <button onClick={() => navigate('/home')} className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all group border border-white/5">
                        <svg className="w-5 h-5 text-white/50 group-hover:text-white transition-colors group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                    </button>
                    <div className="mt-12 h-full flex flex-col items-center gap-8 text-white/20">
                        <div className="w-1 h-1 rounded-full bg-[#FF4439] shadow-[0_0_8px_#FF4439]"></div>
                        <div className="w-1 h-1 rounded-full bg-teal-500 shadow-[0_0_8px_teal]"></div>
                        <div className="w-1 h-1 rounded-full bg-white/20"></div>
                    </div>
                </aside>

                {/* MAIN CONTENT */}
                <main className="col-span-12 lg:col-span-8 h-full overflow-y-auto no-scrollbar py-8 flex flex-col relative pr-4">
                    <div className="mb-10">
                        <div className="mb-3">
                            <span className="font-anton text-[10px] tracking-[0.25em] text-[#FF4439] border border-[#FF4439]/50 px-3 py-1">OPEN SESSION</span>
                        </div>
                        <h1 className="font-anton text-[2.5rem] tracking-wide pb-2 text-white leading-tight uppercase">{thread.title || 'Untitled Session'}</h1>
                        <div className="flex items-center gap-3 mt-3">
                            <div className="w-8 h-[2px] bg-[#FF4439] shrink-0"></div>
                            <p className="font-dm text-white/40 text-sm tracking-widest uppercase">{thread.description || 'No session description provided.'}</p>
                        </div>
                    </div>

                    {/* MASTER MIX */}
                    <div className="mb-8 relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-teal-900/20 to-transparent blur-xl rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className={`flex items-center gap-6 bg-[#131B1A]/80 backdrop-blur-md border ${playingTrackId === 'master' ? 'border-teal-500/50 shadow-[0_0_30px_rgba(20,184,166,0.15)]' : 'border-white/10'} p-5 rounded-[2rem] transition-all relative z-10`}>
                            <button onClick={() => setPlayingTrackId(playingTrackId === 'master' ? null : 'master')} className={`w-16 h-16 shrink-0 rounded-full flex items-center justify-center transition-all border ${playingTrackId === 'master' ? 'bg-teal-500 text-black border-teal-400' : 'bg-white/5 text-white hover:bg-white/10 border-white/10'}`}>
                                {playingTrackId === 'master' ? <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg> : <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                            </button>
                            <div className="w-48 shrink-0 flex flex-col justify-center border-r border-white/5 pr-4">
                                <span className="text-teal-400 font-anton text-base tracking-wide uppercase">Master Mix</span>
                                <span className="text-white/40 font-dm text-xs uppercase tracking-widest mt-1">Full Bounce</span>
                            </div>
                            <div className="flex-grow flex items-center gap-[2px] h-16 bg-black/20 rounded-xl px-4 overflow-hidden border border-white/5">
                                {waveformHeights.map((h, i) => (
                                    <div key={i} className="flex-1 flex items-center justify-center h-full">
                                        <div style={{ height: `${h}%`, animationDelay: `${i * 0.05}s` }} className={`w-full max-w-[4px] rounded-full transition-all duration-300 ${playingTrackId === 'master' ? 'bg-teal-400 animate-[playing-pulse_1s_ease-in-out_infinite]' : 'bg-teal-900/50'}`}></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* STEMS HEADER */}
                    <div className="flex items-center gap-4 mb-4">
                        <div className="h-px flex-grow bg-gradient-to-r from-white/10 to-transparent"></div>
                        <span className="font-dm text-xs text-white/30 uppercase tracking-widest">Individual Stems ({safeContributions.length})</span>
                        <div className="h-px flex-grow bg-gradient-to-l from-white/10 to-transparent"></div>
                    </div>

                    {/* STEMS LIST */}
                    <div className="relative flex flex-col gap-6 pb-32 pl-16 mt-6">
                        <div className="absolute left-[12px] top-6 bottom-12 w-8 pointer-events-none z-0">
                            <svg className="w-full h-full text-[#FFD4CA]" preserveAspectRatio="none" viewBox="0 0 20 1000">
                                <path d="M 10,0 Q 20,50 10,100 T 10,200 T 10,300 T 10,400 T 10,500 T 10,600 T 10,700 T 10,800 T 10,900 T 10,1000" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 6" strokeLinecap="round" style={{ animation: 'thread-flow 1.5s linear infinite', opacity: 0.6 }} />
                            </svg>
                        </div>

                        {safeContributions.map((track) => {
                            const isPlaying = playingTrackId === track.id;
                            const isMuted = mutedTracks.has(track.id) || (soloTrackId !== null && soloTrackId !== track.id);
                            const isSolo = soloTrackId === track.id;
                            return (
                                <div key={track.id} className={`flex items-center gap-4 bg-[#131B1A]/95 backdrop-blur-xl shadow-xl border border-white/5 hover:border-white/10 p-3 pr-6 rounded-[1.5rem] transition-all relative z-10 w-full ${isMuted ? 'opacity-40 grayscale' : 'opacity-100'} ${isPlaying ? 'bg-[#1A2423]' : ''}`}>
                                    <div className="absolute -left-12 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-[1.5px] border-white/20 bg-transparent flex items-center justify-center z-20">
                                        <div className="w-2 h-2 bg-[#FFD4CA] rounded-full shadow-[0_0_10px_#FFD4CA] relative z-30"></div>
                                    </div>
                                    <button onClick={() => setPlayingTrackId(isPlaying ? null : track.id)} className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center transition-all ${isPlaying ? 'bg-[#FFD4CA] text-black shadow-[0_0_15px_rgba(255,212,202,0.3)]' : 'bg-[#0A0E0D] text-white hover:bg-white/10'}`}>
                                        {isPlaying ? <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg> : <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                                    </button>
                                    <div className="w-40 shrink-0 flex flex-col justify-center pr-2 min-w-0">
                                        <span className="text-[#FFD4CA] font-anton text-sm tracking-wide truncate uppercase">{track.role || 'Contributor'}</span>
                                        <span className="text-white/50 font-dm text-xs truncate">by {track.user?.name || 'Unknown'}</span>
                                    </div>
                                    <div className="flex gap-2 shrink-0 border-r border-white/5 pr-4">
                                        <button onClick={() => toggleMute(track.id)} className={`w-8 h-8 rounded-lg flex items-center justify-center font-anton text-xs transition-colors ${mutedTracks.has(track.id) ? 'bg-[#FF4439] text-white' : 'bg-black/30 text-white/40 hover:bg-black/50 hover:text-white'}`}>M</button>
                                        <button onClick={() => toggleSolo(track.id)} className={`w-8 h-8 rounded-lg flex items-center justify-center font-anton text-xs transition-colors ${isSolo ? 'bg-yellow-500 text-black' : 'bg-black/30 text-white/40 hover:bg-black/50 hover:text-white'}`}>S</button>
                                    </div>
                                    <div className="flex-grow flex items-center gap-[1px] h-10 bg-black/20 rounded-lg px-3 overflow-hidden opacity-70">
                                        {waveformHeights.slice(0, 30).map((h, i) => (
                                            <div key={i} className="flex-1 flex items-center justify-center h-full">
                                                <div style={{ height: `${h}%`, animationDelay: `${i * 0.05}s` }} className={`w-full max-w-[3px] rounded-full transition-all duration-300 ${isPlaying && !isMuted ? 'bg-[#FFD4CA] animate-[playing-pulse_0.8s_ease-in-out_infinite]' : 'bg-white/20'}`}></div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="w-24 shrink-0 pl-4">
                                        <input type="range" min="0" max="100" defaultValue="80" className="w-full" disabled={isMuted}/>
                                    </div>
                                </div>
                            );
                        })}

                        {/* ADD CONTRIBUTION BUTTON */}
                        <div className="relative mt-4 w-full">
                            <div className="absolute -left-12 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-[1.5px] border-[#FF4439]/50 bg-transparent flex items-center justify-center z-20">
                                <div className="w-2 h-2 bg-[#FF4439] rounded-full shadow-[0_0_10px_#FF4439] animate-pulse relative z-30"></div>
                            </div>
                            <button className="flex items-center justify-center gap-3 px-8 py-4 rounded-[1.5rem] bg-[#131B1A]/95 backdrop-blur-md border border-dashed border-[#FF4439]/40 text-[#FF4439] hover:bg-[#FF4439]/10 hover:border-[#FF4439]/80 transition-all font-anton text-sm tracking-wide w-full shadow-lg uppercase group relative z-10">
                                <svg className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
                                Add Contribution to Thread
                            </button>
                        </div>
                    </div>
                </main>

                {/* RIGHT SIDEBAR */}
                <aside className="col-span-3 hidden lg:flex flex-col py-8 h-full border-l border-white/5 pl-6 min-h-0">

                    {/* DROP A STEM BUTTON */}
                    <button className="w-full relative group mb-8 active:scale-95 transition-all duration-300 shrink-0">
                        <div className="absolute inset-0 bg-[#FF4439]/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
                        <div className="relative flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-[#0A0E0D] border border-[#FF4439]/40 text-[#FF4439] font-anton text-base tracking-wide uppercase shadow-[0_0_15px_rgba(255,68,57,0.1)] group-hover:shadow-[0_0_25px_rgba(255,68,57,0.2)] group-hover:border-[#FF4439] group-hover:text-white transition-all overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-[1px] bg-white/5"></div>
                            <svg className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
                            Drop a Stem
                        </div>
                    </button>

                    <div className="flex flex-col flex-1 min-h-0 gap-4 w-full">

                        {/* SESSION DETAILS ACCORDION */}
                        <div onClick={() => setActiveSidebarTab('details')} className={`border-[0.5px] border-white/5 rounded-[1.5rem] overflow-hidden transition-all duration-300 flex flex-col cursor-pointer ${activeSidebarTab === 'details' ? 'flex-1 min-h-0 bg-gradient-to-b from-[#131B1A] to-transparent shadow-xl' : 'h-[64px] shrink-0 bg-white/[0.01] hover:bg-white/[0.03]'}`}>
                            <div className="h-[64px] px-6 flex items-center shrink-0">
                                <h3 className={`font-anton text-xs tracking-widest uppercase flex items-center gap-2 m-0 transition-colors ${activeSidebarTab === 'details' ? 'text-white/80' : 'text-white/40'}`}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                    Session Details
                                </h3>
                            </div>
                            {activeSidebarTab === 'details' && (
                                <div className="px-6 pb-6 flex-1 overflow-y-auto no-scrollbar flex flex-col relative animate-[tab-fade-in_0.3s_ease-out]">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full pointer-events-none"></div>
                                    <div className="flex flex-col gap-1 mb-8 mt-2 relative z-10 shrink-0">
                                        <div className="flex justify-between items-end border-b border-white/[0.03] pb-3 mb-3">
                                            <span className="font-dm text-xs tracking-[0.2em] text-white/30 uppercase">Tempo</span>
                                            <span className="font-dm text-lg text-white tracking-wide">{thread.bpm || '120'} <span className="text-white/30 text-xs tracking-normal">BPM</span></span>
                                        </div>
                                        <div className="flex justify-between items-end border-b border-white/[0.03] pb-3">
                                            <span className="font-dm text-xs tracking-[0.2em] text-white/30 uppercase">Key Signature</span>
                                            <span className="font-dm text-lg text-[#FFD4CA] tracking-wide">{thread.musicalKey || 'C Minor'}</span>
                                        </div>
                                    </div>

                                    {/* CREATOR NAME — FIXED */}
                                    <div className="flex items-center gap-4 pt-2 relative z-10 shrink-0 w-full">
                                        <div className="w-12 h-12 shrink-0 rounded-full border-[0.5px] border-white/10 flex items-center justify-center bg-gradient-to-b from-white/5 to-transparent text-white font-anton text-base">
                                            {(thread.createdBy?.name || '?').charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex flex-col justify-center min-w-0 flex-1">
                                            <span className="font-cormorant italic text-[15px] text-white/40 mb-1 leading-none">Session initiated by</span>
                                            <div className="w-full min-w-0">
    <span className="font-dm text-sm text-[#FFD4CA] leading-snug tracking-wide block truncate">
        {thread.createdBy?.name || 'Unknown'}
    </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-8 pt-6 border-t border-white/[0.03] flex flex-col gap-4 relative z-10 shrink-0">
                                        <div className="flex justify-between items-center">
                                            <span className="font-dm text-[10px] tracking-[0.2em] text-white/30 uppercase">Initiated On</span>
                                            <span className="font-dm text-sm text-white/70 tracking-wide">{formattedDate}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="font-dm text-[10px] tracking-[0.2em] text-white/30 uppercase">Active Stems</span>
                                            <span className="font-anton text-base text-teal-400 tracking-wide">{safeContributions.length} <span className="text-white/30 text-xs tracking-normal font-dm">TRACKS</span></span>
                                        </div>
                                        <div className="mt-4 flex items-center justify-center gap-2 bg-teal-900/10 border border-teal-500/20 py-2.5 rounded-xl shrink-0">
                                            <div className="w-1.5 h-1.5 rounded-full bg-teal-500 shadow-[0_0_8px_teal] animate-pulse"></div>
                                            <span className="font-dm text-[10px] tracking-[0.2em] text-teal-300 uppercase">Open for Collaboration</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* SESSION LOG ACCORDION */}
                        <div onClick={() => setActiveSidebarTab('log')} className={`border-[0.5px] border-white/5 rounded-[1.5rem] overflow-hidden transition-all duration-300 flex flex-col cursor-pointer ${activeSidebarTab === 'log' ? 'flex-1 min-h-0 bg-gradient-to-b from-[#131B1A] to-transparent shadow-xl' : 'h-[64px] shrink-0 bg-white/[0.01] hover:bg-white/[0.03]'}`}>
                            <div className="h-[64px] px-6 flex items-center shrink-0">
                                <h3 className={`font-anton text-xs tracking-widest uppercase flex items-center gap-2 m-0 transition-colors ${activeSidebarTab === 'log' ? 'text-white/80' : 'text-white/40'}`}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                    Session Log
                                </h3>
                            </div>
                            {activeSidebarTab === 'log' && (
                                <div className="px-6 pb-6 flex-1 overflow-y-auto no-scrollbar flex flex-col animate-[tab-fade-in_0.3s_ease-out]">
                                    <div className="flex-col gap-3 pr-1 mt-2">
                                        {safeContributions.map((track) => (
                                            <div key={`log-${track.id}`} className="bg-white/5 rounded-xl p-4 border-[0.5px] border-white/5 hover:border-white/10 transition-colors mb-3">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex flex-col">
                                                        <span className="font-anton text-sm text-[#FFD4CA] tracking-wide leading-none uppercase">{track.user?.name || 'Unknown'}</span>
                                                        <span className="font-dm text-[10px] text-teal-400/80 uppercase tracking-widest mt-1">{track.role}</span>
                                                    </div>
                                                </div>
                                                <p className="font-dm text-sm text-white/60 leading-relaxed">{track.description || "No description provided for this stem."}</p>
                                            </div>
                                        ))}
                                        {safeContributions.length === 0 && (
                                            <div className="h-full flex items-center justify-center text-center">
                                                <p className="font-cormorant text-lg text-white/30 italic px-4 leading-relaxed">No stems have been added yet.<br/>Be the first to shape this track.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}