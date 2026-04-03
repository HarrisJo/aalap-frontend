import { useState, useEffect, useRef } from 'react';
import { AuthService } from '../services/AuthService';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';

// ─── HOOK: responsive breakpoint ─────────────────────────────────────────────

function useIsMobile(breakpoint = 768) {
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);
    useEffect(() => {
        const handler = () => setIsMobile(window.innerWidth < breakpoint);
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, [breakpoint]);
    return isMobile;
}

// ─── BACKGROUND CANVAS ────────────────────────────────────────────────────────

function StudioCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef    = useRef<number>(0);
    const mouseRef  = useRef({ x: 0.5, y: 0.5 });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d')!;

        const resize = () => {
            canvas.width  = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        const onMouse = (e: MouseEvent) => {
            mouseRef.current = {
                x: e.clientX / window.innerWidth,
                y: e.clientY / window.innerHeight,
            };
        };
        window.addEventListener('mousemove', onMouse);

        const PARTICLE_COUNT = 55;
        interface Particle { x: number; y: number; r: number; vx: number; vy: number; opacity: number; pulse: number; }
        const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => ({
            x:       Math.random() * window.innerWidth,
            y:       Math.random() * window.innerHeight,
            r:       0.6 + Math.random() * 1.8,
            vx:      (Math.random() - 0.5) * 0.18,
            vy:     -0.08 - Math.random() * 0.18,
            opacity: 0.15 + Math.random() * 0.35,
            pulse:   Math.random() * Math.PI * 2,
        }));

        const WAVES = [
            { amp: 34,  freq: 0.0018, speed: 0.38, color: 'rgba(255, 68, 57,',   width: 1.0, offset: 0   },
            { amp: 22,  freq: 0.0025, speed: 0.55, color: 'rgba(255,212,202,',   width: 0.6, offset: 0.5 },
            { amp: 44,  freq: 0.0012, speed: 0.22, color: 'rgba( 71, 91, 90,',   width: 0.8, offset: 1.2 },
            { amp: 18,  freq: 0.0032, speed: 0.70, color: 'rgba(255, 68, 57,',   width: 0.4, offset: 2.1 },
            { amp: 28,  freq: 0.0014, speed: 0.31, color: 'rgba(255,212,202,',   width: 0.5, offset: 3.0 },
        ];

        let t = 0;

        const draw = () => {
            const W = canvas.width;
            const H = canvas.height;
            t += 0.012;

            ctx.clearRect(0, 0, W, H);

            const bg = ctx.createLinearGradient(0, 0, W, H);
            bg.addColorStop(0,   '#070B0A');
            bg.addColorStop(0.5, '#0A0F0E');
            bg.addColorStop(1,   '#060908');
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, W, H);

            const mx = mouseRef.current.x * W;
            const my = mouseRef.current.y * H;
            const glow = ctx.createRadialGradient(mx, my, 0, mx, my, 380);
            glow.addColorStop(0,   'rgba(255,68,57,0.055)');
            glow.addColorStop(0.5, 'rgba(71,91,90,0.03)');
            glow.addColorStop(1,   'transparent');
            ctx.fillStyle = glow;
            ctx.fillRect(0, 0, W, H);

            const tl = ctx.createRadialGradient(0, 0, 0, 0, 0, 500);
            tl.addColorStop(0, 'rgba(255,68,57,0.07)');
            tl.addColorStop(1, 'transparent');
            ctx.fillStyle = tl;
            ctx.fillRect(0, 0, W, H);

            const br = ctx.createRadialGradient(W, H, 0, W, H, 600);
            br.addColorStop(0, 'rgba(71,91,90,0.09)');
            br.addColorStop(1, 'transparent');
            ctx.fillStyle = br;
            ctx.fillRect(0, 0, W, H);

            ctx.fillStyle = 'rgba(255,255,255,0.012)';
            for (let y = 0; y < H; y += 3) {
                ctx.fillRect(0, y, W, 0.5);
            }

            const waveBaseY = H * 0.72;
            WAVES.forEach((wave) => {
                ctx.beginPath();
                for (let x = 0; x <= W; x += 2) {
                    const y = waveBaseY
                        + Math.sin(x * wave.freq + t * wave.speed + wave.offset) * wave.amp
                        + Math.sin(x * wave.freq * 1.7 + t * wave.speed * 0.6) * (wave.amp * 0.4);
                    if (x === 0) ctx.moveTo(x, y);
                    else         ctx.lineTo(x, y);
                }
                const alpha = 0.18 + 0.12 * Math.sin(t * 0.4 + wave.offset);
                ctx.strokeStyle = `${wave.color}${alpha})`;
                ctx.lineWidth   = wave.width;
                ctx.stroke();
            });

            const barCount = 80;
            const barW     = W / barCount;
            for (let i = 0; i < barCount; i++) {
                const phase  = i * 0.22 + t * 1.1;
                const height = (20 + Math.abs(Math.sin(phase) * 55 + Math.sin(phase * 1.7) * 25)) * 0.5;
                const alpha  = 0.06 + 0.04 * Math.sin(phase * 0.8);
                const hue    = i % 3 === 0 ? '255,68,57' : i % 3 === 1 ? '255,212,202' : '71,91,90';
                ctx.fillStyle = `rgba(${hue},${alpha})`;
                ctx.fillRect(i * barW, H - height, barW - 1, height);
            }

            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx   = particles[i].x - particles[j].x;
                    const dy   = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 120) {
                        const alpha = (1 - dist / 120) * 0.07 * (0.5 + 0.5 * Math.sin(t * 0.3 + i));
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = `rgba(255,212,202,${alpha})`;
                        ctx.lineWidth   = 0.5;
                        ctx.stroke();
                    }
                }
            }

            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.pulse += 0.02;
                if (p.y < -5)    p.y = canvas.height + 5;
                if (p.x < -5)    p.x = canvas.width  + 5;
                if (p.x > W + 5) p.x = -5;
                const alpha = p.opacity * (0.7 + 0.3 * Math.sin(p.pulse));
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255,212,202,${alpha})`;
                ctx.fill();
            });

            const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.9);
            vig.addColorStop(0, 'transparent');
            vig.addColorStop(1, 'rgba(4,7,6,0.72)');
            ctx.fillStyle = vig;
            ctx.fillRect(0, 0, W, H);

            rafRef.current = requestAnimationFrame(draw);
        };

        rafRef.current = requestAnimationFrame(draw);
        return () => {
            cancelAnimationFrame(rafRef.current);
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', onMouse);
        };
    }, []);

    return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full" style={{ zIndex: 0 }} />;
}

// ─── COVER WAVEFORM ───────────────────────────────────────────────────────────

function CoverWaveform() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef    = useRef<number>(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d')!;
        canvas.width  = 420;
        canvas.height = 420;

        let t = 0;
        const draw = () => {
            t += 0.008;
            const W = 420, H = 420;
            const cx = W / 2, cy = H / 2;
            ctx.clearRect(0, 0, W, H);

            [130, 155, 175].forEach((r, i) => {
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255,68,57,${0.04 + i * 0.015})`;
                ctx.lineWidth   = 1;
                ctx.stroke();
            });

            const BARS = 72;
            for (let i = 0; i < BARS; i++) {
                const angle  = (i / BARS) * Math.PI * 2 - Math.PI / 2;
                const phase  = i * 0.18 + t * 1.4;
                const barLen = 8 + Math.abs(Math.sin(phase) * 28 + Math.sin(phase * 1.6 + 1) * 16);
                const innerR = 88;
                const outerR = innerR + barLen;
                const x1 = cx + Math.cos(angle) * innerR;
                const y1 = cy + Math.sin(angle) * innerR;
                const x2 = cx + Math.cos(angle) * outerR;
                const y2 = cy + Math.sin(angle) * outerR;
                const norm = barLen / 52;
                const rr   = Math.round(255 * (1 - norm * 0.3));
                const gg   = Math.round(68  + norm * 60);
                const bb   = Math.round(57  + norm * 90);
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.strokeStyle = `rgba(${rr},${gg},${bb},${0.55 + norm * 0.4})`;
                ctx.lineWidth   = 2;
                ctx.lineCap     = 'round';
                ctx.stroke();
            }

            ctx.beginPath();
            for (let i = 0; i <= 360; i++) {
                const angle  = (i / 360) * Math.PI * 2;
                const wobble = 6 * Math.sin(i * 0.09 + t * 2.1);
                const r      = 60 + wobble;
                const x      = cx + Math.cos(angle) * r;
                const y      = cy + Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.strokeStyle = `rgba(255,212,202,${0.25 + 0.1 * Math.sin(t * 1.2)})`;
            ctx.lineWidth   = 1;
            ctx.stroke();

            const coreR    = 28 + 3 * Math.sin(t * 2.5);
            const coreGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 2.5);
            coreGlow.addColorStop(0,   `rgba(255,68,57,${0.6 + 0.2 * Math.sin(t * 2)})`);
            coreGlow.addColorStop(0.5, 'rgba(183,47,48,0.25)');
            coreGlow.addColorStop(1,   'transparent');
            ctx.fillStyle = coreGlow;
            ctx.beginPath();
            ctx.arc(cx, cy, coreR * 2.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
            ctx.fillStyle = '#FF4439';
            ctx.fill();

            const rp = (t * 0.5) % 1;
            [0, 0.33, 0.66].forEach(offset => {
                const progress = ((rp + offset) % 1);
                const rr       = 30 + progress * 140;
                const alpha    = (1 - progress) * 0.25;
                ctx.beginPath();
                ctx.arc(cx, cy, rr, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255,68,57,${alpha})`;
                ctx.lineWidth   = 1.5;
                ctx.stroke();
            });

            rafRef.current = requestAnimationFrame(draw);
        };

        rafRef.current = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(rafRef.current);
    }, []);

    return <canvas ref={canvasRef} width={420} height={420} style={{ width: '100%', height: '100%' }} />;
}

// ─── FLOAT INPUT ─────────────────────────────────────────────────────────────

interface InputProps {
    label:       string;
    type:        string;
    value:       string;
    onChange:    (v: string) => void;
    placeholder?: string;
    required?:   boolean;
    rightEl?:    React.ReactNode;
}

function FloatInput({ label, type, value, onChange, placeholder, required, rightEl }: InputProps) {
    const [focused, setFocused] = useState(false);
    const lifted = focused || value.length > 0;

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <label style={{
                position:      'absolute',
                left:          0,
                top:           lifted ? '-18px' : '10px',
                fontSize:      lifted ? '9px' : '13px',
                letterSpacing: lifted ? '0.18em' : '0.04em',
                color:         lifted && focused ? '#FF4439' : lifted ? 'rgba(255,212,202,0.55)' : 'rgba(252,252,252,0.25)',
                fontFamily:    "'DM Sans', sans-serif",
                fontWeight:    600,
                textTransform: 'uppercase' as const,
                transition:    'all 0.2s ease',
                pointerEvents: 'none' as const,
                userSelect:    'none' as const,
            }}>
                {label}
            </label>
            <input
                type={type}
                value={value}
                onChange={e => onChange(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder={focused ? (placeholder ?? '') : ''}
                required={required}
                style={{
                    background:    'transparent',
                    border:        'none',
                    borderBottom:  `1.5px solid ${focused ? '#FF4439' : 'rgba(255,255,255,0.12)'}`,
                    borderRadius:  0,
                    color:         '#FCFCFC',
                    padding:       '10px 0',
                    paddingRight:  rightEl ? '32px' : '0',
                    width:         '100%',
                    fontSize:      '14px',
                    outline:       'none',
                    fontFamily:    "'DM Sans', sans-serif",
                    boxShadow:     focused ? '0 1px 0 0 rgba(255,68,57,0.5)' : 'none',
                    transition:    'border-color 0.25s, box-shadow 0.25s',
                    letterSpacing: '0.02em',
                }}
            />
            {rightEl && (
                <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)' }}>
                    {rightEl}
                </div>
            )}
        </div>
    );
}

// ─── EYE TOGGLE ──────────────────────────────────────────────────────────────

function EyeToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
    return (
        <button type="button" onClick={onToggle} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,212,202,0.3)', padding: 0 }}>
            {visible
                ? <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 16, height: 16 }}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 16, height: 16 }}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            }
        </button>
    );
}

// ─── SUBMIT BUTTON ────────────────────────────────────────────────────────────

function SubmitButton({ isLoading, label, loadingLabel }: { isLoading: boolean; label: string; loadingLabel: string }) {
    const [hovered, setHovered] = useState(false);

    return (
        <button
            type="submit"
            disabled={isLoading}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                position:      'relative',
                width:         '100%',
                background:    hovered ? 'linear-gradient(90deg, #FF4439, #B72F30)' : 'rgba(255,68,57,0.08)',
                border:        `1px solid ${hovered ? '#FF4439' : 'rgba(255,255,255,0.1)'}`,
                borderRadius:  '999px',
                padding:       '14px 0',
                cursor:        isLoading ? 'not-allowed' : 'pointer',
                opacity:       isLoading ? 0.65 : 1,
                transition:    'all 0.35s ease',
                marginTop:     '8px',
                overflow:      'hidden',
                boxShadow:     hovered ? '0 0 30px rgba(255,68,57,0.25)' : 'none',
            }}
        >
            <span style={{
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                gap:            '8px',
                fontFamily:     "'DM Sans', sans-serif",
                fontSize:       '11px',
                fontWeight:     700,
                letterSpacing:  '0.25em',
                textTransform:  'uppercase' as const,
                color:          '#FCFCFC',
            }}>
                {isLoading ? (
                    <>
                        <svg style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} viewBox="0 0 24 24" fill="none">
                            <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        {loadingLabel}
                    </>
                ) : label}
            </span>
        </button>
    );
}

// ─── MAIN AUTH PAGE ───────────────────────────────────────────────────────────

export default function AuthPage() {
    const navigate  = useNavigate();
    const isMobile  = useIsMobile(768);

    const [isLogin,   setIsLogin]   = useState(true);
    const [isLoading, setIsLoading] = useState(false);

    const [loginEmail,    setLoginEmail]    = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [showLoginPwd,  setShowLoginPwd]  = useState(false);

    const [regName,     setRegName]     = useState('');
    const [regEmail,    setRegEmail]    = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [showRegPwd,  setShowRegPwd]  = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const data = await AuthService.login(loginEmail, loginPassword);
            // JWT is now in an HttpOnly cookie set by the server.
            // Store only non-sensitive user info in sessionStorage for UI use.
            sessionStorage.setItem('isLoggedIn', 'true');
            sessionStorage.setItem('userId',    String(data.userId));
            sessionStorage.setItem('userName',   data.name);
            sessionStorage.setItem('userEmail',  data.email);
            navigate('/home');
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const message = error.response?.data?.message || 'Login failed. Check your connection.';
                toast.error(message);
            } else {
                toast.error('An unexpected error occurred');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const data = await AuthService.register(regName, regEmail, regPassword);
            // Same as login — JWT is in the cookie, store only UI state here.
            sessionStorage.setItem('isLoggedIn', 'true');
            sessionStorage.setItem('userId',    String(data.userId));
            sessionStorage.setItem('userName',   data.name);
            sessionStorage.setItem('userEmail',  data.email);
            navigate('/home');
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const message = error.response?.data?.message || 'Registration failed. Name or Email might be taken.';
                toast.error(message);
            } else {
                toast.error('An unexpected error occurred');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Cormorant+Garamond:ital,wght@1,400;1,500&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />

            <style>{`
                @keyframes auth-fade-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes wordmark-in {
                    from { opacity: 0; letter-spacing: 0.9em; }
                    to   { opacity: 1; letter-spacing: 0.55em; }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to   { transform: rotate(360deg); }
                }
                @keyframes tag-blink {
                    0%, 100% { opacity: 0.3; }
                    50%      { opacity: 0.9; }
                }
                .cover-panel {
                    transition: transform 0.85s cubic-bezier(0.16, 1, 0.3, 1);
                }
                /* Tap highlight reset on mobile */
                button { -webkit-tap-highlight-color: transparent; }
            `}</style>

            {/* Animated canvas background */}
            <StudioCanvas />

            {/* ── MOBILE LAYOUT ── */}
            {isMobile ? (
                <div style={{
                    position:       'relative',
                    zIndex:         10,
                    minHeight:      '100vh',
                    display:        'flex',
                    flexDirection:  'column',
                    alignItems:     'center',
                    justifyContent: 'flex-start',
                    padding:        '48px 20px 40px',
                    fontFamily:     "'DM Sans', sans-serif",
                    overflowY:      'auto',
                }}>
                    {/* Top wordmark */}
                    <div style={{
                        marginBottom: '28px',
                        textAlign:    'center',
                        animation:    'wordmark-in 0.9s cubic-bezier(0.16,1,0.3,1) both',
                    }}>
                        <span style={{
                            fontFamily:    "'Bebas Neue', sans-serif",
                            fontSize:      '12px',
                            letterSpacing: '0.55em',
                            color:         'rgba(255,212,202,0.35)',
                        }}>
                            ◆ &nbsp; AALAP STUDIO &nbsp; ◆
                        </span>
                    </div>

                    {/* Mini waveform */}
                    <div style={{ width: '120px', height: '120px', marginBottom: '24px', flexShrink: 0 }}>
                        <CoverWaveform />
                    </div>

                    {/* Card */}
                    <div style={{
                        position:            'relative',
                        width:               '100%',
                        maxWidth:            '420px',
                        borderRadius:        '24px',
                        background:          'rgba(8,12,11,0.88)',
                        backdropFilter:      'blur(36px)',
                        WebkitBackdropFilter:'blur(36px)',
                        border:              '1px solid rgba(255,255,255,0.07)',
                        boxShadow:           '0 0 0 1px rgba(255,255,255,0.03), 0 32px 72px rgba(0,0,0,0.65), 0 0 100px rgba(255,68,57,0.07)',
                        overflow:            'hidden',
                        animation:           'auth-fade-up 0.7s cubic-bezier(0.16,1,0.3,1) 0.1s both',
                    }}>
                        {/* Top accent bar */}
                        <div style={{
                            position:   'absolute',
                            top: 0, left: 0, right: 0,
                            height:     '1.5px',
                            background: 'linear-gradient(90deg, transparent 0%, #FF4439 25%, #FFD4CA 65%, #475B5A 100%)',
                            zIndex:     1,
                        }} />

                        {/* Tab switcher */}
                        <div style={{
                            display:       'flex',
                            borderBottom:  '1px solid rgba(255,255,255,0.06)',
                            padding:       '0 4px',
                            gap:           '4px',
                            paddingTop:    '6px',
                        }}>
                            {[
                                { label: 'Sign In',  active: isLogin,  onClick: () => setIsLogin(true)  },
                                { label: 'Join',     active: !isLogin, onClick: () => setIsLogin(false) },
                            ].map(tab => (
                                <button
                                    key={tab.label}
                                    type="button"
                                    onClick={tab.onClick}
                                    style={{
                                        flex:          1,
                                        background:    'none',
                                        border:        'none',
                                        cursor:        'pointer',
                                        padding:       '14px 0 12px',
                                        fontFamily:    "'Bebas Neue', sans-serif",
                                        fontSize:      '13px',
                                        letterSpacing: '0.25em',
                                        color:         tab.active ? '#FF4439' : 'rgba(255,255,255,0.3)',
                                        borderBottom:  tab.active ? '2px solid #FF4439' : '2px solid transparent',
                                        marginBottom:  '-1px',
                                        transition:    'all 0.25s ease',
                                    }}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Panel content */}
                        <div style={{ padding: '36px 28px 40px' }}>
                            {isLogin ? (
                                <>
                                    <div style={{ marginBottom: '32px' }}>
                                        <h1 style={{
                                            fontFamily:    "'Bebas Neue', sans-serif",
                                            fontSize:      '42px',
                                            letterSpacing: '0.04em',
                                            color:         '#FCFCFC',
                                            lineHeight:    1,
                                            marginBottom:  '6px',
                                        }}>
                                            Welcome Back
                                        </h1>
                                        <p style={{
                                            fontFamily: "'Cormorant Garamond', serif",
                                            fontStyle:  'italic',
                                            fontSize:   '15px',
                                            color:      'rgba(255,212,202,0.5)',
                                        }}>
                                            Your threads are waiting.
                                        </p>
                                    </div>
                                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                                        <FloatInput label="Email Address" type="email" value={loginEmail} onChange={setLoginEmail} placeholder="you@example.com" required />
                                        <FloatInput
                                            label="Password" type={showLoginPwd ? 'text' : 'password'}
                                            value={loginPassword} onChange={setLoginPassword}
                                            placeholder="••••••••" required
                                            rightEl={<EyeToggle visible={showLoginPwd} onToggle={() => setShowLoginPwd(v => !v)} />}
                                        />
                                        <SubmitButton isLoading={isLoading} label="Enter Studio" loadingLabel="Syncing..." />
                                    </form>
                                    <p style={{
                                        marginTop:     '20px',
                                        textAlign:     'center',
                                        fontFamily:    "'DM Sans', sans-serif",
                                        fontSize:      '12px',
                                        color:         'rgba(255,255,255,0.25)',
                                        letterSpacing: '0.04em',
                                    }}>
                                        New here?{' '}
                                        <button type="button" onClick={() => setIsLogin(false)} style={{
                                            background:    'none',
                                            border:        'none',
                                            cursor:        'pointer',
                                            color:         'rgba(255,212,202,0.55)',
                                            fontFamily:    "'DM Sans', sans-serif",
                                            fontSize:      '12px',
                                            padding:       0,
                                            textDecoration:'underline',
                                        }}>
                                            Create an account
                                        </button>
                                    </p>
                                </>
                            ) : (
                                <>
                                    <div style={{ marginBottom: '32px' }}>
                                        <h1 style={{
                                            fontFamily:    "'Bebas Neue', sans-serif",
                                            fontSize:      '42px',
                                            letterSpacing: '0.04em',
                                            color:         '#FCFCFC',
                                            lineHeight:    1,
                                            marginBottom:  '6px',
                                        }}>
                                            Start Creating
                                        </h1>
                                        <p style={{
                                            fontFamily: "'Cormorant Garamond', serif",
                                            fontStyle:  'italic',
                                            fontSize:   '15px',
                                            color:      'rgba(255,212,202,0.5)',
                                        }}>
                                            Connecting the talents.
                                        </p>
                                    </div>
                                    <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                                        <FloatInput label="Stage Name" type="text" value={regName} onChange={setRegName} placeholder="e.g. Ravi" required />
                                        <FloatInput label="Email Address" type="email" value={regEmail} onChange={setRegEmail} placeholder="you@example.com" required />
                                        <FloatInput
                                            label="Password" type={showRegPwd ? 'text' : 'password'}
                                            value={regPassword} onChange={setRegPassword}
                                            placeholder="••••••••" required
                                            rightEl={<EyeToggle visible={showRegPwd} onToggle={() => setShowRegPwd(v => !v)} />}
                                        />
                                        <SubmitButton isLoading={isLoading} label="Join the Network" loadingLabel="Creating..." />
                                    </form>
                                    <p style={{
                                        marginTop:     '20px',
                                        textAlign:     'center',
                                        fontFamily:    "'DM Sans', sans-serif",
                                        fontSize:      '12px',
                                        color:         'rgba(255,255,255,0.25)',
                                        letterSpacing: '0.04em',
                                    }}>
                                        Already have an account?{' '}
                                        <button type="button" onClick={() => setIsLogin(true)} style={{
                                            background:    'none',
                                            border:        'none',
                                            cursor:        'pointer',
                                            color:         'rgba(255,212,202,0.55)',
                                            fontFamily:    "'DM Sans', sans-serif",
                                            fontSize:      '12px',
                                            padding:       0,
                                            textDecoration:'underline',
                                        }}>
                                            Sign in
                                        </button>
                                    </p>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Bottom tagline */}
                    <div style={{
                        marginTop:  '28px',
                        display:    'flex',
                        alignItems: 'center',
                        gap:        '12px',
                        userSelect: 'none',
                        animation:  'auth-fade-up 0.8s 0.4s ease both',
                        opacity:    0,
                    }}>
                        {['Compose', 'Collaborate', 'Release'].map((word, i) => (
                            <span key={word} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{
                                    fontFamily:    "'DM Sans', sans-serif",
                                    fontSize:      '8px',
                                    letterSpacing: '0.22em',
                                    textTransform: 'uppercase' as const,
                                    color:         'rgba(252,252,252,0.18)',
                                }}>
                                    {word}
                                </span>
                                {i < 2 && (
                                    <span style={{ color: 'rgba(255,68,57,0.3)', fontSize: '6px' }}>◆</span>
                                )}
                            </span>
                        ))}
                    </div>
                </div>

            ) : (

                // ── DESKTOP LAYOUT ──
                <div style={{
                    position:       'relative',
                    zIndex:         10,
                    minHeight:      '100vh',
                    display:        'flex',
                    flexDirection:  'column',
                    alignItems:     'center',
                    justifyContent: 'center',
                    padding:        '24px 16px',
                    fontFamily:     "'DM Sans', sans-serif",
                }}>
                    {/* Top wordmark */}
                    <div style={{
                        marginBottom: '28px',
                        textAlign:    'center',
                        animation:    'wordmark-in 0.9s cubic-bezier(0.16,1,0.3,1) both',
                    }}>
                        <span style={{
                            fontFamily:    "'Bebas Neue', sans-serif",
                            fontSize:      '13px',
                            letterSpacing: '0.55em',
                            color:         'rgba(255,212,202,0.35)',
                        }}>
                            ◆ &nbsp; AALAP STUDIO &nbsp; ◆
                        </span>
                    </div>

                    {/* Card */}
                    <div style={{
                        position:            'relative',
                        width:               '100%',
                        maxWidth:            '920px',
                        height:              'clamp(480px, 56vh, 580px)',
                        borderRadius:        '28px',
                        background:          'rgba(8,12,11,0.85)',
                        backdropFilter:      'blur(36px)',
                        WebkitBackdropFilter:'blur(36px)',
                        border:              '1px solid rgba(255,255,255,0.07)',
                        boxShadow:           '0 0 0 1px rgba(255,255,255,0.03), 0 48px 96px rgba(0,0,0,0.65), 0 0 140px rgba(255,68,57,0.07)',
                        overflow:            'hidden',
                        animation:           'auth-fade-up 0.7s cubic-bezier(0.16,1,0.3,1) 0.1s both',
                    }}>
                        {/* Top accent bar */}
                        <div style={{
                            position:   'absolute',
                            top: 0, left: 0, right: 0,
                            height:     '1.5px',
                            background: 'linear-gradient(90deg, transparent 0%, #FF4439 25%, #FFD4CA 65%, #475B5A 100%)',
                            zIndex:     1,
                        }} />

                        {/* ── LOGIN PANEL ── */}
                        <div style={{
                            position:       'absolute',
                            left: 0, top: 0,
                            width:          '50%',
                            height:         '100%',
                            display:        'flex',
                            flexDirection:  'column',
                            justifyContent: 'center',
                            padding:        '40px clamp(28px, 5%, 52px)',
                            borderRight:    '1px solid rgba(255,255,255,0.04)',
                        }}>
                            <div style={{ marginBottom: '36px' }}>
                                <p style={{
                                    fontFamily:    "'Bebas Neue', sans-serif",
                                    fontSize:      '11px',
                                    letterSpacing: '0.35em',
                                    color:         'rgba(255,68,57,0.6)',
                                    marginBottom:  '8px',
                                }}>
                                    01 — SIGN IN
                                </p>
                                <h1 style={{
                                    fontFamily:    "'Bebas Neue', sans-serif",
                                    fontSize:      'clamp(38px, 4vw, 54px)',
                                    letterSpacing: '0.04em',
                                    color:         '#FCFCFC',
                                    lineHeight:    1,
                                    marginBottom:  '8px',
                                }}>
                                    Welcome Back
                                </h1>
                                <p style={{
                                    fontFamily: "'Cormorant Garamond', serif",
                                    fontStyle:  'italic',
                                    fontSize:   '16px',
                                    color:      'rgba(255,212,202,0.5)',
                                }}>
                                    Your threads are waiting.
                                </p>
                            </div>

                            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '28px', width: '100%', maxWidth: '300px' }}>
                                <FloatInput label="Email Address" type="email" value={loginEmail} onChange={setLoginEmail} placeholder="you@example.com" required />
                                <FloatInput
                                    label="Password" type={showLoginPwd ? 'text' : 'password'}
                                    value={loginPassword} onChange={setLoginPassword}
                                    placeholder="••••••••" required
                                    rightEl={<EyeToggle visible={showLoginPwd} onToggle={() => setShowLoginPwd(v => !v)} />}
                                />
                                <SubmitButton isLoading={isLoading} label="Enter Studio" loadingLabel="Syncing..." />
                            </form>
                        </div>

                        {/* ── REGISTER PANEL ── */}
                        <div style={{
                            position:       'absolute',
                            right: 0, top: 0,
                            width:          '50%',
                            height:         '100%',
                            display:        'flex',
                            flexDirection:  'column',
                            justifyContent: 'center',
                            padding:        '40px clamp(28px, 5%, 52px)',
                        }}>
                            <div style={{ marginBottom: '32px' }}>
                                <p style={{
                                    fontFamily:    "'Bebas Neue', sans-serif",
                                    fontSize:      '11px',
                                    letterSpacing: '0.35em',
                                    color:         'rgba(255,212,202,0.45)',
                                    marginBottom:  '8px',
                                }}>
                                    02 — JOIN
                                </p>
                                <h1 style={{
                                    fontFamily:    "'Bebas Neue', sans-serif",
                                    fontSize:      'clamp(38px, 4vw, 54px)',
                                    letterSpacing: '0.04em',
                                    color:         '#FCFCFC',
                                    lineHeight:    1,
                                    marginBottom:  '8px',
                                }}>
                                    Start Creating
                                </h1>
                                <p style={{
                                    fontFamily: "'Cormorant Garamond', serif",
                                    fontStyle:  'italic',
                                    fontSize:   '16px',
                                    color:      'rgba(255,212,202,0.5)',
                                }}>
                                    Connecting the talents.
                                </p>
                            </div>

                            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', maxWidth: '300px' }}>
                                <FloatInput label="Stage Name" type="text" value={regName} onChange={setRegName} placeholder="e.g. Ravi" required />
                                <FloatInput label="Email Address" type="email" value={regEmail} onChange={setRegEmail} placeholder="you@example.com" required />
                                <FloatInput
                                    label="Password" type={showRegPwd ? 'text' : 'password'}
                                    value={regPassword} onChange={setRegPassword}
                                    placeholder="••••••••" required
                                    rightEl={<EyeToggle visible={showRegPwd} onToggle={() => setShowRegPwd(v => !v)} />}
                                />
                                <SubmitButton isLoading={isLoading} label="Join the Network" loadingLabel="Creating..." />
                            </form>
                        </div>

                        {/* ── SLIDING COVER PANEL ── */}
                        <div
                            className="cover-panel"
                            style={{
                                position:       'absolute',
                                top: 0, left: 0,
                                width:          '50%',
                                height:         '100%',
                                display:        'flex',
                                flexDirection:  'column',
                                alignItems:     'center',
                                justifyContent: 'center',
                                background:     'linear-gradient(145deg, #0D1513 0%, #111A18 55%, #0A100F 100%)',
                                borderLeft:     '1px solid rgba(255,68,57,0.12)',
                                borderRight:    '1px solid rgba(255,255,255,0.04)',
                                zIndex:         20,
                                overflow:       'hidden',
                                transform:      isLogin ? 'translateX(100%)' : 'translateX(0%)',
                            }}
                        >
                            {/* Cover top line */}
                            <div style={{
                                position:   'absolute',
                                top: 0, left: 0, right: 0,
                                height:     '1.5px',
                                background: 'linear-gradient(90deg, #FF4439, #FFD4CA, transparent)',
                            }} />

                            {/* Cover ambient */}
                            <div style={{
                                position:      'absolute',
                                inset:         0,
                                background:    'radial-gradient(ellipse at 50% 30%, rgba(255,68,57,0.09) 0%, transparent 65%)',
                                pointerEvents: 'none',
                            }} />

                            {/* Live waveform */}
                            <div style={{ width: '180px', height: '180px', marginBottom: '16px', flexShrink: 0 }}>
                                <CoverWaveform />
                            </div>

                            {/* Cover text */}
                            <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '0 28px' }}>
                                <h2 style={{
                                    fontFamily:    "'Bebas Neue', sans-serif",
                                    fontSize:      'clamp(36px, 4vw, 52px)',
                                    letterSpacing: '0.1em',
                                    color:         '#FCFCFC',
                                    lineHeight:    1,
                                    marginBottom:  '10px',
                                    textShadow:    '0 0 50px rgba(255,68,57,0.3)',
                                }}>
                                    {isLogin ? 'New Here?' : 'Hello Again.'}
                                </h2>

                                <p style={{
                                    fontFamily: "'Cormorant Garamond', serif",
                                    fontStyle:  'italic',
                                    fontSize:   '15px',
                                    color:      'rgba(255,212,202,0.55)',
                                    lineHeight: 1.65,
                                    maxWidth:   '220px',
                                    margin:     '0 auto 20px',
                                }}>
                                    {isLogin
                                        ? 'Aalap is where songs are born. Find your missing pieces.'
                                        : 'The global studio is waiting. Step inside.'}
                                </p>

                                <button
                                    onClick={() => setIsLogin(v => !v)}
                                    style={{
                                        display:       'inline-flex',
                                        alignItems:    'center',
                                        gap:           '10px',
                                        padding:       '11px 26px',
                                        borderRadius:  '999px',
                                        border:        '1px solid rgba(255,212,202,0.28)',
                                        background:    'rgba(255,212,202,0.04)',
                                        cursor:        'pointer',
                                        transition:    'all 0.3s ease',
                                        fontFamily:    "'DM Sans', sans-serif",
                                        fontSize:      '11px',
                                        fontWeight:    600,
                                        letterSpacing: '0.22em',
                                        textTransform: 'uppercase' as const,
                                        color:         'rgba(255,212,202,0.75)',
                                    }}
                                    onMouseEnter={e => {
                                        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,212,202,0.1)';
                                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,212,202,0.5)';
                                    }}
                                    onMouseLeave={e => {
                                        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,212,202,0.04)';
                                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,212,202,0.28)';
                                    }}
                                >
                                    {isLogin ? 'Create Account' : 'Sign In'}
                                    <svg fill="none" stroke="rgba(255,212,202,0.6)" viewBox="0 0 24 24" style={{ width: 13, height: 13 }}>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
                                    </svg>
                                </button>
                            </div>

                            {/* Corner labels */}
                            <div style={{
                                position:      'absolute',
                                top: 18, left: 20,
                                fontFamily:    "'Bebas Neue', sans-serif",
                                fontSize:      '11px',
                                letterSpacing: '0.3em',
                                color:         'rgba(255,68,57,0.3)',
                            }}>
                                Aalap
                            </div>
                            <div style={{
                                position:   'absolute',
                                bottom: 18, right: 20,
                                fontFamily: "'Cormorant Garamond', serif",
                                fontStyle:  'italic',
                                fontSize:   '10px',
                                color:      'rgba(255,212,202,0.25)',
                                animation:  'tag-blink 3s ease-in-out infinite',
                            }}>
                                ● live
                            </div>
                        </div>

                    </div>

                    {/* Bottom tagline */}
                    <div style={{
                        marginTop:  '28px',
                        display:    'flex',
                        alignItems: 'center',
                        gap:        '16px',
                        userSelect: 'none',
                        animation:  'auth-fade-up 0.8s 0.4s ease both',
                        opacity:    0,
                    }}>
                        {['Compose', 'Collaborate', 'Release'].map((word, i) => (
                            <span key={word} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <span style={{
                                    fontFamily:    "'DM Sans', sans-serif",
                                    fontSize:      '9px',
                                    letterSpacing: '0.28em',
                                    textTransform: 'uppercase' as const,
                                    color:         'rgba(252,252,252,0.18)',
                                }}>
                                    {word}
                                </span>
                                {i < 2 && (
                                    <span style={{ color: 'rgba(255,68,57,0.3)', fontSize: '7px' }}>◆</span>
                                )}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}