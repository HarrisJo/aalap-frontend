import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// --- TYPES & INTERFACES ---
interface UserInfo {
    id: number;
    name: string;
    email: string;
    avatar?: string;
}

interface ThreadSummary {
    id: number;
    title: string;
    description: string;
    createdBy: UserInfo;
    createdAt: string;
    contributionCount: number;
    rolesWithContributors: {
        [role: string]: string[];
    };
    audioPreviewUrl?: string;
    hasSaved: boolean;
}

export default function HomeFeed() {
    const navigate = useNavigate();
    const [nools, setNools] = useState<ThreadSummary[]>([]);
    const [playingId, setPlayingId] = useState<number | null>(null);
    const [isNavOpen, setIsNavOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchNools = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/auth');
                return;
            }

            try {
                const response = await axios.get('https://aalap-backend-1.onrender.com/api/threads', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setNools(response.data);
            } catch (error) {
                console.error("Failed to sync with Aalap server:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchNools();
    }, [navigate]);

    const togglePlay = (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        setPlayingId(playingId === id ? null : id);
    };

    const toggleSave = (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        setNools(nools.map(nool => {
            if (nool.id === id) {
                return { ...nool, hasSaved: !nool.hasSaved };
            }
            return nool;
        }));
    };

    return (
        <div className="min-h-screen bg-[#0A0E0D] text-[#FCFCFC] overflow-hidden flex justify-center relative selection:bg-[#FF4439]/30">

            <style>
                {`
                    @keyframes subtle-float { 0% { transform: translateY(0px); } 50% { transform: translateY(-4px); } 100% { transform: translateY(0px); } }
                    @keyframes thread-pulse { 0% { opacity: 0.15; stroke-width: 1; } 50% { opacity: 0.4; stroke-width: 1.5; } 100% { opacity: 0.15; stroke-width: 1; } }
                    @keyframes wave-bounce { 0%, 100% { height: 4px; } 50% { height: 16px; } }
                    @keyframes ambient-breathe { 0%, 100% { transform: scaleY(0.4); opacity: 0.3; } 50% { transform: scaleY(1); opacity: 0.8; } }
                    @keyframes fade-in { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
                    .no-scrollbar::-webkit-scrollbar { display: none; }
                    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                `}
            </style>

            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-teal-900/10 blur-[120px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[40%] bg-[#FF4439]/5 blur-[120px] rounded-full pointer-events-none"></div>

            <div className="w-full max-w-[1600px] grid grid-cols-12 h-screen relative z-10 px-6 gap-8">

                {/* --- PANE 1: LEFT NAVIGATION --- */}
                <aside className="col-span-3 hidden lg:flex flex-col py-8 h-full border-r border-white/5 pr-6 relative">
                    <div className="absolute top-8 right-6 z-50">
                        <button onClick={() => setIsNavOpen(!isNavOpen)} className="w-12 h-12 rounded-full bg-white/[0.03] border border-white/10 hover:bg-white/10 hover:border-[#FFD4CA]/50 flex items-center justify-center transition-all group shadow-lg">
                            {isNavOpen ? (
                                <svg className="w-5 h-5 text-white/70 group-hover:text-[#FFD4CA] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            ) : (
                                <div className="space-y-1.5 flex flex-col items-end">
                                    <div className="w-5 h-[2px] bg-white/70 group-hover:bg-[#FFD4CA] rounded-full transition-colors"></div>
                                    <div className="w-4 h-[2px] bg-white/70 group-hover:bg-[#FFD4CA] rounded-full transition-colors"></div>
                                    <div className="w-5 h-[2px] bg-white/70 group-hover:bg-[#FFD4CA] rounded-full transition-colors"></div>
                                </div>
                            )}
                        </button>
                    </div>

                    {isNavOpen ? (
                        <div className="flex flex-col h-full animate-[fade-in_0.3s_ease-out]">
                            <div className="mb-12 px-4 cursor-pointer" onClick={() => navigate('/home')}>
                                <h1 className="font-bebas text-5xl text-[#FCFCFC] tracking-wide drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">AALAP</h1>
                                <p className="font-cormorant italic text-lg text-[#FFD4CA] mt-[-4px] whitespace-nowrap">Music collaboration, reimagined.</p>
                            </div>
                            <nav className="flex flex-col gap-2 font-dm">
                                <button className="flex items-center gap-4 px-4 py-3 bg-white/5 text-white rounded-2xl border border-white/10 transition-all">
                                    <svg className="w-6 h-6 text-[#FFD4CA]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
                                    <span className="text-lg font-medium tracking-wide">Studio Feed</span>
                                </button>
                                <button className="flex items-center gap-4 px-4 py-3 text-white/50 hover:text-white hover:bg-white/[0.02] rounded-2xl transition-all">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"></path></svg>
                                    <span className="text-lg tracking-wide">Discover Threads</span>
                                </button>
                                <button className="flex items-center gap-4 px-4 py-3 text-white/50 hover:text-white hover:bg-white/[0.02] rounded-2xl transition-all">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                                    <span className="text-lg tracking-wide">My Tracks</span>
                                </button>
                                <button className="flex items-center gap-4 px-4 py-3 text-white/50 hover:text-white hover:bg-white/[0.02] rounded-2xl transition-all group relative">
                                    <div className="absolute top-3 left-8 w-2 h-2 bg-[#FF4439] rounded-full shadow-[0_0_8px_#FF4439]"></div>
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                                    <span className="text-lg tracking-wide">Messages</span>
                                </button>
                            </nav>
                            <div className="mt-auto pb-4">
                                <button className="w-full bg-[#FF4439] hover:bg-[#B72F30] text-white font-dm px-6 py-4 rounded-2xl transition-all shadow-lg shadow-[#FF4439]/20 flex items-center justify-center gap-3">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
                                    <span className="font-semibold text-lg">Start a Thread</span>
                                </button>
                                <div className="mt-6 flex items-center gap-4 px-4 py-3 bg-[#131B1A] border border-white/5 rounded-2xl">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-[#FFD4CA] flex items-center justify-center text-black font-bebas text-xl shrink-0">HJ</div>
                                    <div className="overflow-hidden">
                                        <p className="font-dm text-sm text-white font-medium truncate">Harris Joshua</p>
                                        <p className="font-dm text-xs text-white/40 truncate">Pianist & Composer</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full w-full items-center justify-center animate-[fade-in_0.5s_ease-out] relative">
                            <div className="absolute left-6 top-1/2 -translate-y-1/2">
                                <h1 className="font-bebas text-5xl text-white/5 tracking-[0.2em] transform -rotate-180" style={{ writingMode: 'vertical-rl' }}>AALAP</h1>
                            </div>
                            <div className="flex items-center gap-4 h-[40vh] mt-20">
                                <div className="w-[2px] h-full bg-gradient-to-b from-transparent via-[#FFD4CA]/50 to-transparent animate-[ambient-breathe_6s_ease-in-out_infinite] blur-[1px]"></div>
                                <div className="w-[3px] h-full bg-gradient-to-b from-transparent via-teal-500/40 to-transparent animate-[ambient-breathe_8s_ease-in-out_infinite_1s] blur-[2px]"></div>
                                <div className="w-[1px] h-[70%] bg-gradient-to-b from-transparent via-[#FF4439]/60 to-transparent animate-[ambient-breathe_5s_ease-in-out_infinite_2.5s]"></div>
                                <div className="w-[2px] h-[90%] bg-gradient-to-b from-transparent via-white/20 to-transparent animate-[ambient-breathe_7s_ease-in-out_infinite_0.5s]"></div>
                            </div>
                            <p className="font-dm text-[10px] text-white/20 tracking-widest uppercase mt-12 animate-pulse">Studio Standby</p>
                        </div>
                    )}
                </aside>

                {/* --- PANE 2: THE MAIN FEED --- */}
                <main className="col-span-12 lg:col-span-6 xl:col-span-6 h-full overflow-y-auto no-scrollbar py-8 flex flex-col gap-6 relative">
                    <header className="sticky top-0 z-50 bg-[#0A0E0D]/80 backdrop-blur-xl border border-white/5 rounded-[2rem] p-2 flex items-center justify-between shadow-2xl mb-4">
                        <div className="flex-grow flex items-center px-4 gap-3">
                            <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                            <input type="text" placeholder="Search tracks, roles, or creators..." className="w-full bg-transparent border-none outline-none text-white/80 font-dm placeholder-white/30 text-lg py-2" />
                        </div>
                        <div className="flex items-center gap-2 pr-4">
                            <kbd className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-white/40 font-dm text-xs hidden sm:block">CTRL</kbd>
                            <kbd className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-white/40 font-dm text-xs hidden sm:block">K</kbd>
                        </div>
                    </header>

                    <div className="space-y-8 pb-32">
                        {isLoading ? (
                            <div className="text-center py-20 font-dm text-white/20 animate-pulse">Syncing with server...</div>
                        ) : nools.map((nool, index) => (
                            <div
                                key={nool.id}
                                className="bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-[2rem] p-8 cursor-pointer transition-all duration-300 hover:bg-white/[0.04] hover:border-[#FFD4CA]/20 hover:shadow-2xl hover:shadow-[#FFD4CA]/5 flex flex-col relative group"
                                style={{ animation: `subtle-float 6s ease-in-out infinite`, animationDelay: `${index * 0.4}s` }}
                                onClick={() => navigate(`/threads/${nool.id}`)}
                            >
                                <div className="flex justify-between items-start mb-6 relative z-10">
                                    <div className="pr-6 flex-grow">
                                        <div className="flex items-center gap-4 mb-2">
                                            <button onClick={(e) => togglePlay(e, nool.id)} className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-all ${playingId === nool.id ? 'bg-[#FFD4CA] text-black shadow-[0_0_20px_rgba(255,212,202,0.4)]' : 'bg-[#131B1A] border border-white/10 text-[#FFD4CA] hover:bg-white/10'}`}>
                                                {playingId === nool.id ? <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg> : <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                                            </button>
                                            <div>
                                                <h2 className="font-bebas text-4xl text-[#FCFCFC] tracking-wider group-hover:text-[#FFD4CA] transition-colors leading-none">{nool.title}</h2>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[9px] font-bebas text-white/70">
                                                        {nool.createdBy.name.charAt(0)}
                                                    </div>
                                                    <p className="font-dm text-white/50 text-sm">Started by <span className="text-white/80 hover:underline">{nool.createdBy.name}</span></p>
                                                    {playingId === nool.id && (
                                                        <div className="flex items-end gap-[2px] h-4 ml-3">
                                                            <div className="w-[3px] bg-[#FFD4CA] rounded-full animate-[wave-bounce_0.8s_ease-in-out_infinite]"></div>
                                                            <div className="w-[3px] bg-[#FFD4CA] rounded-full animate-[wave-bounce_1.2s_ease-in-out_infinite_0.2s]"></div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-[#131B1A] px-5 py-3 rounded-2xl border border-white/5 text-center flex flex-col justify-center shadow-inner shrink-0 group-hover:border-[#FFD4CA]/20 transition-colors">
                                        <span className="block font-bebas text-[#FCFCFC] text-2xl leading-none">{nool.contributionCount}</span>
                                        <span className="block font-dm text-[10px] text-teal-200/50 uppercase tracking-widest mt-1.5">Tracks</span>
                                    </div>
                                </div>
                                <p className="font-dm text-white/70 mb-8 text-lg leading-relaxed relative z-10">{nool.description}</p>
                                <div className="relative mt-auto pt-4 pb-6">
                                    <div className="absolute top-[calc(50%-12px)] left-0 w-full h-8 -translate-y-1/2 overflow-hidden pointer-events-none">
                                        <svg viewBox="0 0 200 20" preserveAspectRatio="none" className="w-full h-full text-[#FFD4CA]">
                                            <path d="M -10,10 Q 15,25 40,10 T 90,10 T 140,10 T 190,10 T 240,10" fill="none" stroke="currentColor" style={{ animation: 'thread-pulse 4s ease-in-out infinite' }} />
                                        </svg>
                                    </div>
                                    <div className="flex flex-wrap gap-x-6 gap-y-4 relative z-10">
                                        {Object.entries(nool.rolesWithContributors).map(([role, users]) => (
                                            <div key={role} className="flex items-center gap-3 group/node">
                                                <div className="w-2 h-2 rounded-full bg-[#FFD4CA] shadow-[0_0_10px_rgba(255,212,202,0.8)] group-hover/node:scale-150 transition-transform"></div>
                                                <div className="px-5 py-2 bg-[#131B1A] border border-white/10 rounded-full flex items-center gap-2 shadow-lg">
                                                    <span className="font-dm text-sm text-[#FFD4CA] font-medium tracking-wide">{role}</span>
                                                    <span className="w-1 h-1 rounded-full bg-white/20"></span>
                                                    <span className="font-dm text-xs text-white/60">{users.join(', ')}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between pt-6 mt-2 border-t border-white/5 relative z-10">
                                    <button onClick={(e) => { e.stopPropagation(); }} className="flex items-center gap-2 text-white/50 hover:text-white transition-colors group/btn">
                                        <svg className="w-6 h-6 transition-transform group-hover/btn:scale-110" fill="none" strokeWidth="1.5" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                                        <span className="font-dm text-sm font-medium">Share</span>
                                    </button>
                                    <button onClick={(e) => toggleSave(e, nool.id)} className={`transition-colors group/btn flex items-center gap-2 ${nool.hasSaved ? 'text-[#FFD4CA]' : 'text-white/50 hover:text-[#FFD4CA]'}`}>
                                        <span className="font-dm text-sm font-medium">{nool.hasSaved ? 'Saved' : 'Save'}</span>
                                        {nool.hasSaved ? <svg className="w-6 h-6 transition-transform group-hover/btn:scale-110" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M6.5 3A2.5 2.5 0 004 5.5v15.5l8-4.5 8 4.5V5.5A2.5 2.5 0 0017.5 3h-11z" clipRule="evenodd" /></svg> : <svg className="w-6 h-6 transition-transform group-hover/btn:scale-110" fill="none" strokeWidth="1.5" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.5 3h-11a2.5 2.5 0 00-2.5 2.5v15.5l8-4.5 8 4.5V5.5A2.5 2.5 0 0017.5 3z" /></svg>}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </main>

                {/* --- PANE 3: DISCOVERY / CONTEXT --- */}
                <aside className="col-span-3 hidden xl:flex flex-col py-8 h-full border-l border-white/5 pl-6 overflow-y-auto no-scrollbar">
                    {/* Widget: Roles in Demand */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-6 mb-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF4439]/10 blur-3xl rounded-full"></div>
                        <h3 className="font-bebas text-2xl text-white mb-6 flex items-center gap-2 relative z-10">
                            <svg className="w-5 h-5 text-[#FF4439]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                            Roles in Demand
                        </h3>
                        <div className="space-y-4 relative z-10">
                            <div className="flex justify-between items-center group cursor-pointer">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-[#131B1A] flex items-center justify-center border border-white/10 group-hover:border-[#FFD4CA]/50 transition-colors">🎤</div>
                                    <span className="font-dm text-white/80 group-hover:text-white transition-colors">Vocalist</span>
                                </div>
                                <span className="font-dm text-xs text-[#FFD4CA] bg-[#FFD4CA]/10 px-2 py-1 rounded-md">24 threads</span>
                            </div>
                            <div className="flex justify-between items-center group cursor-pointer">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-[#131B1A] flex items-center justify-center border border-white/10 group-hover:border-[#FFD4CA]/50 transition-colors">🎸</div>
                                    <span className="font-dm text-white/80 group-hover:text-white transition-colors">Bassist</span>
                                </div>
                                <span className="font-dm text-xs text-[#FFD4CA] bg-[#FFD4CA]/10 px-2 py-1 rounded-md">18 threads</span>
                            </div>
                        </div>
                    </div>

                    {/* RESTORED: THE HIGH-FIDELITY TRENDING THREADS WIDGET */}
                    <div className="bg-[#131B1A] border border-white/5 rounded-[2rem] p-6">
                        <h3 className="font-bebas text-xl text-white/50 tracking-widest uppercase mb-4 whitespace-nowrap">Trending Threads</h3>
                        <div className="w-full aspect-square rounded-2xl bg-gradient-to-br from-teal-900 to-[#0A0E0D] border border-white/10 mb-4 flex flex-col justify-end p-4 relative overflow-hidden group cursor-pointer">
                            {/* Fake Audio Waveform */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-20 group-hover:opacity-40 transition-opacity">
                                <div className="w-1 h-12 bg-[#FFD4CA] rounded-full mx-1 animate-[pulse_1s_ease-in-out_infinite]"></div>
                                <div className="w-1 h-24 bg-[#FFD4CA] rounded-full mx-1 animate-[pulse_1.2s_ease-in-out_infinite]"></div>
                                <div className="w-1 h-16 bg-[#FFD4CA] rounded-full mx-1 animate-[pulse_0.8s_ease-in-out_infinite]"></div>
                                <div className="w-1 h-8 bg-[#FFD4CA] rounded-full mx-1 animate-[pulse_1.5s_ease-in-out_infinite]"></div>
                                <div className="w-1 h-20 bg-[#FFD4CA] rounded-full mx-1 animate-[pulse_1.1s_ease-in-out_infinite]"></div>
                            </div>

                            <div className="relative z-10 backdrop-blur-sm bg-black/40 p-3 rounded-xl border border-white/10">
                                <h4 className="font-bebas text-2xl text-white">Neon Skyline</h4>
                                <p className="font-dm text-xs text-[#FFD4CA]">Synthwave • 120 BPM</p>
                            </div>
                        </div>

                        <div className="flex justify-between items-center">
                            <div className="flex -space-x-2">
                                <div className="w-8 h-8 rounded-full border-2 border-[#131B1A] bg-teal-500 shadow-lg"></div>
                                <div className="w-8 h-8 rounded-full border-2 border-[#131B1A] bg-purple-500 shadow-lg"></div>
                                <div className="w-8 h-8 rounded-full border-2 border-[#131B1A] bg-[#FF4439] shadow-lg"></div>
                            </div>
                            <button className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 transition-transform shadow-[0_0_15px_rgba(255,255,255,0.4)]">
                                <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                            </button>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}