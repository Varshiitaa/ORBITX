import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { getMission } from '../../data/catalog'
import { useActiveMission } from '../../hooks/useActiveMission'
import { useMissionStore } from '../../store/missionStore'
import { usd } from '../../utils/format'
import { EventDecision } from '../EventDecision'

const DESIGN = [
  ['/app/missions', 'Destination'],
  ['/app/objectives', 'Objectives'],
  ['/app/spacecraft', 'Spacecraft'],
  ['/app/instruments', 'Instruments'],
  ['/app/launch', 'Launcher'],
  ['/app/resources', 'Resources'],
  ['/app/telemetry', 'Telemetry'],
  ['/app/events', 'Events'],
  ['/app/achievements', 'Achievements'],
  ['/app/archive', 'Saved'],
  ['/app/methodology', 'Methodology'],
]

export function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const { mission, metrics } = useActiveMission()
  const sync = useMissionStore((state) => state.sync)
  const createMission = useMissionStore((state) => state.createMission)
  const destination = getMission(mission?.destinationId ?? null)
  const errors = metrics?.issues.filter((issue) => issue.level === 'error').length ?? 0
  const syncLabel = sync === 'database' ? 'Saved on this device and in the database' : sync === 'offline' ? 'Saved on this device · database offline' : 'Saved on this device'

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg text-white">{mission?.name ?? 'No active mission'}</p>
          <p className="truncate font-mono text-[11px] text-slate-400">
            {destination ? destination.destination : 'Destination not chosen'}
            {mission ? ` · ${mission.difficulty}` : ''}
            {mission?.status === 'running' || mission?.status === 'paused' ? ` · ${mission.status}` : ''}
            {` · ${syncLabel}`}
          </p>
        </div>
        <p className="num text-sm text-cyan-200">{metrics ? usd(metrics.remainingBudgetUsd) : '—'}</p>
        <button
          type="button"
          onClick={() => {
            createMission()
            navigate('/app/missions')
          }}
          className="rounded-full border border-cyan-800/60 px-3 py-1.5 text-xs text-cyan-200 hover:border-cyan-300"
        >
          New mission
        </button>
      </div>
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {DESIGN.map(([to, label]) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-pill border ${isActive ? '' : 'border-slate-800 bg-[#111624]/80 hover:border-cyan-400/40'}`}
          >
            {label}
            {to === '/app/resources' && errors > 0 ? ` ${errors}` : ''}
            {to === '/app/events' && mission?.flight?.pending ? ' ●' : ''}
          </NavLink>
        ))}
      </div>
      {mission?.flight?.pending && location.pathname !== '/app/events' && location.pathname !== '/app/simulation' ? (
        <div className="mb-6">
          <EventDecision pending={mission.flight.pending} />
        </div>
      ) : null}
      <Outlet />
    </div>
  )
}
