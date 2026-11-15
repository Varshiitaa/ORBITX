import { useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getMission } from '../data/catalog'
import { useSpaceCatalog } from '../hooks/useSpaceCatalog'
import { useActiveMission } from '../hooks/useActiveMission'
import { useMissionStore } from '../store/missionStore'
import { km } from '../utils/format'

export function LandingPage() {
  const navigate = useNavigate()
  const ensureDraft = useMissionStore((state) => state.ensureDraft)
  const missionCount = useMissionStore((state) => state.missions.length)
  const { mission, metrics } = useActiveMission()
  const { catalog } = useSpaceCatalog()
  const earth = catalog?.bodies.find((body) => body.body === 'earth')
  const destination = getMission(mission?.destinationId ?? null)
  const tilt = useRef<HTMLDivElement>(null)
  const drag = useRef({ active: false, x: 0, y: 0, rx: 12, ry: -18 })

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    drag.current.active = true
    drag.current.x = event.clientX
    drag.current.y = event.clientY
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current.active || !tilt.current) return
    drag.current.ry += (event.clientX - drag.current.x) * 0.22
    drag.current.rx -= (event.clientY - drag.current.y) * 0.22
    drag.current.rx = Math.max(-32, Math.min(32, drag.current.rx))
    drag.current.x = event.clientX
    drag.current.y = event.clientY
    tilt.current.style.transform = `perspective(1000px) rotateX(${drag.current.rx}deg) rotateY(${drag.current.ry}deg)`
  }

  const openMissions = () => {
    ensureDraft()
    navigate('/app/missions')
  }

  return (
    <div className="space-y-8">
      <div className="grid items-center gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-800/50 bg-cyan-950/50 px-3 py-1 font-mono text-xs text-cyan-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300" />
            SYSTEM STATUS // {catalog ? 'EPHEMERIS LOCKED' : 'CONTACTING HORIZONS'}
          </div>
          <h1 className="font-display text-5xl font-black uppercase leading-[0.92] tracking-tight text-white md:text-7xl">
            Design.
            <br />
            <span className="text-glow text-cyan-300">Launch.</span>
            <br />
            <span className="text-emerald-300" style={{ textShadow: '0 0 14px rgba(52,211,153,0.45)' }}>Command.</span>
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-slate-300 md:text-lg">
            Build spacecraft, plot orbital trajectories, survive deep space crises, and lead your orbital agency to the bleeding edge of the solar system.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <button type="button" onClick={openMissions} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-300 to-cyan-400 px-7 py-3.5 text-sm font-bold tracking-wider text-slate-950 shadow-[0_0_24px_rgba(0,240,255,0.4)] transition hover:-translate-y-0.5">
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
              LAUNCH MISSION
            </button>
            <Link to="/explore" className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-7 py-3.5 text-sm font-semibold text-white transition hover:border-cyan-300">
              VIEW STAR MAP +
            </Link>
          </div>
        </div>
        <div className="flex items-center justify-center lg:col-span-6">
          <div
            ref={tilt}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={() => {
              drag.current.active = false
            }}
            className="relative aspect-square w-full max-w-[460px] cursor-grab active:cursor-grabbing"
            style={{ transform: 'perspective(1000px) rotateX(12deg) rotateY(-18deg)' }}
          >
            <div className="absolute -top-2 right-4 z-10 rounded-lg border border-cyan-400/50 bg-[#0d1222]/90 px-4 py-2 font-mono shadow-xl backdrop-blur">
              <p className="text-[10px] text-cyan-300">TARGET // {destination?.destination?.toUpperCase() ?? 'EARTH'}</p>
              <p className="text-base font-bold tracking-wider text-white">{earth?.name ?? 'EARTH'}</p>
              <p className="text-[11px] text-slate-400">DISTANCE: <span className="font-bold text-cyan-200">{earth ? km(earth.rangeKm).toUpperCase() : 'LOCKING'}</span></p>
            </div>
            <div className="orbit-spin pointer-events-none absolute inset-0 scale-110 rounded-full border border-cyan-400/25" />
            <div className="pointer-events-none absolute inset-6 rounded-full border border-dashed border-cyan-300/30" />
            <div className="pointer-events-none absolute -inset-4 rounded-full border border-cyan-400/10" />
            <div className="absolute inset-[14%] overflow-hidden rounded-full border-2 border-cyan-400/40 shadow-[0_0_80px_rgba(0,240,255,0.28)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_30%,#1d4e89_0%,#0b3a66_42%,#062033_78%)]" />
              <div className="absolute left-[18%] top-[30%] h-10 w-16 rounded-full bg-emerald-800/70 blur-[1px]" />
              <div className="absolute bottom-[22%] right-[16%] h-8 w-20 rounded-full bg-emerald-900/80" />
              <div className="absolute inset-0 bg-gradient-to-tr from-cyan-300/25 via-transparent to-blue-950/40 mix-blend-screen" />
              <div className="absolute inset-0 shadow-[inset_0_0_50px_rgba(0,0,0,0.75)]" />
            </div>
            <p className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-cyan-900/70 bg-slate-950/80 px-3 py-1 font-mono text-[10px] text-cyan-300/80">
              DRAG TO TILT 3D PERSPECTIVE
            </p>
          </div>
          <div className="ml-3 hidden flex-col gap-4 rounded-2xl border border-slate-800/80 bg-[#0e1322]/80 p-3.5 backdrop-blur sm:flex">
            {[
              [String(missionCount).padStart(2, '0'), 'SAVED MISSIONS'],
              ['10', 'BODIES MAPPED'],
              [earth ? earth.speedKmS.toFixed(1) : '—', 'EARTH KM/S'],
            ].map(([value, label]) => (
              <div key={label} className="text-center">
                <div className="text-xl font-black text-white">{value}</div>
                <div className="font-mono text-[9px] tracking-wider text-slate-400">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Link to="/app/spacecraft" className="hud-card block overflow-hidden p-4">
          <div className="mb-3 flex items-center justify-between font-mono text-xs text-cyan-300">
            <span>FLEET STATUS // SPACECRAFT</span>
            <span className="text-slate-400">{metrics?.ready ? 'READY' : 'OPEN'}</span>
          </div>
          <div className="relative flex h-36 items-center justify-center overflow-hidden rounded-lg border border-cyan-950 bg-slate-950/70">
            <div className="h-3 w-40 rounded-full bg-slate-300/80" />
            <div className="absolute h-8 w-14 rounded-md bg-cyan-200/90" />
            <div className="absolute h-px w-56 bg-cyan-100/70" />
            <div className="cad-scanline pointer-events-none absolute left-0 right-0 h-0.5 bg-cyan-300 shadow-[0_0_8px_#00f0ff]" />
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-white">{mission?.name ?? 'NO ACTIVE CRAFT'}</p>
              <p className="font-mono text-[10px] text-slate-400">OPEN THE BUILDER</p>
            </div>
            <span className={`rounded border px-2 py-0.5 font-mono text-[10px] ${metrics?.ready ? 'border-emerald-700/60 bg-emerald-950/60 text-emerald-300' : 'border-amber-700/50 bg-amber-950/40 text-amber-300'}`}>
              {metrics?.ready ? 'READY' : 'DRAFT'}
            </span>
          </div>
        </Link>

        <button type="button" onClick={openMissions} className="hud-card p-4 text-left">
          <div className="mb-3 flex items-center justify-between font-mono text-xs text-cyan-300">
            <span>NEXT MISSION</span>
            <span>{destination?.name.toUpperCase() ?? 'UNASSIGNED'}</span>
          </div>
          <div className="relative flex h-36 items-end overflow-hidden rounded-lg border border-slate-800 bg-[radial-gradient(circle_at_50%_40%,#d5dde8,#5d6774_42%,#12151c_70%)]">
            <p className="relative z-10 p-3 text-lg font-bold uppercase text-white">{destination?.destination ?? 'Choose a world'}</p>
          </div>
          <p className="mt-3 flex justify-between font-mono text-xs text-slate-400">
            <span>{mission?.difficulty?.toUpperCase() ?? 'NO BRIEF'}</span>
            <span className="text-cyan-300">{destination ? `${destination.durationDays} DAYS` : 'OPEN'}</span>
          </p>
        </button>

        <Link to="/explore" className="hud-card block p-4">
          <div className="mb-2 flex items-center justify-between font-mono text-xs text-cyan-300">
            <span>SYSTEM SCAN</span>
            <span className="text-emerald-300">{catalog ? 'LIVE' : 'WAITING'}</span>
          </div>
          <div className="relative flex h-36 items-center justify-center overflow-hidden rounded-lg border border-cyan-900/40 bg-[#070b14]">
            <div className="absolute h-28 w-28 rounded-full border border-cyan-400/20" />
            <div className="absolute h-20 w-20 rounded-full border border-cyan-400/20" />
            <div className="absolute h-10 w-10 rounded-full border border-cyan-400/25" />
            <div className="absolute h-px w-full bg-cyan-400/15" />
            <div className="absolute h-full w-px bg-cyan-400/15" />
            <div className="radar-beam absolute inset-0 bg-[conic-gradient(from_0deg,rgba(0,240,255,0.28),transparent_28%)]" />
          </div>
          <div className="mt-3 flex items-center justify-between font-mono text-xs">
            <span className="text-2xl font-black text-cyan-300">{catalog?.bodies.length ?? '—'}</span>
            <span className="text-slate-400">HORIZONS BODIES</span>
          </div>
        </Link>

        <Link to="/app/simulation" className="hud-card block p-4">
          <div className="mb-3 flex items-center justify-between font-mono text-xs text-cyan-300">
            <span>MISSION TIMELINE</span>
            <span className="rounded border border-cyan-800 bg-cyan-950 px-2 py-0.5 text-[10px]">{mission?.status?.toUpperCase() ?? 'HOLD'}</span>
          </div>
          <ul className="space-y-3 font-mono text-xs">
            {[
              ['Design checks', metrics?.ready ? 'COMPLETE' : 'OPEN'],
              ['Flight clock', mission?.status === 'running' ? 'IN PROGRESS' : 'STANDBY'],
              ['Report', mission?.report ? 'FILED' : 'PENDING'],
            ].map(([label, state]) => (
              <li key={label} className="flex items-center justify-between border-b border-slate-800 pb-2 last:border-0">
                <span className="text-slate-200">{label}</span>
                <span className={state === 'COMPLETE' || state === 'FILED' ? 'text-emerald-300' : state === 'IN PROGRESS' ? 'text-cyan-300' : 'text-slate-500'}>{state}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 font-mono text-[11px] text-cyan-300">OPEN FLIGHT DECK →</p>
        </Link>
      </div>
    </div>
  )
}
