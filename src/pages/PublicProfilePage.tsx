import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import type { ThreadSummary, ContributionResponse } from '../utils/profileUtils';
import { useCountUp } from '../utils/profileUtils';
import { WaveformAvatar, FloatingNotes, RoleDNA, ContributionCard, ProfileThreadCard } from '../components/ProfileShared';

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function PublicProfilePage() {
    const navigate = useNavigate();
    const { id }   = useParams();

    const [userName,  setUserName]  = useState<string>('?');
    const [userEmail, setUserEmail] = useState<string>('');
    const [gravatarUrl, setGravatarUrl] = useState<string>('');
    const [threads,   setThreads]   = useState<ThreadSummary[]>([]);
    const [myStems,   setMyStems]   = useState<ContributionResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isReady,   setIsReady]   = useState(false);

    const fetchPublicProfile = useCallback(async () => {
        if (!sessionStorage.getItem('isLoggedIn')) { navigate('/auth'); return; }
        try {
            // Cookie is sent automatically — no Authorization header needed.
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/users/${id}`);
            const profile = res.data;
            setThreads(profile.threadsCreated || []);
            setUserName(profile.name || '?');
            setUserEmail(profile.email || '');
            setGravatarUrl(profile.gravatarUrl || '');
            setMyStems(profile.contributions || []);
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
    const uniqueCollaborators = new Set(threads.flatMap(t => t.contributorIds)).size;

    const countThreads = useCountUp(isLoading ? 0 : threads.length,      1200, 700);
    const countStems   = useCountUp(isLoading ? 0 : totalStems,           1400, 800);
    const countCollabs = useCountUp(isLoading ? 0 : uniqueCollaborators,  1100, 900);

    const initial = (userName ?? '?').charAt(0).toUpperCase();

    return (
        <div className="min-h-screen bg-[#060808] text-[#FCFCFC] overflow-x-hidden">
            <link href="https://fonts.googleapis.com/css2?family=Anton&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap" rel="stylesheet" />
            <style>{`
                .font-anton  { font-family: 'Anton', sans-serif; }
                .font-dm     { font-family: 'DM Sans', sans-serif; }
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
            `}</style>

            {/* NAVBAR */}
            <nav className="sticky top-0 z-50 bg-[#060808]/70 backdrop-blur-2xl border-b border-white/[0.05]"
                 style={{ animation: 'fade-in 0.4s ease-out both' }}>
                <div className="max-w-[1100px] mx-auto px-6 h-14 flex items-center justify-between">
                    <button onClick={() => navigate('/home')}
                            className="flex items-center gap-2 text-white/25 hover:text-white/70 font-dm text-sm transition-all duration-200 group">
                        <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
                        </svg>
                        Feed
                    </button>
                    <span className="font-anton text-lg tracking-widest text-white/10 uppercase select-none">Aalap</span>
                    <div className="w-16" />
                </div>
            </nav>

            {/* HERO */}
            <div className="relative overflow-hidden" style={{ minHeight: 340 }}>
                <FloatingNotes />
                <div className="relative z-10 flex flex-col items-center pt-14 pb-10">
                    <div style={{ animation: 'fade-up 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.1s both' }}>
                        <WaveformAvatar initial={initial} isReady={isReady} gravatarUrl={gravatarUrl} />
                    </div>
                    <div className="flex flex-wrap justify-center items-end gap-x-[0.25em] gap-y-0 mt-4 w-full px-6 overflow-y-hidden"
                         style={{ lineHeight: 1 }}>
                        {userName !== '?' && userName.split(' ').map((word, wi, words) => {
                            const charOffset = words.slice(0, wi).reduce((acc, w) => acc + w.length + 1, 0);
                            return (
                                <span key={wi} className="inline-flex items-end" style={{ whiteSpace: 'nowrap' }}>
                                    {word.split('').map((char, ci) => (
                                        <span key={ci} className="font-anton tracking-wide uppercase text-[#FCFCFC]"
                                              style={{
                                                  display: 'inline-block',
                                                  fontSize: 'clamp(2rem, 11vw, 4.5rem)',
                                                  animation: `char-drop 0.5s cubic-bezier(0.34,1.56,0.64,1) ${0.35 + (charOffset + ci) * 0.04}s both`,
                                                  textShadow: '0 2px 20px rgba(0,0,0,0.5)',
                                              }}>
                                            {char}
                                        </span>
                                    ))}
                                </span>
                            );
                        })}
                    </div>
                    <div className="mt-1 h-[2px] w-32"
                         style={{ background: 'linear-gradient(90deg, transparent, #FF4439, transparent)', animation: 'name-line 0.6s ease-out 0.8s both' }} />
                    <p className="font-dm text-sm text-white/20 mt-3 tracking-wide"
                       style={{ animation: 'fade-up 0.5s ease-out 0.85s both' }}>
                        {userEmail}
                    </p>
                </div>
            </div>

            {/* STATS BAR */}
            <div className="relative z-10 border-y border-white/[0.05]"
                 style={{ background: 'linear-gradient(90deg, rgba(71,91,90,0.05), rgba(255,68,57,0.03), rgba(71,91,90,0.05))' }}>
                <div className="max-w-[1100px] mx-auto px-6">
                    <div className="grid grid-cols-3 divide-x divide-white/[0.05]">
                        {[
                            { label: 'Threads',       value: countThreads, accent: '#FFD4CA', delay: '0.55s' },
                            { label: 'Total Stems',   value: countStems,   accent: '#FF4439', delay: '0.65s' },
                            { label: 'Collaborators', value: countCollabs, accent: '#8BAFAE', delay: '0.75s' },
                        ].map(stat => (
                            <div key={stat.label} className="group relative flex flex-col items-center py-8 cursor-default"
                                 style={{ animation: `stat-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) ${stat.delay} both` }}>
                                <p className="font-anton text-4xl sm:text-5xl md:text-6xl leading-none tabular-nums"
                                   style={{ color: stat.accent }}>
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
                    <div className="py-20 text-center text-white/20 italic font-dm">
                        This artist hasn't started any threads yet.
                    </div>
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

                {!isLoading && myStems.length > 0 && (
                    <div className="mt-16 animate-[fade-up_0.5s_ease-out_1s_both]">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="flex items-center gap-3 flex-1">
                                <div className="w-6 h-[1px]" style={{ background: 'linear-gradient(90deg, #2DD4BF, rgba(45,212,191,0))' }} />
                                <p className="font-dm text-[10px] uppercase tracking-[0.35em] text-white/25">Contributions</p>
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
        </div>
    );
}