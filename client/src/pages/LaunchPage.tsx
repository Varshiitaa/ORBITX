import { Link, useNavigate } from 'react-router-dom'
import { LAUNCH_VEHICLES } from '../data/catalog'
import { useActiveMission } from '../hooks/useActiveMission'
import { designLocked, useMissionStore } from '../store/missionStore'
import { kg, usd } from '../utils/format'
import { Button, EmptyMission, PageHeader } from '../components/ui'

export function LaunchPage() {
  const navigate = useNavigate()
  const { mission, metrics } = useActiveMission()
  const createMission = useMissionStore((state) => state.createMission)
  const updateActive = useMissionStore((state) => state.updateActive)
  if (!mission || !metrics) return <EmptyMission onCreate={() => { createMission(); navigate('/app/launch') }} />
  const locked = designLocked(mission.status)
  const selected = LAUNCH_VEHICLES.find((vehicle) => vehicle.id === mission.launchVehicleId) ?? null
  const selectedFits = Boolean(selected && metrics.totalMassKg <= selected.maxPayloadKg)

  return (
    <div>
      <PageHeader
        kicker="Launch vehicle"
        title="Only fly what the rocket can lift."
        description="ORBIT-X vehicles are fictional designs for this educational simulation. They are not NASA launchers, and their payload limits are hard stops."
      />
      <div className="mb-4 rounded-2xl border border-line bg-space-900/70 px-4 py-3 text-sm text-mute">
        Current spacecraft mass is <span className="num text-ink">{kg(metrics.totalMassKg)}</span>, including propellant. Continue is available only when the selected vehicle can carry that stack.
      </div>
      <div className="grid gap-4">
        {LAUNCH_VEHICLES.map((vehicle) => {
          const active = mission.launchVehicleId === vehicle.id
          const margin = vehicle.maxPayloadKg - metrics.totalMassKg
          const fits = margin >= 0
          return (
            <button
              key={vehicle.id}
              type="button"
              disabled={locked}
              data-testid={vehicle.id}
              onClick={() => updateActive((current) => ({ ...current, launchVehicleId: vehicle.id }))}
              className={`rounded-2xl border p-5 text-left disabled:cursor-not-allowed ${active ? 'border-accent bg-space-900' : 'border-line'}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl">{vehicle.name}</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-mute">{vehicle.description}</p>
                </div>
                <span className={`font-mono text-xs uppercase tracking-[0.14em] ${fits ? 'text-good' : 'text-bad'}`}>
                  {fits ? `Fits with ${kg(margin)} margin` : `Over by ${kg(-margin)}`}
                </span>
              </div>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                <div><dt className="text-faint">Launch cost</dt><dd className="num">{usd(vehicle.costUsd)}</dd></div>
                <div><dt className="text-faint">Maximum payload</dt><dd className="num">{kg(vehicle.maxPayloadKg)}</dd></div>
                <div><dt className="text-faint">Suitability</dt><dd>{vehicle.suitability}</dd></div>
              </dl>
              <p className="mt-3 text-xs text-faint">{vehicle.note}</p>
            </button>
          )
        })}
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <Button disabled={!selectedFits || locked} onClick={() => navigate('/app/resources')}>
          Continue to resources
        </Button>
        {!selected ? <p className="text-sm text-mute">Select a launch vehicle to continue.</p> : null}
        {selected && !selectedFits ? (
          <p className="text-sm text-bad">
            {selected.name} cannot lift this spacecraft. Remove mass or choose a larger fictional vehicle.{' '}
            <Link to="/app/spacecraft" className="text-accent">Edit the spacecraft</Link>
          </p>
        ) : null}
      </div>
    </div>
  )
}
