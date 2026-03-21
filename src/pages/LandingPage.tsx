import { useEffect, useRef, useState } from 'react'
import MusicStrings from './MusicStrings'
import './LandingPage.css'
import SlotMachine from './SlotMachine';
import ScrollMarquee from "./ScrollMarquee.tsx";
import { useNavigate } from 'react-router-dom'

const NOTES = ['♩', '♪', '♫', '♬', '𝄞', '𝄢']

interface Particle {
  x: number; y: number; note: string
  size: number; opacity: number; speed: number
  drift: number; rotation: number; rotationSpeed: number
}



const FLOW_STEPS = [
  { step: '01', role: 'Composer',  desc: 'Uploads a melody and opens a thread',        highlight: false },
  { step: '02', role: 'Lyricist',  desc: 'Discovers it and writes lyrics',              highlight: false },
  { step: '03', role: 'Singer',    desc: 'Records vocals and contributes them',         highlight: false },
  { step: '04', role: 'Producer',  desc: 'Produces the full track',                    highlight: false },
  { step: '05', role: 'The World', desc: 'Hears the song — every name fully credited', highlight: true  },
]

const CONTRIBUTIONS = [
  { role: 'Composer', name: 'Ravi',  file: 'tune.mp3'      },
  { role: 'Lyricist', name: 'Priya', file: 'lyrics.txt'    },
  { role: 'Singer',   name: 'Sneha', file: 'vocals.mp3'    },
  { role: 'Producer', name: 'Kumar', file: 'final_mix.mp3' },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const heroTitleRef = useRef<HTMLHeadingElement>(null)

  const [playingIdx, setPlayingIdx] = useState<number | null>(null)
  const [activeStep, setActiveStep] = useState(0)

  // Added state for the Music Strings hover effect
  const [isHeroHovered, setIsHeroHovered] = useState(false)

  // ── Floating notes canvas ──
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let animId: number
    let particles: Particle[] = []

    const resize = () => {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }

    const init = () => {
      particles = Array.from({ length: 40 }, () => ({
        x:             Math.random() * canvas.width,
        y:             Math.random() * canvas.height,
        note:          NOTES[Math.floor(Math.random() * NOTES.length)],
        size:          16 + Math.random() * 26,
        opacity:       0.06 + Math.random() * 0.14,
        speed:         0.2 + Math.random() * 0.5,
        drift:         (Math.random() - 0.5) * 0.4,
        rotation:      Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.008,
      }))
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const p of particles) {
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)
        ctx.globalAlpha = p.opacity
        ctx.fillStyle   = '#FFD4CA'
        ctx.font        = `${p.size}px Georgia, serif`
        ctx.fillText(p.note, 0, 0)
        ctx.restore()
        p.y        -= p.speed
        p.x        += p.drift
        p.rotation += p.rotationSpeed
        if (p.y < -50)                    { p.y = canvas.height + 50; p.x = Math.random() * canvas.width }
        if (p.x < -50)                      p.x = canvas.width + 50
        else if (p.x > canvas.width + 50)   p.x = -50
      }
      animId = requestAnimationFrame(animate)
    }

    resize(); init(); animate()
    const onResize = () => { resize(); init() }
    window.addEventListener('resize', onResize)
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', onResize) }
  }, [])


  // ── Parallax on hero title ──
  useEffect(() => {
    const title = heroTitleRef.current
    if (!title) return
    const onScroll = () => {
      const y = window.scrollY
      title.style.transform = `translateY(${y * 0.18}px)`
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // ── Navbar scroll behaviour ──
  useEffect(() => {
    const nav = document.querySelector('.nav') as HTMLElement
    let lastScroll = 0
    const onScroll = () => {
      const current = window.scrollY
      if (current > lastScroll && current > 80) nav.classList.add('nav-hidden')
      else nav.classList.remove('nav-hidden')
      if (current > 60) nav.classList.add('nav-scrolled')
      else nav.classList.remove('nav-scrolled')
      lastScroll = current
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // ── Scroll reveal + thread card animation ──
  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]')
    const observer = new IntersectionObserver(
        entries => entries.forEach(e => {
          if (e.isIntersecting) {
            ;(e.target as HTMLElement).classList.add('revealed')
            observer.unobserve(e.target)
          }
        }),
        { threshold: 0.1 }
    )
    els.forEach(el => observer.observe(el))

    const contribs = document.querySelectorAll('.idea-contrib')
    const cardObserver = new IntersectionObserver(
        entries => entries.forEach(e => {
          if (e.isIntersecting) {
            contribs.forEach(c => c.classList.add('visible'))
            cardObserver.disconnect()
          }
        }),
        { threshold: 0.3 }
    )
    const card = document.querySelector('.idea-thread')
    if (card) cardObserver.observe(card)

    return () => { observer.disconnect(); cardObserver.disconnect() }
  }, [])

  // ── Timeline active step on scroll ──
  useEffect(() => {
    const items = document.querySelectorAll('.tl-item')
    const observer = new IntersectionObserver(
        entries => {
          entries.forEach(e => {
            if (e.isIntersecting) {
              const idx = Array.from(items).indexOf(e.target)
              setActiveStep(idx)
            }
          })
        },
        { threshold: 0.7 }
    )
    items.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  // ── Magnetic button effect ──
  useEffect(() => {
    const btns = document.querySelectorAll('.btn-primary')
    const handlers: Array<() => void> = []

    btns.forEach(btn => {
      const el = btn as HTMLElement

      const onMove = (e: MouseEvent) => {
        const r = el.getBoundingClientRect()
        const dx = e.clientX - (r.left + r.width  / 2)
        const dy = e.clientY - (r.top  + r.height / 2)
        el.style.transform = `translate(${dx * 0.22}px, ${dy * 0.22}px)`
        // ripple center
        el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`)
        el.style.setProperty('--my', `${((e.clientY - r.top)  / r.height) * 100}%`)
      }

      const onLeave = () => {
        el.style.transform = ''
      }

      el.addEventListener('mousemove', onMove)
      el.addEventListener('mouseleave', onLeave)
      handlers.push(() => {
        el.removeEventListener('mousemove', onMove)
        el.removeEventListener('mouseleave', onLeave)
      })
    })

    return () => handlers.forEach(h => h())
  }, [])

  const scrollTo = (id: string) =>
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  const togglePlay = (i: number) =>
      setPlayingIdx(prev => prev === i ? null : i)



  return (
      <div className="landing">

        {/* ━━━━━━━━  NAV  ━━━━━━━━ */}
        <nav className="nav">
          <span className="nav-logo">AALAP</span>
          <button className="nav-login" onClick={() => navigate('/auth')}>Login</button>
        </nav>

        {/* ━━━━━━━━  HERO  ━━━━━━━━ */}
        <section className="hero" id="hero">
          <canvas ref={canvasRef} className="hero-canvas" />


          <div className="hero-inner">
            <div className="hero-left">
              <p className="hero-eyebrow">Music collaboration, reimagined</p>
              <h1 className="hero-title" ref={heroTitleRef}>
                WHERE<br />
                <span className="italic-word">songs</span><br />
                ARE <span className="accent">BORN.</span>
              </h1>
              <div className="hero-bottom">
                <p className="hero-sub">No connections. No money. Just talent — and the right people finding each other.</p>
                <div className="hero-actions">
                  <button className="btn-primary" onClick={() => navigate('/auth')}>Get Started</button>
                  <button className="btn-ghost"   onClick={() => scrollTo('flow')}>See how it works</button>
                </div>
              </div>
            </div>

            <div
                className="hero-right"
                onMouseEnter={() => setIsHeroHovered(true)}
                onMouseLeave={() => setIsHeroHovered(false)}
            >
              {/* The Dynamic Strings */}
              <MusicStrings isHovered={isHeroHovered} />

              <div className="avatar-float avatar-1">
                <div className="avatar-circle">R</div>
                <span className="avatar-tag">Composer</span>
              </div>
              <div className="avatar-float avatar-2">
                <div className="avatar-circle">P</div>
                <span className="avatar-tag">Lyricist</span>
              </div>
              <div className="avatar-float avatar-3">
                <div className="avatar-circle">S</div>
                <span className="avatar-tag">Singer</span>
              </div>
              <div className="avatar-float avatar-4">
                <div className="avatar-circle">K</div>
                <span className="avatar-tag">Producer</span>
              </div>
            </div>
          </div>
        </section>

        {/* ━━━━━━━━  MARQUEE  ━━━━━━━━ */}
        <ScrollMarquee />



        {/* ━━━━━━━━  IDEA  ━━━━━━━━ */}
        <section className="idea-section" id="idea">
          <div className="idea-inner">
            <div className="idea-left">
              <span className="idea-label" data-reveal>What is Aalap</span>
              <h2 className="idea-text" data-reveal>
                NETWORK<br />
                FOR <span className="red">MUSIC.</span><br />
                <span className="teal">CREATION.</span>
              </h2>
            </div>
            <div className="idea-right" data-reveal>
              <SlotMachine />
            </div>
          </div>
        </section>

        {/* ━━━━━━━━  FLOW  ━━━━━━━━ */}
        <section className="flow-section" id="flow">
          <h2 className="flow-title" data-reveal>HOW A SONG<br />IS BORN</h2>
          <div className="timeline">
            {FLOW_STEPS.map((item, i) => (
                <div
                    key={i}
                    className={`tl-item${item.highlight ? ' tl-highlight' : ''}${i === activeStep ? ' tl-active' : ''}`}
                    data-reveal
                >
                  <div className="tl-left">
                    <div className="tl-dot" />
                    {i < FLOW_STEPS.length - 1 && <div className="tl-line" />}
                  </div>
                  <div className="tl-body">
                    <span className="tl-step">{item.step}</span>
                    <span className="tl-role">{item.role.toUpperCase()}</span>
                    <p className="tl-desc">{item.desc}</p>
                  </div>
                </div>
            ))}
          </div>
        </section>

        {/* ━━━━━━━━  DEMO  ━━━━━━━━ */}
        <section className="demo-section" id="demo">
          <span className="demo-label" data-reveal>See it in action</span>
          <div className="demo-inner" data-reveal>
            <div>
              <h3 className="demo-left-title">A REAL<br />THREAD.</h3>
              <p className="demo-left-sub">Four strangers. One song.<br />No money changed hands.</p>
            </div>
            <div className="thread-card">
              <div className="thread-top">
                <div>
                  <div className="thread-title">MIDNIGHT MELODY</div>
                  <p className="thread-meta">Started by Ravi · 4 contributions</p>
                </div>
                <span className="thread-badge">● Live</span>
              </div>
              <div className="contribs">
                {CONTRIBUTIONS.map((c, i) => (
                    <div className="contrib-row" key={i}>
                      <div className="contrib-left">
                        <span className="contrib-role">{c.role}</span>
                        <span className="contrib-name">by {c.name}</span>
                      </div>
                      <div className="contrib-right">
                        <span className="contrib-file">{c.file}</span>
                        <button
                            className={`play-btn${playingIdx === i ? ' playing' : ''}`}
                            onClick={() => togglePlay(i)}
                            aria-label={`Play ${c.role}`}
                        >
                          <span className="btn-icon">▶</span>
                          <span className="btn-wave">
                        <span className="btn-wave-bar" style={{ height: '60%' }} />
                        <span className="btn-wave-bar" style={{ height: '100%' }} />
                        <span className="btn-wave-bar" style={{ height: '40%' }} />
                      </span>
                        </button>
                      </div>
                    </div>
                ))}
              </div>
              <p className="thread-note">Four people who found each other on Aalap. That's it.</p>
            </div>
          </div>
        </section>

        {/* ━━━━━━━━  PROBLEM  ━━━━━━━━ */}
        <section className="problem-section" id="problem">
          <span className="problem-label" data-reveal>The wall every musician hits</span>
          <div className="problem-list" data-reveal>
            <p className="problem-line">You have ideas. But no one to build them with.</p>
            <p className="problem-line">You can create. But nowhere to put it out.</p>
            <p className="problem-line">You have music in your head… But no way to complete it.</p>
          </div>
          <div className="problem-bridge" data-reveal>
            {['AALAP', 'CONNECTS', 'THE', 'MISSING', 'PIECES.'].map((word, i) => (
                <span
                    key={i}
                    className="bridge-word"
                    style={{ animationDelay: `${i * 0.12}s` }}
                >
      {word}
    </span>
            ))}
            <span className="bridge-underline" />
          </div>        </section>

        {/* ━━━━━━━━  CTA  ━━━━━━━━ */}
        <section className="cta-section" id="cta">
          <h2 className="cta-heading" data-reveal>
            YOUR TALENT<br />
            DESERVES TO<br />
            BE <span className="red">HEARD.</span>
          </h2>
          <p className="cta-sub" data-reveal>
            Join musicians, lyricists, singers and producers<br />
            building songs together — one thread at a time.
          </p>
          <button className="btn-primary btn-xl" data-reveal onClick={() => navigate('/auth')}>
            Start Your First Thread
          </button>
        </section>

      </div>
  )
}