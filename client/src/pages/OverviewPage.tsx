import { Link, useNavigate } from 'react-router-dom'
import { getMission, getObjective } from '../data/catalog'
import { buildPlan } from '../engine/simulation'
import { DIFFICULTY } from '../engine/constants'
import { useActiveMission } from '../hooks/useActiveMission'
import { useMissionStore } from '../store/missionStore'
import { kg, missionClock, percent, signedWatts, usd, watts } from '../utils/format'
import { EmptyMission, PageHeader, SpecRow } from '../components/ui'

export function OverviewPage() {
  const navigate = useNavigate()
  const createMission = useMissionStore((state) => state.createMission)
  const { mission, metrics } = useActiveMission()
  if (!mission || !metrics) {
    return <EmptyMission onCreate={() => { createMission(); navigate('/app/missions') }} />
  }
  const destination = getMission(mission.destinationId)
  const plan = mission.flight?.plan ?? buildPlan(destination?.durationDays ?? 30)
  const stageIndex = mission.flight?.stageIndex ?? -1
  const checks = [
    ['Destination', Boolean(mission.destinationId), '/app/missions'],
    ['Objectives', mission.objectiveIds.length > 0, '/app/objectives'],
    ['Spacecraft', Object.values(mission.spacecraft).every(Boolean), '/app/spacecraft'],
    ['Instruments', mission.instrumentIds.length > 0, '/app/instruments'],
    ['Launcher fits', Boolean(mission.launchVehicleId) && !metrics.issues.some((issue) => issue.code === 'mass' || issue.code === 'launcher'), '/app/launch'],
    ['Ready to fly', metrics.ready, '/app/resources'],
  ] as const

  return (
    <div>
      <PageHeader
        kicker="Mission planner"
        title={mission.name}
        description={destination?.narrative ?? 'Choose a destination to give this mission a trajectory, a budget, and a thermal environment.'}
        actions={
          <Link to="/app/simulation" className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-space-950">
            {mission.status === 'running' ? 'Return to simulation' : 'Open simulation'}
          </Link>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.7fr)]">
        <div className="space-y-6">
          <section className="panel p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="kicker">Active mission</p>
                <h2 className="mt-2 font-display text-2xl">{destination?.name ?? 'Destination open'}</h2>
              </div>
              <p className="text-sm text-mute">
                {mission.status} · {DIFFICULTY[mission.difficulty].label}
              </p>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-mute">{destination?.summary ?? 'The rest of the console is waiting on a destination.'}</p>
            <ol className="mt-6 grid gap-2 sm:grid-cols-2">
              {checks.map(([label, done, to]) => (
                <li key={label}>
                  <Link to={to} className="flex items-center justify-between rounded-xl border border-line px-3 py-2 text-sm">
                    <span>{label}</span>
                    <span className={done ? 'text-good' : 'text-faint'}>{done ? 'Set' : 'Open'}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
          <section className="panel p-5">
            <p className="kicker">Mission timeline</p>
            <ol className="mt-4 space-y-3">
              {plan.map((stage, index) => {
                const finished = mission.flight?.finished ?? false
                const succeeded = finished && mission.flight?.outcome === 'success'
                const state = stageIndex < 0 ? 'pending' : succeeded || index < stageIndex ? 'done' : index === stageIndex ? (finished ? 'stopped' : 'now') : 'pending'
                return (
                  <li key={stage.id} className="grid grid-cols-[88px_1fr] gap-3 text-sm">
                    <span className={`font-mono text-[11px] uppercase tracking-[0.14em] ${state === 'now' ? 'text-accent' : state === 'stopped' ? 'text-bad' : 'text-faint'}`}>
                      {state === 'done' ? 'Complete' : state === 'now' ? 'In progress' : state === 'stopped' ? 'Stopped' : 'Ahead'}
                    </span>
                    <span>
                      <span className="block text-ink">{stage.title}</span>
                      <span className="block text-mute">{stage.summary}</span>
                    </span>
                  </li>
                )
              })}
            </ol>
          </section>
          <section className="panel p-5">
            <p className="kicker">Scientific objectives</p>
            <ul className="mt-4 space-y-3">
              {mission.objectiveIds.length === 0 ? <li className="text-sm text-mute">No objectives selected.</li> : null}
              {mission.objectiveIds.map((id) => {
                const objective = getObjective(id)
                const covered = metrics.coveredObjectiveIds.includes(id)
                const reported = mission.report?.objectives.find((item) => item.id === id)
                return (
                  <li key={id} className="flex items-start justify-between gap-4 text-sm">
                    <span>
                      <span className="block">{objective?.name}</span>
                      <span className="text-mute">{objective?.description}</span>
                    </span>
                    <span className={covered ? 'text-good' : 'text-bad'}>{reported?.status ?? (covered ? 'Instrument assigned' : 'Needs an instrument')}</span>
                  </li>
                )
              })}
            </ul>
          </section>
        </div>
        <div className="space-y-6">
          <section className="panel p-5">
            <p className="kicker">Resources</p>
            <div className="mt-2">
              <SpecRow label="Total budget" value={usd(metrics.budgetUsd)} />
              <SpecRow label="Budget remaining" value={usd(metrics.remainingBudgetUsd)} tone={metrics.remainingBudgetUsd < 0 ? 'bad' : 'ink'} />
              <SpecRow label="Spacecraft mass" value={kg(metrics.totalMassKg)} />
              <SpecRow label="Available power" value={watts(metrics.powerGeneratedW)} />
              <SpecRow label="Cruise load" value={watts(metrics.cruiseLoadW)} />
              <SpecRow label="Power balance" value={signedWatts(metrics.powerBalanceW)} tone={metrics.powerBalanceW < 0 ? 'bad' : 'good'} />
              <SpecRow label="Fuel load" value={kg(metrics.tankPropellantKg)} />
              <SpecRow label="Mission progress" value={mission.flight ? percent(mission.flight.telemetry.progressPct) : 'Not started'} />
            </div>
            {mission.flight ? <p className="mt-4 text-xs text-faint">Simulated clock {missionClock(mission.flight.totalElapsedHours)}</p> : null}
          </section>
          <section className="panel p-5">
            <p className="kicker">Recent mission events</p>
            <ul className="mt-4 space-y-3">
              {(mission.flight?.log ?? []).slice(-5).reverse().map((entry) => (
                <li key={entry.id} className="text-sm">
                  <span className="font-mono text-[11px] text-faint">{entry.stamp}</span>
                  <span className="mt-1 block text-mute">{entry.message}</span>
                </li>
              ))}
              {!mission.flight ? <li className="text-sm text-mute">Events appear once the simulation is running.</li> : null}
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
