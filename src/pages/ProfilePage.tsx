import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { UserService } from '../services/UserService';
import { AuthService } from '../services/AuthService';
import type { ThreadSummary, ContributionResponse } from '../utils/profileUtils';
import { useCountUp, getInitial } from '../utils/profileUtils';
import { WaveformAvatar, FloatingNotes, RoleDNA, ContributionCard, ProfileThreadCard } from '../components/ProfileShared';

// ─── TYPES (ProfilePage-specific) ─────────────────────────────────────────────

interface Toast { message: string; type: 'success' | 'error'; }


// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function ProfilePage() {
    const navigate = useNavigate();

    const [userName, setUserName] = useState<string>('?');
    const [userEmail, setUserEmail] = useState<string>('');
    const [threads, setThreads] = useState<ThreadSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isReady, setIsReady] = useState(false);
    const [isFirstVisit, setIsFirstVisit] = useState(false);
    const [myStems, setMyStems] = useState<ContributionResponse[]>([]);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeletingProfile, setIsDeletingProfile] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');

    const [toast, setToast]         = useState<Toast | null>(null);
    const toastTimerRef             = useRef<ReturnType<typeof setTimeout> | null>(null);

    const showToast = useCallback((message: string, type: Toast['type']) => {
        setToast({ message, type });
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => setToast(null), 3500);
    }, []);

    useEffect(() => {
        // Route guard — if no session flag, redirect to auth.
        // The actual auth is enforced by the HttpOnly jwt cookie on the backend;
        // this flag is just a fast client-side check to avoid a flash of content.
        if (!sessionStorage.getItem('isLoggedIn')) {
            navigate('/auth');
            return;
        }
        // Pre-populate email from sessionStorage (set on login) so it shows
        // immediately, before the /me API call completes.
        setUserEmail(sessionStorage.getItem('userEmail') || '');
        if (!sessionStorage.getItem('profileAnimated')) {
            setIsFirstVisit(true);
            sessionStorage.setItem('profileAnimated', 'true');
        }
        setTimeout(() => setIsReady(true), 300);
    }, [navigate]);

    // REPLACE the entire fetchMyThreads function with this:
    const fetchMyProfile = useCallback(async () => {
        if (!sessionStorage.getItem('isLoggedIn')) return;

        try {
            // Cookie is sent automatically — no Authorization header needed.
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/users/me`);

            const profile = res.data; // This is now a UserProfileResponse object

            // Set the state using the direct profile data
            setThreads(profile.threadsCreated || []);
            setUserName(profile.name || '?');
            setUserEmail(profile.email || '');

            setMyStems(profile.contributions || []);

        } catch (error) {
            console.error('Failed to load profile', error);
            // 401 interceptor in api.ts will redirect automatically
            if (axios.isAxiosError(error) && error.response?.status !== 401) {
                // non-auth error — just log it
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    // UPDATE the useEffect to call the new function
    useEffect(() => {
        fetchMyProfile();
    }, [fetchMyProfile]);

    const handleLogout = async () => {
        await AuthService.logout(); // clears the HttpOnly cookie server-side
        navigate('/');
    };

    const handleLeaveAalap = async () => {
        if (!deletePassword.trim()) return;
        setIsDeletingProfile(true);
        try {
            await UserService.deleteMyAccount(deletePassword); // verifies password server-side
            await AuthService.logout();                        // clears the HttpOnly cookie
            navigate('/');
        } catch (error) {
            console.error('Failed to leave Aalap', error);
            showToast('Could not delete account. Check your password and try again.', 'error');
            setIsDeletingProfile(false);
            setIsDeleteModalOpen(false);
            setDeletePassword('');
        }
    };

    const totalStems = threads.reduce((sum, t) => sum + t.contributionCount, 0);
    const uniqueCollaborators = new Set(threads.flatMap(t => t.contributorIds)).size;

    const countThreads = useCountUp(isLoading ? 0 : threads.length, 1200, 700);
    const countStems = useCountUp(isLoading ? 0 : totalStems, 1400, 800);
    const countCollabs = useCountUp(isLoading ? 0 : uniqueCollaborators, 1100, 900);

    const initial = getInitial(userName);


    return (
        <div className="min-h-screen bg-[#060808] text-[#FCFCFC] overflow-x-hidden">

            <link
                href="https://fonts.googleapis.com/css2?family=Anton&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap"
                rel="stylesheet"/>

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
                @keyframes toast-up     { from { opacity:0; transform:translateX(-50%) translateY(8px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
            `}</style>

            {/* AMBIENT BACKGROUND */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-15%] left-[-8%] w-[700px] h-[700px] rounded-full"
                     style={{
                         background: 'radial-gradient(circle, rgba(71,91,90,0.12) 0%, transparent 65%)',
                         animation: 'glow-breathe 6s ease-in-out infinite'
                     }}/>
                <div className="absolute bottom-[-10%] right-[-8%] w-[500px] h-[500px] rounded-full"
                     style={{
                         background: 'radial-gradient(circle, rgba(255,68,57,0.07) 0%, transparent 65%)',
                         animation: 'glow-breathe 4s ease-in-out 2s infinite'
                     }}/>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[2px] h-[340px]"
                     style={{
                         background: 'linear-gradient(to bottom, rgba(255,68,57,0.3), transparent)',
                         animation: 'spotlight 5s ease-in-out infinite'
                     }}/>
            </div>

            {/* ── NAVBAR ──────────────────────────────────────────────────────── */}
            <nav className="sticky top-0 z-50 bg-[#060808]/70 backdrop-blur-2xl border-b border-white/[0.05]"
                 style={{animation: 'fade-in 0.4s ease-out both'}}>
                <div className="max-w-[1100px] mx-auto px-6 h-14 flex items-center justify-between">
                    <button onClick={() => navigate('/home')}
                            className="flex items-center gap-2 text-white/25 hover:text-white/70 font-dm text-sm transition-all duration-200 group">
                        <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200"
                             fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
                        </svg>
                        Feed
                    </button>
                    <span
                        className="font-anton text-lg tracking-widest text-white/10 uppercase select-none">Aalap</span>
                    <button onClick={handleLogout}
                            className="flex items-center gap-2 font-dm text-[11px] text-white/20 hover:text-[#FF4439]/70 uppercase tracking-widest transition-all duration-200 group">
                        <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-200"
                             fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                        </svg>
                        Logout
                    </button>
                </div>
            </nav>

            {/* ── HERO ────────────────────────────────────────────────────────── */}
            <div className="relative overflow-hidden" style={{minHeight: 340}}>
                <FloatingNotes/>

                {/* Giant background initial */}
                <div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
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
                    <div
                        style={{animation: isFirstVisit ? 'fade-up 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.1s both' : undefined}}>
                        <WaveformAvatar initial={initial} isReady={isReady}/>
                    </div>

                    {/* Name — char by char drop */}
                    {/* Name — char by char drop, word-grouped to prevent mid-word line breaks */}
                    <div
                        className="flex flex-wrap justify-center items-end gap-x-[0.25em] gap-y-0 mt-4 w-full px-6 overflow-y-hidden"
                        style={{lineHeight: 1}}>
                        {userName !== '?' && userName.split(' ').map((word, wi, words) => {
                            const charOffset = words.slice(0, wi).reduce((acc, w) => acc + w.length + 1, 0);
                            return (
                                <span key={wi} className="inline-flex items-end" style={{whiteSpace: 'nowrap'}}>
                                    {word.split('').map((char, ci) => (
                                        <span key={ci} className="font-anton tracking-wide uppercase"
                                              style={{
                                                  display: 'inline-block',
                                                  fontSize: 'clamp(2rem, 11vw, 4.5rem)',
                                                  color: '#FCFCFC',
                                                  animation: isFirstVisit ? `char-drop 0.5s cubic-bezier(0.34,1.56,0.64,1) ${0.35 + (charOffset + ci) * 0.04}s both` : undefined,
                                                  textShadow: '0 2px 20px rgba(0,0,0,0.5)',
                                              }}>
                                            {char}
                                        </span>
                                    ))}
                                </span>
                            );
                        })}
                    </div>

                    {/* Red underline sweep */}
                    <div className="mt-1 h-[2px] w-32"
                         style={{
                             background: 'linear-gradient(90deg, transparent, #FF4439, transparent)',
                             animation: isFirstVisit ? 'name-line 0.6s ease-out 0.8s both' : undefined,
                             transformOrigin: 'center',
                         }}/>

                    <p className="font-dm text-sm text-white/20 mt-3 tracking-wide"
                       style={{animation: isFirstVisit ? 'fade-up 0.5s ease-out 0.85s both' : undefined}}>
                        {userEmail}
                    </p>

                    <div className="flex items-center gap-2 mt-2"
                         style={{animation: isFirstVisit ? 'fade-up 0.5s ease-out 0.95s both' : undefined}}>
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF4439]"
                              style={{
                                  animation: 'glow-breathe 2s ease-in-out infinite',
                                  boxShadow: '0 0 6px rgba(255,68,57,0.8)'
                              }}/>
                        <span className="font-dm text-[10px] uppercase tracking-[0.35em] text-[#FF4439]/50">
                            Aalap Artist
                        </span>
                    </div>
                </div>
            </div>

            {/* ── STATS BAR ───────────────────────────────────────────────────── */}
            <div className="relative z-10 border-y border-white/[0.05]"
                 style={{background: 'linear-gradient(90deg, rgba(71,91,90,0.05), rgba(255,68,57,0.03), rgba(71,91,90,0.05))'}}>
                <div className="max-w-[1100px] mx-auto px-6">
                    <div className="grid grid-cols-3 divide-x divide-white/[0.05]">
                        {[
                            {label: 'Threads', value: countThreads, accent: '#FFD4CA', delay: '0.55s'},
                            {label: 'Total Stems', value: countStems, accent: '#FF4439', delay: '0.65s'},
                            {label: 'Collaborators', value: countCollabs, accent: '#8BAFAE', delay: '0.75s'},
                        ].map((stat) => (
                            <div key={stat.label}
                                 className="group relative flex flex-col items-center py-8 cursor-default border border-transparent hover:border-[#FF4439]/10 transition-all duration-300 rounded-none"
                                 style={{animation: isFirstVisit ? `stat-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) ${stat.delay} both` : undefined}}>
                                <div
                                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                                    style={{background: `radial-gradient(ellipse 120px 80px at 50% 100%, ${stat.accent}08 0%, transparent 70%)`}}/>
                                <p className="font-anton text-4xl sm:text-5xl md:text-6xl leading-none tabular-nums group-hover:scale-105 transition-transform duration-200"
                                   style={{color: stat.accent, textShadow: `0 0 30px ${stat.accent}40`}}>
                                    {isLoading ? '—' : stat.value}
                                </p>
                                <p className="font-dm text-[9px] sm:text-[10px] uppercase tracking-[0.15em] sm:tracking-[0.25em] text-white/20 mt-2 text-center">
                                    {stat.label}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── BODY ────────────────────────────────────────────────────────── */}
            <div className="relative z-10 max-w-[1100px] mx-auto px-6 pt-12 pb-28">

                {!isLoading && <RoleDNA threads={threads}/>}

                {/* Section header */}
                <div className="flex items-center gap-4 mb-8"
                     style={{animation: isFirstVisit ? 'fade-up 0.5s ease-out 1s both' : undefined}}>
                    <div className="flex items-center gap-3 flex-1">
                        <div className="w-6 h-[1px]"
                             style={{background: 'linear-gradient(90deg, #FF4439, rgba(255,68,57,0))'}}/>
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
                            <div key={i}
                                 className="rounded-2xl border border-white/[0.04] bg-white/[0.015] p-6 animate-pulse"
                                 style={{opacity: 1 - i * 0.18}}>
                                <div className="h-6 bg-white/[0.05] rounded-lg w-2/3 mb-4"/>
                                <div className="h-3 bg-white/[0.03] rounded w-full mb-2"/>
                                <div className="h-3 bg-white/[0.03] rounded w-3/4 mb-5"/>
                                <div className="flex gap-2 mb-5">
                                    {[1, 2, 3].map(j => <div key={j} className="h-5 w-16 bg-white/[0.04] rounded-md"/>)}
                                </div>
                                <div className="h-px bg-white/[0.04] mb-4"/>
                                <div className="flex justify-between">
                                    <div className="flex -space-x-1">
                                        {[1, 2, 3].map(j => <div key={j}
                                                                 className="w-6 h-6 rounded-full bg-white/[0.05]"/>)}
                                    </div>
                                    <div className="h-6 w-20 bg-white/[0.04] rounded-lg"/>
                                </div>
                            </div>
                        ))}
                    </div>

                ) : threads.length === 0 ? (
                    <div className="py-28 flex flex-col items-center"
                         style={{animation: 'fade-up 0.5s ease-out 0.3s both'}}>
                        <div
                            className="w-20 h-20 rounded-full border border-white/[0.05] flex items-center justify-center mb-6"
                            style={{background: 'radial-gradient(circle, rgba(255,68,57,0.05) 0%, transparent 70%)'}}>
                            <svg className="w-8 h-8 text-white/10" fill="none" stroke="currentColor"
                                 viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                                      d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
                            </svg>
                        </div>
                        <p className="font-dm text-white/20 italic text-base mb-2">No threads yet.</p>
                        <p className="font-dm text-white/10 text-sm mb-8">Plant the first seed. Let others grow it.</p>
                        <button onClick={() => navigate('/home')}
                                className="group relative font-anton text-sm tracking-[0.2em] uppercase px-8 py-3.5 rounded-xl overflow-hidden border border-[#FF4439]/30 text-[#FF4439]/60 hover:text-white transition-colors duration-300">
                            <div
                                className="absolute inset-0 -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out"
                                style={{background: 'linear-gradient(90deg, #B72F30, #FF4439)'}}/>
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
                {/* ── CONTRIBUTIONS SECTION ── */}
                {!isLoading && myStems.length > 0 && (
                    <div className="mt-16 animate-[fade-up_0.5s_ease-out_1.2s_both]">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="flex items-center gap-3 flex-1">
                                <div className="w-6 h-[1px]"
                                     style={{background: 'linear-gradient(90deg, #2DD4BF, rgba(45,212,191,0))'}}/>
                                <p className="font-dm text-[10px] uppercase tracking-[0.35em] text-white/25">My
                                    Contributions</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {myStems.map((stem) => (
                                <ContributionCard
                                    key={stem.id}
                                    stem={stem}
                                    onClick={() => navigate(`/threads/${stem.noolId}`)}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
            {/* ── DANGER ZONE ──────────────────────────────────────────────────────── */}
            {!isLoading && (
                <div
                    className="relative z-10 max-w-[1100px] mx-auto px-6 pb-24 pt-10 border-t border-white/[0.05] flex flex-col items-center mt-10">
                    <p className="font-dm text-sm text-white/30 mb-5 text-center max-w-md">
                        If you wish to remove your presence, your threads, and your stems from Aalap entirely, you can
                        choose to leave.
                    </p>
                    <button onClick={() => setIsDeleteModalOpen(true)}
                            className="font-anton text-sm tracking-[0.2em] uppercase text-[#FF4439]/60 hover:text-[#FF4439] border border-[#FF4439]/30 hover:border-[#FF4439] hover:bg-[#FF4439]/10 px-8 py-3.5 rounded-xl transition-all duration-300">
                        Leave Aalap
                    </button>
                </div>
            )}

            {/* ── TOAST ───────────────────────────────────────────────────────────── */}
            {toast && (
                <div className={`fixed bottom-8 left-1/2 z-[300] px-5 py-3 rounded-2xl
                    text-sm font-dm backdrop-blur-md border shadow-2xl whitespace-nowrap
                    ${toast.type === 'success' ? 'bg-[#344443]/90 border-[#475B5A] text-[#FFD4CA]' : 'bg-[#B72F30]/90 border-[#FF4439]/50 text-[#FCFCFC]'}`}
                     style={{ animation: 'toast-up 0.25s ease-out', transform: 'translateX(-50%)' }}>
                    {toast.message}
                </div>
            )}

            {/* ── DELETE CONFIRMATION MODAL ────────────────────────────────────────── */}            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md"
                         onClick={() => { if (!isDeletingProfile) { setIsDeleteModalOpen(false); setDeletePassword(''); } }}/>
                    <div
                        className="relative z-10 w-full max-w-[420px] bg-[#080C0B] border border-[#FF4439]/30 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-[#FF4439]/10"
                        style={{animation: 'fade-up 0.25s ease-out both'}}>
                        <h3 className="font-anton text-3xl uppercase tracking-wide text-white mb-2">Leave Aalap?</h3>
                        <p className="font-dm text-sm text-white/50 mb-6 leading-relaxed">
                            This will permanently delete your account, <strong className="text-white">all
                            sessions</strong> you've started, and <strong className="text-white">all
                            stems</strong> you've contributed to other threads. This action cannot be undone.
                        </p>
                        {/* Re-authentication: user must confirm their password before we wipe the account */}
                        <div className="mb-6">
                            <label className="font-dm text-[10px] text-white/30 uppercase tracking-widest block mb-2">
                                Confirm your password
                            </label>
                            <input
                                type="password"
                                value={deletePassword}
                                onChange={e => setDeletePassword(e.target.value)}
                                placeholder="Enter your password"
                                disabled={isDeletingProfile}
                                className="w-full bg-white/[0.03] border border-white/10 focus:border-[#FF4439]/40 text-white placeholder:text-white/20 px-4 py-3 rounded-xl font-dm text-sm focus:outline-none transition-colors disabled:opacity-50"
                            />
                        </div>
                        <div className="flex flex-col gap-3">
                            <button onClick={handleLeaveAalap} disabled={isDeletingProfile || !deletePassword.trim()}
                                    className="w-full font-anton text-sm tracking-[0.15em] uppercase bg-[#FF4439] text-white hover:bg-[#B72F30] py-4 rounded-xl transition-colors flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed">
                                {isDeletingProfile ? 'Erasing Presence...' : 'Yes, Delete Everything'}
                            </button>
                            <button onClick={() => { setIsDeleteModalOpen(false); setDeletePassword(''); }} disabled={isDeletingProfile}
                                    className="w-full font-dm text-sm text-white/40 hover:text-white py-3 transition-colors disabled:opacity-50">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


