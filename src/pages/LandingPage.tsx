import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ─── FLOATING PAPER COMPONENT (From ThreadDetail vibe) ────────────────────────
function FloatingPaper({ delay = '0s' }: { delay?: string }) {
  return (
      <div className="relative self-center z-20 transition-transform duration-700 hover:scale-105"
           style={{ animation: `paper-in 1s cubic-bezier(0.34,1.56,0.64,1) ${delay} both, paper-float 6s ease-in-out ${delay} infinite` }}>

        {/* Background stack sheet 1 */}
        <div className="absolute top-4 -right-4 w-[220px] h-[260px] rounded-sm opacity-40 rotate-6"
             style={{ background: '#2a2a2a', border: '1px solid #475B5A', zIndex: -2 }} />

        {/* Background stack sheet 2 */}
        <div className="absolute top-2 -left-3 w-[220px] h-[260px] rounded-sm opacity-60 -rotate-3"
             style={{ background: '#1a1a1a', border: '1px solid #FF4439', zIndex: -1 }} />

        {/* Drop shadow */}
        <div className="absolute -bottom-4 left-4 right-2 h-full rounded-sm opacity-60 blur-2xl"
             style={{ background: 'rgba(0,0,0,1)', zIndex: 0 }} />

        {/* Main Paper body */}
        <div className="relative z-10 w-[220px] px-6 pt-6 pb-8 rounded-sm"
             style={{
               background: 'linear-gradient(160deg, #f5f0e8 0%, #ede6d6 40%, #e8dfc8 100%)',
               boxShadow: '4px 8px 32px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(0,0,0,0.04)',
             }}>

          {/* Tape strip */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-14 h-7 rounded-sm opacity-80"
               style={{ background: 'linear-gradient(135deg, rgba(255,235,180,0.95), rgba(255,220,120,0.75))',
                 boxShadow: '0 2px 6px rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }} />

          {/* Ruled lines */}
          {[0,1,2,3,4,5,6].map(i => (
              <div key={i} className="absolute left-0 right-0 h-px"
                   style={{ top: 32 + i * 24, background: 'rgba(100,120,180,0.12)' }} />
          ))}

          {/* Red margin */}
          <div className="absolute top-0 bottom-0 left-10 w-px"
               style={{ background: 'rgba(220,60,60,0.3)' }} />

          {/* Pencil sketch */}
          <svg className="absolute top-3 right-3 opacity-20" width="34" height="24" viewBox="0 0 34 24">
            {[2,7,12,17,22].map(y => (
                <line key={y} x1="0" y1={y} x2="34" y2={y} stroke="#3a3020" strokeWidth="1"
                      style={{ strokeDasharray: 34, strokeDashoffset: 34, animation: `pencil-draw 0.8s ease-out ${1 + y*0.05}s both` }} />
            ))}
            <ellipse cx="10" cy="18" rx="3.5" ry="2.5" fill="#3a3020" opacity="0.8" style={{ animation: 'ink-fade-in 0.5s ease-out 1.6s both' }} />
            <line x1="13.5" y1="18" x2="13.5" y2="6" stroke="#3a3020" strokeWidth="1.2" style={{ strokeDasharray: 12, strokeDashoffset: 12, animation: 'pencil-draw 0.4s ease-out 1.8s both' }} />
          </svg>

          <p className="font-caveat text-[13px] text-[#8a7a5a] mb-3 tracking-wide" style={{ animation: 'ink-fade-in 0.5s ease-out 0.8s both' }}>
            midnight idea
          </p>

          <div className="mb-4" style={{ animation: 'ink-fade-in 0.5s ease-out 1s both' }}>
            <p className="font-caveat text-[14px] text-[#7a6a4a] leading-none mb-0.5">tempo</p>
            <p className="font-caveat leading-none" style={{ fontSize: 52, color: '#2a2010', fontWeight: 600, textShadow: '0.5px 0.5px 0 rgba(0,0,0,0.1)' }}>
              108 <span className="text-xl font-normal text-[#7a6a4a] ml-1">bpm</span>
            </p>
          </div>

          <svg width="100%" height="8" className="mb-4 -mt-2 opacity-40">
            <path d="M0 4 Q40 1 80 5 Q120 7 150 3" fill="none" stroke="#3a3020" strokeWidth="1.5" strokeLinecap="round"
                  style={{ strokeDasharray: 150, strokeDashoffset: 150, animation: 'pencil-draw 0.8s ease-out 1.2s both' }} />
          </svg>

          <div style={{ animation: 'ink-fade-in 0.5s ease-out 1.4s both' }}>
            <p className="font-caveat text-[14px] text-[#7a6a4a] leading-none mb-0.5">key</p>
            <p className="font-caveat leading-none" style={{ fontSize: 34, color: '#2a2010', fontWeight: 600, textShadow: '0.5px 0.5px 0 rgba(0,0,0,0.1)' }}>
              C Minor
            </p>
          </div>
        </div>
      </div>
  );
}

// ─── HERO THREAD SVG (From HomeFeed vibe) ─────────────────────────────────────
function HeroThread() {
  const THREAD_NODES = [
    { role: 'Composer',        color: '#FFD4CA', cx: '10%' },
    { role: 'Lyricist',        color: '#FF4439', cx: '30%' },
    { role: 'Singer',          color: '#B72F30', cx: '50%' },
    { role: 'Producer',        color: '#FCFCFC', cx: '70%' },
    { role: 'Instrumentalist', color: '#475B5A', cx: '90%' },
  ];

  return (
      <div className="relative w-full h-[120px] overflow-visible mt-12 mb-8 select-none">
        <svg viewBox="0 0 1000 120" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
          <defs>
            <filter id="neon-glow" x="-50%" y="-200%" width="200%" height="500%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur1" />
              <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur2" />
              <feMerge><feMergeNode in="blur2" /><feMergeNode in="blur1" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <linearGradient id="energy-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FF4439" stopOpacity="0" />
              <stop offset="30%" stopColor="#FF4439" stopOpacity="1" />
              <stop offset="70%" stopColor="#FFD4CA" stopOpacity="1" />
              <stop offset="100%" stopColor="#FFD4CA" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Faint background track */}
          <path d="M -50,60 C 100,60 150,20 250,60 S 400,100 500,60 S 650,20 750,60 S 900,100 1050,60"
                fill="none" stroke="rgba(252,252,252,0.05)" strokeWidth="1.5" />

          {/* Glowing drawn thread */}
          <path d="M -50,60 C 100,60 150,20 250,60 S 400,100 500,60 S 650,20 750,60 S 900,100 1050,60"
                fill="none" stroke="rgba(255,68,57,0.4)" strokeWidth="4" strokeLinecap="round"
                filter="url(#neon-glow)"
                style={{ strokeDasharray: 2000, strokeDashoffset: 0, animation: 'thread-draw-hero 3s cubic-bezier(0.4,0,0.2,1) forwards, thread-breathe 4s ease-in-out 3s infinite' }} />

          {/* Flowing energy particles */}
          <path d="M -50,60 C 100,60 150,20 250,60 S 400,100 500,60 S 650,20 750,60 S 900,100 1050,60"
                fill="none" stroke="url(#energy-grad)" strokeWidth="3" strokeDasharray="20 40 10 50" strokeLinecap="round"
                filter="url(#neon-glow)"
                style={{ animation: 'thread-flow 1.5s linear infinite' }} />

          {/* Nodes */}
          {THREAD_NODES.map((node, i) => (
              <g key={node.role}>
                <circle cx={node.cx} cy="60" r="16" fill="none" stroke={node.color} opacity="0"
                        style={{ animation: `energy-ripple 2.5s ease-out ${1 + i * 0.4}s infinite`, transformOrigin: `${node.cx} 60px`, transformBox: 'fill-box' }} />
                <circle cx={node.cx} cy="60" r="6" fill={node.color}
                        style={{ animation: `node-appear 0.6s ease-out ${0.5 + i * 0.3}s both, core-pulse 2.5s ease-in-out ${1 + i * 0.3}s infinite`, transformOrigin: `${node.cx} 60px`, transformBox: 'fill-box' }} />
              </g>
          ))}
        </svg>
        <div className="absolute inset-0 flex items-end pb-0 pointer-events-none">
          {THREAD_NODES.map((node, i) => (
              <div key={node.role} className="absolute flex flex-col items-center"
                   style={{ left: node.cx, transform: 'translateX(-50%)', bottom: -10, animation: `fade-up 0.5s ease-out ${0.8 + i * 0.3}s both` }}>
                        <span className="font-dm text-[10px] md:text-xs uppercase tracking-[0.2em] whitespace-nowrap drop-shadow-md" style={{ color: node.color }}>
                            {node.role}
                        </span>
              </div>
          ))}
        </div>
      </div>
  );
}

// ─── MAIN PAGE COMPONENT ──────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
      <div className="min-h-screen bg-[#060808] text-[#FCFCFC] overflow-x-hidden relative selection:bg-[#FF4439]/30">
        {/* Fonts & Keyframes */}
        <link href="https://fonts.googleapis.com/css2?family=Anton&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&family=Caveat:wght@400;600&display=swap" rel="stylesheet" />
        <style>{`
                .font-anton { font-family: 'Anton', sans-serif; }
                .font-dm { font-family: 'DM Sans', sans-serif; }
                .font-caveat { font-family: 'Caveat', cursive; }

                @keyframes fade-up { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                @keyframes glow-breathe { 0%, 100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 0.7; transform: scale(1.1); } }
                
                /* Paper animations */
                @keyframes paper-in { from { opacity: 0; transform: rotate(-12deg) translateY(40px) scale(0.85); } to { opacity: 1; transform: rotate(-8deg) translateY(0) scale(1); } }
                @keyframes paper-float { 0%, 100% { transform: rotate(-8deg) translateY(0); } 50% { transform: rotate(-6deg) translateY(-8px); } }
                @keyframes pencil-draw { from { stroke-dashoffset: 150; opacity: 0; } to { stroke-dashoffset: 0; opacity: 1; } }
                @keyframes ink-fade-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
                
                /* Thread animations */
                @keyframes thread-draw-hero { from { stroke-dashoffset: 2000; } to { stroke-dashoffset: 0; } }
                @keyframes thread-breathe { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
                @keyframes thread-flow { from { stroke-dashoffset: 200; } to { stroke-dashoffset: 0; } }
                @keyframes energy-ripple { 0% { transform: scale(0.5); opacity: 1; stroke-width: 3; } 100% { transform: scale(2.5); opacity: 0; stroke-width: 0; } }
                @keyframes core-pulse { 0%, 100% { transform: scale(1); opacity: 0.8; filter: brightness(1); } 50% { transform: scale(1.4); opacity: 1; filter: brightness(1.5); } }
                @keyframes node-appear { 0% { opacity: 0; transform: scale(0); } 70% { opacity: 1; transform: scale(1.3); } 100% { opacity: 1; transform: scale(1); } }
                
                @keyframes float-slow { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }
                @keyframes float-slower { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(10px); } }
            `}</style>

        {/* Ambient Background Glows */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] rounded-full"
               style={{ background: 'radial-gradient(circle, rgba(71,91,90,0.15) 0%, transparent 65%)', animation: 'glow-breathe 8s ease-in-out infinite' }} />
          <div className="absolute top-[20%] right-[-10%] w-[600px] h-[600px] rounded-full"
               style={{ background: 'radial-gradient(circle, rgba(255,68,57,0.1) 0%, transparent 65%)', animation: 'glow-breathe 6s ease-in-out 2s infinite' }} />
          <div className="absolute bottom-[-20%] left-[20%] w-[900px] h-[900px] rounded-full"
               style={{ background: 'radial-gradient(circle, rgba(255,212,202,0.05) 0%, transparent 70%)', animation: 'glow-breathe 10s ease-in-out 4s infinite' }} />
        </div>

        {/* Navbar */}
        <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-[#060808]/80 backdrop-blur-xl border-b border-white/[0.05] py-4' : 'bg-transparent py-6'}`}>
          <div className="max-w-[1200px] mx-auto px-6 flex items-center justify-between">
            <span className="font-anton text-2xl tracking-[0.15em] text-[#FCFCFC] uppercase">Aalap</span>
            <button onClick={() => navigate('/auth')}
                    className="font-dm text-[11px] font-semibold tracking-[0.2em] uppercase px-6 py-2.5 rounded-full border border-[#FFD4CA]/30 text-[#FFD4CA] hover:bg-[#FFD4CA]/10 hover:border-[#FFD4CA] transition-all">
              Enter Studio
            </button>
          </div>
        </nav>

        {/* ── HERO SECTION ── */}
        <main className="relative z-10 pt-32 pb-20 min-h-screen flex flex-col justify-center">
          <div className="max-w-[1200px] mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-8 items-center">

            {/* Left: Copy & CTA */}
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-3 mb-6" style={{ animation: 'fade-up 0.8s ease-out 0.1s both' }}>
                <span className="w-8 h-[2px]" style={{ background: 'linear-gradient(90deg, #FF4439, transparent)' }} />
                <span className="font-dm text-[11px] text-[#FFD4CA]/70 uppercase tracking-[0.3em]">Music collaboration, reimagined</span>
              </div>

              <h1 className="font-anton text-[4.5rem] md:text-[6.5rem] lg:text-[7.5rem] leading-[0.85] tracking-wide uppercase text-white mb-6"
                  style={{ animation: 'fade-up 0.8s cubic-bezier(0.16,1,0.3,1) 0.2s both' }}>
                Every song<br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF4439] to-[#FFD4CA]">starts</span><br/>
                with a seed.
              </h1>

              <p className="font-dm text-lg md:text-xl text-white/50 leading-relaxed max-w-md mb-10 font-light"
                 style={{ animation: 'fade-up 0.8s ease-out 0.4s both' }}>
                Bring your tune, your chords, your lyrics, or your voice. The rest of the network is here to fill in the blanks.
              </p>

              {/* CTA Button styled like ThreadDetail Drop Stem */}
              <div className="relative group/cta" style={{ animation: 'fade-up 0.8s ease-out 0.6s both' }}>
                <div className="absolute -inset-[1px] rounded-xl pointer-events-none"
                     style={{ background: 'linear-gradient(135deg, #FF4439, #7A1A1A)', opacity: 0.6, filter: 'blur(8px)', transition: 'opacity 0.3s' }} />
                <button onClick={() => navigate('/auth')}
                        className="relative z-10 flex items-center gap-4 px-10 py-5 rounded-xl overflow-hidden transition-all duration-300 active:scale-[0.97] bg-[#0a0808]">
                  <div className="absolute inset-0 -translate-x-full group-hover/cta:translate-x-0 transition-transform duration-[350ms] ease-out pointer-events-none"
                       style={{ background: 'linear-gradient(90deg, #B72F30, #FF4439)' }} />
                  <span className="relative z-10 font-anton text-lg tracking-[0.2em] uppercase text-white/80 group-hover/cta:text-white transition-colors duration-300">
                                    Start Creating
                                </span>
                  <svg className="relative z-10 w-5 h-5 text-white/50 group-hover/cta:text-white group-hover/cta:translate-x-1 transition-all duration-300"
                       fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Right: Floating Paper Art */}
            <div className="relative h-[400px] lg:h-[600px] flex items-center justify-center pointer-events-none lg:translate-x-12">

              {/* Background structural rings */}
              <div className="absolute inset-0 flex items-center justify-center opacity-20" style={{ animation: 'fade-in 2s ease-out both' }}>
                <div className="w-[300px] h-[300px] rounded-full border border-white/20 animate-[spin_30s_linear_infinite]" />
                <div className="absolute w-[450px] h-[450px] rounded-full border border-dashed border-[#FFD4CA]/20 animate-[spin_40s_linear_infinite_reverse]" />
              </div>

              {/* The Paper Component (z-20) */}
              <FloatingPaper delay="0.4s" />

              {/* ── Floating ambient role badges ── */}

              {/* 1. Lyricist (Top Left) - Pulled backwards (z-10) */}
              <div className="absolute top-[18%] left-[10%] z-10 px-4 py-2 rounded-md bg-[#0a0505]/90 border border-[#FF4439]/40 backdrop-blur-md shadow-2xl"
                   style={{ animation: 'float-slow 6s ease-in-out infinite', animationDelay: '0s' }}>
                <span className="font-anton text-[11px] tracking-[0.15em] uppercase text-[#FF4439]">Lyricist Found</span>
              </div>

              {/* 2. Composer (Top Right) - Floating slightly in front (z-30) */}
              <div className="absolute top-[30%] right-[2%] z-30 px-4 py-2 rounded-md bg-[#0a0805]/90 border border-[#FFD4CA]/40 backdrop-blur-md shadow-2xl"
                   style={{ animation: 'float-slower 7s ease-in-out infinite', animationDelay: '1.5s' }}>
                <span className="font-anton text-[11px] tracking-[0.15em] uppercase text-[#FFD4CA]">Composer Joined</span>
              </div>

              {/* 3. Singer (Bottom Left) - Floating in front (z-30) */}
              <div className="absolute bottom-[28%] left-[4%] z-30 px-4 py-2 rounded-md bg-[#0a0505]/90 border border-[#B72F30]/40 backdrop-blur-md shadow-2xl"
                   style={{ animation: 'float-slow 5.5s ease-in-out infinite', animationDelay: '3s' }}>
                <span className="font-anton text-[11px] tracking-[0.15em] uppercase text-[#B72F30]">Singer Recorded</span>
              </div>

              {/* 4. Producer (Bottom Right) - Pulled backwards (z-10) and shifted safely to the edge */}
              <div className="absolute bottom-[10%] right-[8%] z-10 px-4 py-2 rounded-md bg-[#050606]/90 border border-[#FCFCFC]/20 backdrop-blur-md shadow-2xl"
                   style={{ animation: 'float-slower 8s ease-in-out infinite', animationDelay: '2s' }}>
                <span className="font-anton text-[11px] tracking-[0.15em] uppercase text-[#FCFCFC]/80">Producer Added Stems</span>
              </div>

            </div>
          </div>

          {/* The glowing threaded network line crossing the bottom of the hero */}
          <div className="w-full max-w-[1400px] mx-auto mt-auto pt-20" style={{ animation: 'fade-in 1s ease-out 1s both' }}>
            <div className="px-6 md:text-center mb-[-2rem] relative z-20">
              <p className="font-dm text-[10px] text-white/30 uppercase tracking-[0.4em]">One thread. Infinite possibilities.</p>
            </div>
            <HeroThread />
          </div>
        </main>

        {/* ── FOOTER / BOTTOM TEASER ── */}
        <div className="relative z-10 border-t border-white/[0.05] bg-[#040505]">
          <div className="max-w-[1200px] mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="font-dm text-sm text-white/30">
              © {new Date().getFullYear()} Aalap Studio. Build music together.
            </p>
            <div className="flex gap-6">
              <span className="font-dm text-[10px] tracking-widest uppercase text-white/20 hover:text-white/50 cursor-pointer transition-colors">Privacy</span>
              <span className="font-dm text-[10px] tracking-widest uppercase text-white/20 hover:text-white/50 cursor-pointer transition-colors">Terms</span>
            </div>
          </div>
        </div>
      </div>
  );
}