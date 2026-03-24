import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ThreadService } from '../services/ThreadService';

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

interface Toast {
  message: string;
  type: 'success' | 'error';
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

// Redesigned with the new color palette
const ROLE_COLORS: Record<string, { text: string; bg: string; dot: string }> = {
  composer:        { text: 'text-[#1a1a1a]',  bg: 'bg-[#FFD4CA]',     dot: '#FFD4CA' }, // Peach
  lyricist:        { text: 'text-[#FCFCFC]',  bg: 'bg-[#FF4439]',     dot: '#FF4439' }, // Red
  singer:          { text: 'text-[#FCFCFC]',  bg: 'bg-[#B72F30]',     dot: '#B72F30' }, // Crimson
  producer:        { text: 'text-[#1a1a1a]',  bg: 'bg-[#FCFCFC]',     dot: '#FCFCFC' }, // White
  instrumentalist: { text: 'text-[#FCFCFC]',  bg: 'bg-[#475B5A]',     dot: '#475B5A' }, // Teal
};

const DEFAULT_RC = { text: 'text-[#FCFCFC]/40', bg: 'bg-[#FCFCFC]/5', dot: '#FCFCFC40' };

function getRoleColor(role: string) {
  const key = role.split(' - ')[0].toLowerCase().trim();
  return ROLE_COLORS[key] ?? DEFAULT_RC;
}

function getInitial(name?: string) {
  return (name && name !== '?') ? name.charAt(0).toUpperCase() : '?';
}

function timeAgo(dateStr: string): string {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);

  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 7)  return `${days}d ago`;

  if (days > 180) {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const ALL_ROLES = ['Composer', 'Lyricist', 'Singer', 'Producer', 'Instrumentalist'];

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function HomeFeed() {
  const navigate = useNavigate();

  const [threads, setThreads]       = useState<ThreadSummary[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [search, setSearch]         = useState('');
  const [filterRole, setFilterRole] = useState<string | null>(null);
  const [userName, setUserName]     = useState<string>('?');

  const [toast, setToast]           = useState<Toast | null>(null);
  const toastTimerRef               = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [modalOpen, setModalOpen]           = useState(false);
  const [newTitle, setNewTitle]             = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isCreating, setIsCreating]         = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserName(payload.name || payload.username || '?');
      } catch (e) {
        console.warn("Failed to parse token payload for user info");
      }
    }
  }, []);

  const showToast = useCallback((message: string, type: Toast['type']) => {
    setToast({ message, type });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const fetchThreads = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/auth'); return; }
    try {
      const res = await axios.get('https://aalap-backend-1.onrender.com/api/threads', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setThreads(res.data);
    } catch {
      showToast('Failed to load feed. Check your connection.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [navigate, showToast]);

  useEffect(() => { fetchThreads(); }, [fetchThreads]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setIsCreating(true);
    try {
      const newThread = await ThreadService.createThread(newTitle, newDescription);
      setNewTitle(''); setNewDescription(''); setModalOpen(false);
      navigate(`/threads/${newThread.id}`);
    } catch {
      showToast('Failed to create thread. Try again.', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const filtered = useMemo(() => threads.filter(t => {
    const matchesSearch = !search.trim() ||
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.description?.toLowerCase().includes(search.toLowerCase()) ||
        t.createdBy.name.toLowerCase().includes(search.toLowerCase());
    const matchesRole = !filterRole ||
        Object.keys(t.rolesWithContributors).some(r => r.toLowerCase().includes(filterRole.toLowerCase()));
    return matchesSearch && matchesRole;
  }), [threads, search, filterRole]);

  return (
      <div className="min-h-screen text-[#FCFCFC] relative">

        {/* VIDEO BACKGROUND */}
        <video
            autoPlay muted loop playsInline
            className="fixed inset-0 w-full h-full object-cover z-0 brightness-[0.3]"
            src="/homefeedbg.mp4"
        />
        {/* Dark overlay */}
        <div className="fixed inset-0 bg-[#1a1a1a]/60 z-0" />

        {/* All content sits above the video */}
        <div className="relative z-10">

          <link href="https://fonts.googleapis.com/css2?family=Anton&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap" rel="stylesheet" />

          <style>{`
                .font-anton { font-family: 'Anton', sans-serif; }
                .font-dm    { font-family: 'DM Sans', sans-serif; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                
                @keyframes toast-up       { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
                @keyframes modal-in       { from { opacity:0; transform:scale(0.97) translateY(6px); } to { opacity:1; transform:scale(1) translateY(0); } }
                @keyframes card-in        { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
                @keyframes label-rise     { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
                
                @keyframes thread-draw    { from { stroke-dashoffset: 1400; } to { stroke-dashoffset: 0; } }
                @keyframes thread-breathe { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.8; } }
                
                @keyframes thread-flow-hero { 
                    from { stroke-dashoffset: 300; } 
                    to   { stroke-dashoffset: 0; } 
                }
                
                @keyframes core-pulse {
                    0%, 100% { transform: scale(1); opacity: 0.8; filter: brightness(1); }
                    50%      { transform: scale(1.35); opacity: 1; filter: brightness(1.5); }
                }
                
                @keyframes energy-ripple {
                    0%   { transform: scale(0.8); opacity: 1; stroke-width: 2; }
                    100% { transform: scale(2.5); opacity: 0; stroke-width: 0; }
                }
                
                @keyframes node-appear { 
                    0%   { opacity:0; transform: scale(0); } 
                    70%  { opacity:1; transform: scale(1.4); } 
                    100% { opacity:1; transform: scale(1); } 
                }
            `}</style>

          {/* TOAST */}
          {toast && (
              <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-2xl
                    text-sm font-dm backdrop-blur-md border shadow-2xl whitespace-nowrap animate-[toast-up_0.25s_ease-out]
                    ${toast.type === 'success' ? 'bg-[#344443]/90 border-[#475B5A] text-[#FFD4CA]' : 'bg-[#B72F30]/90 border-[#FF4439]/50 text-[#FCFCFC]'}`}>
                {toast.message}
              </div>
          )}

          {/* MODAL */}
          {modalOpen && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setModalOpen(false)} />

                <div className="relative w-full max-w-[480px] animate-[modal-in_0.25s_ease-out]">

                  {/* Outer glow ring */}
                  <div className="absolute -inset-[1px] rounded-3xl z-0"
                       style={{ background: 'linear-gradient(135deg, rgba(255,68,57,0.4) 0%, rgba(71,91,90,0.2) 50%, rgba(255,212,202,0.2) 100%)' }} />

                  {/* Modal body */}
                  <div className="relative z-10 bg-[#080C0B]/95 backdrop-blur-2xl rounded-3xl overflow-hidden">

                    {/* Top accent bar */}
                    <div className="h-[3px] w-full" style={{ background: 'linear-gradient(90deg, #FF4439, #FFD4CA, #475B5A)' }} />

                    {/* Subtle inner glow top-left */}
                    <div className="absolute top-0 left-0 w-64 h-64 rounded-full pointer-events-none"
                         style={{ background: 'radial-gradient(circle, rgba(255,68,57,0.06) 0%, transparent 70%)', transform: 'translate(-30%, -30%)' }} />

                    <div className="relative z-10 p-8">

                      {/* Header */}
                      <div className="flex items-start justify-between mb-8">
                        <div>
                          <p className="font-dm text-[10px] text-[#FF4439]/70 uppercase tracking-[0.3em] mb-2">New creation</p>
                          <h2 className="font-anton text-4xl text-[#FCFCFC] tracking-wide uppercase leading-none">Start a<br/>Thread</h2>
                          <p className="font-dm text-sm text-[#FFD4CA]/40 mt-3 italic">Plant the seed. Let others grow it.</p>
                        </div>
                        <button onClick={() => setModalOpen(false)}
                                className="w-10 h-10 rounded-full border border-[#FCFCFC]/10 bg-[#FCFCFC]/5
                                         hover:bg-[#FF4439]/10 hover:border-[#FF4439]/40
                                         flex items-center justify-center text-[#FCFCFC]/30 hover:text-[#FF4439]
                                         transition-all duration-200 shrink-0">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                          </svg>
                        </button>
                      </div>

                      {/* Form */}
                      <form onSubmit={handleCreate} className="flex flex-col gap-5">

                        {/* Title field */}
                        <div className="flex flex-col gap-2">
                          <label className="font-dm text-[10px] text-[#FCFCFC]/30 uppercase tracking-[0.25em] flex items-center gap-2">
                            <span className="w-3 h-[1px] bg-[#FF4439]/60 inline-block" />
                            Thread title
                          </label>
                          <div className="relative group">
                            <input
                                type="text" required autoFocus
                                value={newTitle} onChange={e => setNewTitle(e.target.value)}
                                placeholder="e.g. Midnight Melody"
                                className="w-full bg-[#FCFCFC]/[0.03] border border-[#FCFCFC]/10
                                       text-[#FCFCFC] placeholder:text-[#FCFCFC]/15
                                       px-5 py-4 rounded-2xl font-dm text-base
                                       focus:outline-none focus:border-[#FF4439]/50 focus:bg-[#FF4439]/[0.03]
                                       transition-all duration-200"
                            />
                            {/* Focus line bottom */}
                            <div className="absolute bottom-0 left-4 right-4 h-[1px] bg-gradient-to-r from-[#FF4439]/0 via-[#FF4439]/60 to-[#FF4439]/0
                                          scale-x-0 group-focus-within:scale-x-100 transition-transform duration-300 rounded-full" />
                          </div>
                        </div>

                        {/* Description field */}
                        <div className="flex flex-col gap-2">
                          <label className="font-dm text-[10px] text-[#FCFCFC]/30 uppercase tracking-[0.25em] flex items-center gap-2">
                            <span className="w-3 h-[1px] bg-[#475B5A]/80 inline-block" />
                            Description
                            <span className="normal-case text-[#FCFCFC]/15 tracking-normal">— optional</span>
                          </label>
                          <div className="relative group">
                          <textarea
                              rows={3}
                              value={newDescription} onChange={e => setNewDescription(e.target.value)}
                              placeholder="What's the vibe? Genre, mood, key, BPM..."
                              className="w-full bg-[#FCFCFC]/[0.03] border border-[#FCFCFC]/10
                                       text-[#FCFCFC] placeholder:text-[#FCFCFC]/15
                                       px-5 py-4 rounded-2xl font-dm text-sm
                                       focus:outline-none focus:border-[#475B5A]/60 focus:bg-[#475B5A]/[0.03]
                                       transition-all duration-200 resize-none leading-relaxed"
                          />
                            <div className="absolute bottom-0 left-4 right-4 h-[1px] bg-gradient-to-r from-[#475B5A]/0 via-[#475B5A]/60 to-[#475B5A]/0
                                          scale-x-0 group-focus-within:scale-x-100 transition-transform duration-300 rounded-full" />
                          </div>
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-gradient-to-r from-transparent via-[#475B5A]/30 to-transparent" />

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isCreating || !newTitle.trim()}
                            className={`group/btn relative w-full py-3.5 rounded-xl font-anton tracking-[0.2em] text-sm uppercase
                                    overflow-hidden transition-all duration-300 active:scale-[0.98]
                                    ${(isCreating || !newTitle.trim())
                                ? 'bg-[#FCFCFC]/5 text-[#FCFCFC]/20 cursor-not-allowed border border-[#FCFCFC]/5'
                                : 'text-[#FCFCFC]/70 hover:text-[#FCFCFC] border border-[#B72F30]/50 hover:border-[#B72F30]'}`}
                        >
                          {(!isCreating && newTitle.trim()) && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-4 h-4 rounded-full scale-0 group-hover/btn:scale-[12] transition-transform duration-500 ease-out"
                                     style={{ background: 'radial-gradient(circle, #C73330 0%, #7A1A1A 100%)' }} />
                              </div>
                          )}
                          <span className="relative z-10 flex items-center justify-center gap-2.5">
                          {isCreating ? (
                              <>
                                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                                </svg>
                                Creating...
                              </>
                          ) : (
                              <>
                                <svg className="w-3.5 h-3.5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/>
                                </svg>
                                Open Thread
                              </>
                          )}
                        </span>
                        </button>

                      </form>
                    </div>
                  </div>
                </div>
              </div>
          )}

          {/* NAVBAR */}
          <nav className="sticky top-0 z-50 bg-[#1a1a1a]/60 backdrop-blur-md border-b border-[#475B5A]/30">
            <div className="max-w-[1100px] mx-auto px-6 h-14 flex items-center justify-between">
              <button onClick={() => navigate('/home')} className="font-anton text-xl tracking-widest text-[#FCFCFC] uppercase hover:text-[#FF4439] transition-colors">Aalap</button>
              <div className="flex items-center gap-3">
                <button onClick={() => navigate('/profile')} className="w-8 h-8 rounded-full bg-[#344443] border border-[#475B5A] flex items-center justify-center font-anton text-xs text-[#FCFCFC]/50 hover:text-[#FCFCFC] hover:border-[#FFD4CA] transition-colors">
                  {getInitial(userName)}
                </button>
                <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FFD4CA] hover:bg-[#FCFCFC] text-[#1a1a1a] font-anton text-xs tracking-widest uppercase transition-all active:scale-95 shadow-[0_0_16px_rgba(255,212,202,0.1)]">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
                  Start a Thread
                </button>
              </div>
            </div>
          </nav>

          <AalapHero userName={userName} />

          {/* PAGE BODY */}
          <div className="max-w-[1100px] mx-auto px-6 py-8">

            {/* Search */}
            <div className="relative mb-5">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#FCFCFC]/30 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search threads, creators..."
                     className="w-full bg-[#344443]/25 backdrop-blur-sm border border-[#475B5A]/70 text-[#FCFCFC] placeholder:text-[#FCFCFC]/30 pl-10 pr-4 py-3 rounded-xl font-dm text-sm focus:outline-none focus:border-[#FFD4CA]/60 transition-colors" />
              {search && (
                  <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#FCFCFC]/30 hover:text-[#FCFCFC]/70 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
              )}
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-2 mb-8 overflow-x-auto no-scrollbar pb-1">
              <button onClick={() => setFilterRole(null)}
                      className={`shrink-0 px-4 py-1.5 rounded-full border font-dm text-xs tracking-wide transition-all
                            ${filterRole === null ? 'bg-[#FCFCFC] border-[#FCFCFC] text-[#1a1a1a]' : 'bg-transparent border-[#475B5A] text-[#FCFCFC]/50 hover:text-[#FCFCFC] hover:border-[#FFD4CA]'}`}>
                All
              </button>
              {ALL_ROLES.map(role => {
                const rc  = getRoleColor(role);
                const sel = filterRole === role;
                return (
                    <button key={role} onClick={() => setFilterRole(sel ? null : role)}
                            className={`shrink-0 px-4 py-1.5 rounded-full border font-dm text-xs tracking-wide transition-all
                                    ${sel ? `${rc.bg} ${rc.text} border-transparent` : 'bg-transparent border-[#475B5A] text-[#FCFCFC]/50 hover:text-[#FCFCFC] hover:border-[#FFD4CA]'}`}
                            style={sel ? { borderColor: rc.dot + '60' } : {}}>
                      {role}
                    </button>
                );
              })}
            </div>

            {/* Count + clear */}
            <div className="flex items-center justify-between mb-5">
              <p className="font-dm text-xs text-[#FCFCFC]/30 uppercase tracking-[0.2em]">
                {isLoading ? 'Loading...' : `${filtered.length} ${filtered.length === 1 ? 'thread' : 'threads'}`}
              </p>
              {filterRole && (
                  <button onClick={() => setFilterRole(null)} className="font-dm text-xs text-[#FFD4CA]/60 hover:text-[#FFD4CA] transition-colors">
                    Clear filter ✕
                  </button>
              )}
            </div>

            {/* Feed */}
            {isLoading ? (
                <div className="flex flex-col gap-3">
                  {[1, 2, 3].map(i => (
                      <div key={i} className="bg-[#344443] border border-[#475B5A] rounded-2xl p-6 animate-pulse" style={{ opacity: 1 - i * 0.15 }}>
                        <div className="h-5 bg-[#475B5A] rounded-lg w-2/3 mb-3" />
                        <div className="h-3 bg-[#475B5A] rounded w-full mb-2" />
                        <div className="h-3 bg-[#475B5A] rounded w-4/5 mb-5" />
                        <div className="flex gap-2">
                          <div className="h-6 w-20 bg-[#475B5A] rounded-full" />
                          <div className="h-6 w-16 bg-[#475B5A] rounded-full" />
                        </div>
                      </div>
                  ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="py-24 text-center">
                  <p className="font-dm text-[#FCFCFC]/30 text-base">
                    {search || filterRole ? 'No threads match your search.' : 'No threads yet. Be the first.'}
                  </p>
                  {!search && !filterRole && (
                      <button onClick={() => setModalOpen(true)} className="mt-5 font-anton text-sm tracking-widest uppercase text-[#FF4439] border border-[#FF4439]/30 px-6 py-3 rounded-xl hover:bg-[#FF4439]/10 transition-colors">
                        Start the first thread
                      </button>
                  )}
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {filtered.map((thread, i) => (
                      <ThreadCard key={thread.id} thread={thread} index={i}
                                  onClick={() => navigate(`/threads/${thread.id}`)}
                                  onCreatorClick={() => navigate(`/users/${thread.createdBy.id}`)} />
                  ))}
                </div>
            )}
          </div>
        </div> {/* end z-10 content wrapper */}
      </div>
  );
}

// ─── AALAP HERO ───────────────────────────────────────────────────────────────

const THREAD_NODES = [
  { role: 'Composer',        color: '#FFD4CA', cx: '14%', label: 'Composer'        },
  { role: 'Lyricist',        color: '#FF4439', cx: '32%', label: 'Lyricist'        },
  { role: 'Singer',          color: '#B72F30', cx: '51%', label: 'Singer'          },
  { role: 'Producer',        color: '#FCFCFC', cx: '70%', label: 'Producer'        },
  { role: 'Instrumentalist', color: '#475B5A', cx: '88%', label: 'Instrumentalist' },
];

function AalapHero({ userName }: { userName: string }) {
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem('aalapHeroAnimated')) {
      setIsFirstVisit(true);
      sessionStorage.setItem('aalapHeroAnimated', 'true');
    }
  }, []);

  return (
      <div className="max-w-[1100px] mx-auto px-6 pt-10 pb-4 select-none">
        <div className="mb-6">
          <p className="font-dm text-[11px] text-[#FFD4CA]/60 uppercase tracking-[0.3em] mb-2 animate-[label-rise_0.4s_ease-out_both]" style={{ animationDelay: '0s' }}>
            ACCESS GRANTED
          </p>
          <h1 className="font-anton text-[2.2rem] leading-none tracking-wide text-[#FCFCFC] uppercase">
            <span className="animate-[toast-up_0.5s_ease-out_0.2s_both] block">HELLO, {userName}</span>
            <span className="text-[#475B5A] animate-[toast-up_0.5s_ease-out_0.6s_both] block mt-1">
              THE FLOOR IS YOURS.
            </span>
          </h1>
        </div>

        <div className="relative w-full h-[88px] overflow-visible">
          <svg viewBox="0 0 800 88" preserveAspectRatio="none" className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="neon-glow" x="-50%" y="-200%" width="200%" height="500%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur1" />
                <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur2" />
                <feMerge>
                  <feMergeNode in="blur2" />
                  <feMergeNode in="blur1" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <linearGradient id="energy-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#FF4439" stopOpacity="0" />
                <stop offset="20%" stopColor="#FF4439" stopOpacity="1" />
                <stop offset="80%" stopColor="#FFD4CA" stopOpacity="1" />
                <stop offset="100%" stopColor="#FFD4CA" stopOpacity="0" />
              </linearGradient>

              {THREAD_NODES.map(n => (
                  <filter key={n.role} id={`glow-${n.role}`} x="-100%" y="-100%" width="300%" height="300%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
              ))}
            </defs>

            <path d="M -10,44 C 80,44 100,24 160,44 S 260,64 320,44 S 420,24 480,44 S 580,64 640,44 S 740,24 810,44"
                  fill="none" stroke="rgba(252,252,252,0.05)" strokeWidth="1" />

            <path d="M -10,44 C 80,44 100,24 160,44 S 260,64 320,44 S 420,24 480,44 S 580,64 640,44 S 740,24 810,44"
                  fill="none" stroke="rgba(255,68,57,0.3)" strokeWidth="3" strokeDasharray="1400" strokeDashoffset="1400" strokeLinecap="round"
                  filter="url(#neon-glow)"
                  style={isFirstVisit
                      ? { animation: 'thread-draw 2.5s cubic-bezier(0.4,0,0.2,1) 0.3s forwards, thread-breathe 4s ease-in-out 3s infinite' }
                      : { strokeDashoffset: 0, animation: 'thread-breathe 4s ease-in-out infinite' }} />

            <path d="M -10,44 C 80,44 100,24 160,44 S 260,64 320,44 S 420,24 480,44 S 580,64 640,44 S 740,24 810,44"
                  fill="none" stroke="url(#energy-grad)" strokeWidth="2.5" strokeDasharray="15 35 5 45" strokeLinecap="round"
                  filter="url(#neon-glow)"
                  style={isFirstVisit
                      ? { opacity: 0, animation: 'toast-up 1s ease-out 2.5s forwards, thread-flow-hero 1s linear infinite' }
                      : { opacity: 1, animation: 'thread-flow-hero 1s linear infinite' }} />

            {THREAD_NODES.map((node, i) => (
                <g key={node.role}>
                  <circle cx={node.cx} cy="44" r="12" fill="none" stroke={node.color} opacity="0"
                          style={isFirstVisit
                              ? { animation: `energy-ripple 2.5s ease-out ${1.5 + i * 0.45}s infinite`, transformOrigin: `${node.cx} 44px`, transformBox: 'fill-box' }
                              : { animation: `energy-ripple 2.5s ease-out ${i * 0.45}s infinite`, transformOrigin: `${node.cx} 44px`, transformBox: 'fill-box' }} />

                  <circle cx={node.cx} cy="44" r="5" fill={node.color} opacity={isFirstVisit ? 0 : 1} filter={`url(#glow-${node.role})`}
                          style={isFirstVisit
                              ? { animation: `node-appear 0.5s ease-out ${0.8 + i * 0.45}s forwards, core-pulse 2.5s ease-in-out ${1.5 + i * 0.45}s infinite`, transformOrigin: `${node.cx} 44px`, transformBox: 'fill-box' }
                              : { animation: `core-pulse 2.5s ease-in-out ${i * 0.45}s infinite`, transformOrigin: `${node.cx} 44px`, transformBox: 'fill-box' }} />
                </g>
            ))}
          </svg>

          <div className="absolute inset-0 flex items-end pb-0 pointer-events-none">
            {THREAD_NODES.map((node, i) => (
                <div key={node.role} className="absolute flex flex-col items-center"
                     style={isFirstVisit
                         ? { left: node.cx, transform: 'translateX(-50%)', bottom: 0, opacity: 0, animation: `label-rise 0.4s ease-out ${1.1 + i * 0.45}s forwards` }
                         : { left: node.cx, transform: 'translateX(-50%)', bottom: 0, opacity: 1 }}>
                            <span className="font-dm text-[9px] uppercase tracking-[0.15em] whitespace-nowrap drop-shadow-md" style={{ color: node.color }}>
                                {node.label}
                            </span>
                </div>
            ))}
          </div>
        </div>

        <div className="mt-8 h-px bg-gradient-to-r from-transparent via-[#475B5A]/50 to-transparent" />
      </div>
  );
}

// ─── THREAD CARD ──────────────────────────────────────────────────────────────

interface ThreadCardProps {
  thread: ThreadSummary;
  index: number;
  onClick: () => void;
  onCreatorClick: (e: React.MouseEvent) => void;
}

function ThreadCard({ thread, index, onClick, onCreatorClick }: ThreadCardProps) {
  const contributorNodes = Object.entries(thread.rolesWithContributors).flatMap(
      ([role, names]) => names.map(name => ({ role, name }))
  );
  const hasContributors = contributorNodes.length > 0;

  return (
      <div
          className="group relative bg-[#344443]/25 backdrop-blur-sm border border-[#475B5A]/70 rounded-2xl p-6
                cursor-pointer transition-all duration-300 ease-out
                hover:border-[#FF4439]/50 hover:bg-[#344443]/40 hover:shadow-[0_8px_30px_rgba(255,68,57,0.06)]
                hover:-translate-y-0.5 overflow-hidden animate-[card-in_0.4s_ease-out_both]"
          style={{ animationDelay: `${index * 50}ms` }}
          onClick={onClick}
      >
        <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#FF4439] scale-y-0 opacity-0 group-hover:scale-y-100 group-hover:opacity-100 transition-all duration-300 origin-bottom" />

        <div className="flex flex-col gap-4">

          <div className="flex items-start justify-between gap-4">
            <h2 className="font-anton text-2xl tracking-wide text-[#FCFCFC]/90 uppercase leading-none group-hover:text-[#FCFCFC] transition-colors">
              {thread.title}
            </h2>
            <span className="shrink-0 font-dm text-[10px] text-[#FFD4CA]/50 uppercase tracking-widest mt-1">
                        {timeAgo(thread.createdAt)}
                    </span>
          </div>

          {thread.description && (
              <p className="font-dm text-sm text-[#FCFCFC]/60 leading-relaxed line-clamp-2 -mt-1">
                {thread.description}
              </p>
          )}

          {hasContributors ? (
              <div className="relative pt-1 pb-1">
                <p className="font-dm text-[9px] text-[#FFD4CA]/50 uppercase tracking-[0.2em] mb-3">
                  Woven by
                </p>

                <div className="relative flex items-start gap-0 overflow-x-auto no-scrollbar">
                  {contributorNodes.map((contributor, i) => {
                    const rc = getRoleColor(contributor.role);
                    const isLast = i === contributorNodes.length - 1;
                    return (
                        <div key={`${contributor.role}-${contributor.name}-${i}`} className="flex items-start shrink-0">
                          <div className="flex flex-col items-center gap-1.5 w-[72px]">
                            <div
                                className="w-8 h-8 rounded-full flex items-center justify-center font-anton text-[13px] transition-transform group-hover:scale-105"
                                style={{
                                  backgroundColor: rc.dot + '18',
                                  border: `1.5px solid ${rc.dot}55`,
                                  color: rc.dot,
                                  boxShadow: `0 0 10px ${rc.dot}22`,
                                }}
                            >
                              {getInitial(contributor.name)}
                            </div>
                            <span
                                className="font-dm text-[10px] text-[#FCFCFC]/70 text-center leading-tight max-w-[68px] truncate"
                                title={contributor.name}
                            >
                                                {contributor.name}
                                            </span>
                            <span
                                className={`font-dm text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded ${rc.bg} ${rc.text} whitespace-nowrap`}
                            >
                                                {contributor.role.split(' - ')[0]}
                                            </span>
                          </div>

                          {!isLast && (
                              <div className="flex items-center self-start mt-[15px] mx-0.5">
                                <div className="flex items-center gap-[3px]">
                                  <span className="block w-[6px] h-[1.5px] rounded-full" style={{ backgroundColor: rc.dot + '50' }} />
                                  <span className="block w-[3px] h-[1.5px] rounded-full" style={{ backgroundColor: rc.dot + '30' }} />
                                  <span className="block w-[6px] h-[1.5px] rounded-full"
                                        style={{ backgroundColor: getRoleColor(contributorNodes[i + 1]?.role ?? '').dot + '50' }} />
                                </div>
                              </div>
                          )}
                        </div>
                    );
                  })}
                </div>
              </div>
          ) : (
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#475B5A]" />
                <span className="font-dm text-[10px] text-[#FCFCFC]/40 uppercase tracking-wider">
                            Seed planted — awaiting first voice
                        </span>
              </div>
          )}

          <div className="flex items-center justify-between mt-1 pt-4 border-t border-[#475B5A]/50">
            <button
                onClick={e => { e.stopPropagation(); onCreatorClick(e); }}
                className="flex items-center gap-2.5 group/creator transition-transform active:scale-95"
            >
              <div className="w-7 h-7 rounded-full bg-[#1a1a1a]/50 border border-[#475B5A]
                            flex items-center justify-center font-anton text-[11px] text-[#FCFCFC]/60
                            group-hover/creator:border-[#FF4439]/60 group-hover/creator:text-[#FF4439]
                            group-hover/creator:bg-[#FF4439]/10 transition-all shadow-inner">
                {getInitial(thread.createdBy.name)}
              </div>
              <div className="flex flex-col items-start">
                <span className="font-dm text-[10px] text-[#FFD4CA]/50 uppercase tracking-widest leading-none mb-1">Started by</span>
                <span className="font-dm text-xs text-[#FCFCFC]/80 group-hover/creator:text-[#FF4439] transition-colors leading-none">
                                {thread.createdBy.name}
                            </span>
              </div>
            </button>

            <div className="flex items-center gap-2 bg-[#1a1a1a]/30 border border-[#475B5A]/50 pl-3 pr-1.5 py-1.5 rounded-lg group-hover:border-[#475B5A] transition-colors">
                        <span className="font-dm text-[11px] text-[#FCFCFC]/50 uppercase tracking-widest">
                            Stems
                        </span>
              <span className="bg-[#475B5A]/50 text-[#FCFCFC] font-dm text-xs font-medium px-2 py-0.5 rounded flex items-center justify-center min-w-[24px]">
                            {thread.contributionCount}
                        </span>
            </div>
          </div>
        </div>
      </div>
  );
}