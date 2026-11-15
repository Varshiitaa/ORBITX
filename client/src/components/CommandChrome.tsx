import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Starfield } from './scene/Starfield'

const NAV = [
  { to: '/', label: 'COMMAND', match: (path: string) => path === '/' },
  { to: '/explore', label: 'STAR MAP', match: (path: string) => path === '/explore' },
  { to: '/explore/earth', label: 'PLANETS', match: (path: string) => path.startsWith('/explore/') },
  { to: '/analysis', label: 'ANALYSIS', match: (path: string) => path.startsWith('/analysis') },
  { to: '/app/nasa', label: 'NASA', match: (path: string) => path.startsWith('/app/nasa') },
  {
    to: '/app',
    label: 'MISSIONS',
    match: (path: string) =>
      path === '/app' ||
      ['/missions', '/objectives', '/spacecraft', '/instruments', '/launch', '/resources', '/telemetry', '/events', '/achievements', '/archive'].some((item) => path.startsWith(`/app${item}`)),
  },
  { to: '/app/simulation', label: 'FLIGHT', match: (path: string) => path.startsWith('/app/simulation') },
  { to: '/app/games', label: 'GAMES', match: (path: string) => path.startsWith('/app/games') },
  { to: '/app/report', label: 'REPORTS', match: (path: string) => path.startsWith('/app/report') },
]

function playTone(frequency: number, duration = 0.06) {
  const Context = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Context) return
  const audio = new Context()
  const osc = audio.createOscillator()
  const gain = audio.createGain()
  osc.frequency.value = frequency
  gain.gain.setValueAtTime(0.05, audio.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration)
  osc.connect(gain)
  gain.connect(audio.destination)
  osc.start()
  osc.stop(audio.currentTime + duration)
  window.setTimeout(() => void audio.close(), duration * 1000 + 80)
}

export function CommandChrome({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [ping, setPing] = useState<number | null>(null)
  const [link, setLink] = useState<'checking' | 'nominal' | 'offline'>('checking')
  const [sound, setSound] = useState(false)

  useEffect(() => {
    const started = performance.now()
    let cancelled = false
    fetch('/api/health')
      .then((response) => {
        if (cancelled) return
        setPing(Math.round(performance.now() - started))
        setLink(response.ok ? 'nominal' : 'offline')
      })
      .catch(() => {
        if (!cancelled) setLink('offline')
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="relative flex min-h-screen flex-col bg-[#070913] text-[#e2e8f0]">
      <Starfield />
      <div className="bg-space-grid pointer-events-none fixed inset-0 -z-10" />
      <header className="sticky top-0 z-40 border-b border-cyan-950/70 bg-[#0b0e18]/88 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1720px] flex-wrap items-center gap-3 px-4 py-3 md:px-6">
          <Link to="/" className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-cyan-300 to-blue-600 text-[#070913] shadow-[0_0_18px_rgba(0,240,255,0.35)]">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                <path d="M12 2 2 7l10 5 10-5-10-5ZM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </span>
            <span>
              <span className="block font-display text-lg font-bold tracking-[0.18em] text-white">ORBITX <span className="text-[10px] font-normal tracking-[0.16em] text-cyan-300">// COMMAND</span></span>
              <span className="block font-mono text-[10px] tracking-[0.16em] text-slate-400">BEYOND EARTH · INTO THE UNKNOWN</span>
            </span>
          </Link>
          <div className="hidden items-center gap-2 rounded-full border border-cyan-800/50 bg-cyan-950/40 px-3 py-1.5 font-mono text-[11px] text-cyan-300 lg:flex">
            <span className="relative flex h-2 w-2">
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-70 ${link === 'nominal' ? 'animate-ping bg-cyan-300' : 'bg-amber-300'}`} />
              <span className={`relative h-2 w-2 rounded-full ${link === 'nominal' ? 'bg-cyan-300' : 'bg-amber-300'}`} />
            </span>
            API LINK: {link === 'nominal' ? 'NOMINAL' : link === 'offline' ? 'OFFLINE' : 'CHECKING'}
            <span className="text-slate-500">|</span>
            <span>{ping === null ? '—' : `${ping} MS`}</span>
          </div>
          <nav className="order-last flex w-full gap-1 overflow-x-auto rounded-full border border-slate-800/80 bg-[#111624]/90 p-1.5 xl:order-none xl:mx-auto xl:w-auto" aria-label="Primary">
            {NAV.map((item) => {
              const current = item.match(location.pathname)
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  aria-current={current ? 'page' : undefined}
                  className="nav-pill hover:text-cyan-300"
                  onClick={() => {
                    if (sound) playTone(720)
                  }}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
          <button
            type="button"
            onClick={() => {
              setSound((value) => !value)
              if (!sound) playTone(880, 0.08)
            }}
            className="ml-auto rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-[11px] text-slate-300 hover:border-cyan-300 hover:text-cyan-200"
          >
            SFX: {sound ? 'ACTIVE' : 'MUTED'}
          </button>
        </div>
      </header>
      <main className="relative mx-auto w-full max-w-[1720px] flex-1 px-4 py-6 md:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          <motion.div key={location.pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.28 }}>
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
      <footer className="border-t border-slate-900/80 bg-[#070910]/90 px-4 py-3 font-mono text-[11px] text-slate-500 md:px-6">
        <div className="mx-auto flex max-w-[1720px] flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <p>FRAME: HELIOCENTRIC ECLIPTIC · CENTER 500@10 · ICRF</p>
          <p className="text-emerald-400">PLANETARY EPHEMERIS PROVIDED BY NASA/JPL HORIZONS</p>
          <p>API PING: <span className="text-cyan-300">{ping === null ? '—' : `${ping} MS`}</span></p>
        </div>
      </footer>
    </div>
  )
}
