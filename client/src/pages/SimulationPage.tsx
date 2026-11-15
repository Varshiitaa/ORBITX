import { useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Component } from 'react'
import type { ReactNode } from 'react'
import { getMission } from '../data/catalog'
import { buildPlan } from '../engine/simulation'
import { useActiveMission } from '../hooks/useActiveMission'
import { useMissionStore } from '../store/missionStore'
import { missionClock, percent } from '../utils/format'
import { Button, EmptyMission, IssueList, Meter, PageHeader } from '../components/ui'
import { MissionScene } from '../components/scene/MissionScene'
import { EventDecision } from '../components/EventDecision'
import { LiveEphemeris } from '../components/LiveEphemeris'

class ViewBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    if (this.state.failed) return <div className="grid h-full place-items-center text-sm text-mute">The 3D flight view could not start. The simulation itself is still running.</div>
    return this.props.children
  }
}

export function SimulationPage() {
  const navigate = useNavigate()
  const { mission, metrics } = useActiveMission()
  const createMission = useMissionStore((state) => state.createMission)
  const startSimulation = useMissionStore((state) => state.startSimulation)
  const pauseSimulation = useMissionStore((state) => state.pauseSimulation)
  const resumeSimulation = useMissionStore((state) => state.resumeSimulation)
  const restartSimulation = useMissionStore((state) => state.restartSimulation)
  const setSpeed = useMissionStore((state) => state.setSpeed)
  const logRef = useRef<HTMLDivElement>(null)
  const logLength = mission?.flight?.log.length ?? 0

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [logLength])

  if (!mission || !metrics) return <EmptyMission onCreate={() => { createMission(); navigate('/app/simulation') }} />
  const flight = mission.flight
  const errors = metrics.issues.filter((issue) => issue.level === 'error')
  const plan = flight?.plan ?? buildPlan(getMission(mission.destinationId)?.durationDays ?? 30)
  const stage = flight ? flight.plan[flight.stageIndex] : null
  const stageProgress = flight && stage && stage.durationHours > 0 ? Math.min(100, (flight.stageElapsedHours / stage.durationHours) * 100) : 0

  return (
    <div>
      <PageHeader
        kicker="Mission simulation"
        title="Start the clock."
        description="Time is compressed so a full flight takes about a minute and a half at 1×. Propellant, heat, power, and the link all come from the spacecraft you designed. The flight path is a simulated educational transfer. It is not a Horizons trajectory."
      />
      <LiveEphemeris destinationId={mission.destinationId} />
      {flight?.pending ? (
        <div className="mb-5">
          <EventDecision pending={flight.pending} />
        </div>
      ) : null}
      <div className="grid gap-5 xl:grid-cols-[240px_minmax(0,1fr)_280px]">
        <section className="panel p-4">
          <p className="kicker">Phases</p>
          <ol className="mt-3 space-y-2">
            {plan.map((item, index) => {
              const label = !flight ? 'ahead' : flight.finished && flight.outcome === 'success' ? 'done' : index < flight.stageIndex ? 'done' : index === flight.stageIndex ? 'now' : 'ahead'
              return (
                <li key={item.id} className="text-sm">
                  <span className={label === 'now' ? 'text-accent' : label === 'done' ? 'text-good' : 'text-faint'}>{item.title}</span>
                </li>
              )
            })}
          </ol>
        </section>
        <section className="overflow-hidden rounded-2xl border border-line bg-space-950">
          <div className="h-[420px]">
            <ViewBoundary>
              <MissionScene mission={mission} />
            </ViewBoundary>
          </div>
          <div className="border-t border-line px-4 py-3">
            <div className="flex items-center justify-between text-sm">
              <span>{stage?.title ?? 'Holding'}</span>
              <span className="num">{flight ? missionClock(flight.totalElapsedHours) : 'T+ 00:00'}</span>
            </div>
            <div className="mt-2"><Meter value={flight?.telemetry.progressPct ?? 0} /></div>
            <p className="mt-2 text-xs text-faint">Phase progress {Math.round(stageProgress)}% · Mission {percent(flight?.telemetry.progressPct ?? 0)}</p>
          </div>
        </section>
        <section className="panel flex h-[520px] flex-col p-4">
          <p className="kicker">Mission log</p>
          <div ref={logRef} className="mt-3 flex-1 space-y-3 overflow-y-auto pr-1">
            {(flight?.log ?? []).map((entry) => (
              <p key={entry.id} className="text-sm">
                <span className="font-mono text-[10px] text-faint">{entry.stamp}</span>
                <span className={`mt-1 block ${entry.tone === 'bad' ? 'text-bad' : entry.tone === 'warn' ? 'text-warn' : 'text-mute'}`}>{entry.message}</span>
              </p>
            ))}
            {!flight ? <p className="text-sm text-mute">The log starts with the pre-launch check.</p> : null}
          </div>
        </section>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        {mission.status !== 'running' && mission.status !== 'paused' ? (
          <Button data-testid="start-simulation" disabled={!metrics.ready} onClick={() => startSimulation()}>
            {mission.report ? 'Run again' : 'Start mission'}
          </Button>
        ) : null}
        {mission.status === 'running' ? <Button data-testid="pause-simulation" variant="secondary" onClick={pauseSimulation}>Pause</Button> : null}
        {mission.status === 'paused' ? <Button onClick={resumeSimulation}>Resume</Button> : null}
        {flight ? <Button variant="secondary" onClick={restartSimulation}>Restart</Button> : null}
        <div className="flex rounded-full border border-line p-1">
          {[1, 2, 4].map((speed) => (
            <button
              key={speed}
              type="button"
              disabled={!flight || flight.finished}
              onClick={() => setSpeed(speed as 1 | 2 | 4)}
              className={`rounded-full px-3 py-1 text-xs ${flight?.speed === speed ? 'bg-space-800 text-ink' : 'text-mute'} disabled:text-faint`}
            >
              {speed}×
            </button>
          ))}
        </div>
        <span className="text-sm text-mute">
          Status: {mission.status}
          {flight?.outcome ? ` · ${flight.outcome}` : ''}
        </span>
        {flight?.finished ? (
          <Link to="/app/report" className="text-sm text-accent">Open the mission report</Link>
        ) : null}
      </div>
      {!metrics.ready ? (
        <section className="panel mt-5 p-5">
          <p className="kicker">Launch is blocked</p>
          <div className="mt-3">
            <IssueList issues={errors} />
          </div>
        </section>
      ) : null}
      {flight ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Mini label="Fuel" value={`${Math.max(0, Math.round(flight.telemetry.fuelKg)).toLocaleString('en-US')} kg`} width={metrics.tankPropellantKg > 0 ? (Math.max(0, flight.telemetry.fuelKg) / metrics.tankPropellantKg) * 100 : 0} />
          <Mini label="Health" value={`${Math.round(flight.telemetry.health)}`} width={flight.telemetry.health} />
          <Mini label="Battery" value={`${Math.round(flight.telemetry.batteryPct)}%`} width={flight.telemetry.batteryPct} />
        </div>
      ) : null}
    </div>
  )
}

function Mini({ label, value, width }: { label: string; value: string; width: number }) {
  return (
    <div className="panel p-3">
      <p className="kicker">{label}</p>
      <p className="num mt-1">{value}</p>
      <div className="mt-2"><Meter value={width} /></div>
    </div>
  )
}
