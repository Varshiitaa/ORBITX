import { useNavigate } from 'react-router-dom'
import { INSTRUMENTS, getObjective, instrumentsForObjective } from '../data/catalog'
import { useActiveMission } from '../hooks/useActiveMission'
import { designLocked, useMissionStore } from '../store/missionStore'
import { kg, usd, watts } from '../utils/format'
import { EmptyMission, IssueList, PageHeader, SpecRow } from '../components/ui'

export function InstrumentsPage() {
  const navigate = useNavigate()
  const { mission, metrics } = useActiveMission()
  const createMission = useMissionStore((state) => state.createMission)
  const updateActive = useMissionStore((state) => state.updateActive)
  if (!mission || !metrics) return <EmptyMission onCreate={() => { createMission(); navigate('/app/instruments') }} />
  const locked = designLocked(mission.status)
  const recommended = new Set(mission.objectiveIds.flatMap((id) => instrumentsForObjective(id).map((item) => item.id)))
  const issues = metrics.issues.filter((issue) => issue.step === 'instruments' || issue.code.startsWith('objective-') || issue.code === 'power-balance' || issue.code === 'mass')

  return (
    <div>
      <PageHeader
        kicker="Scientific instruments"
        title="Match the payload to the questions."
        description="Select every instrument you can afford to fly. An objective with none of its instruments stays blocked, and the payload adds mass, cost, and cruise power."
      />
      {locked ? <p className="mb-4 text-sm text-warn">Restart the simulation before changing the payload.</p> : null}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-3">
          {INSTRUMENTS.map((instrument) => {
            const selected = mission.instrumentIds.includes(instrument.id)
            return (
              <button
                key={instrument.id}
                type="button"
                disabled={locked}
                data-testid={instrument.id}
                onClick={() =>
                  updateActive((current) => ({
                    ...current,
                    instrumentIds: selected ? current.instrumentIds.filter((id) => id !== instrument.id) : [...current.instrumentIds, instrument.id],
                  }))
                }
                className={`w-full rounded-2xl border p-4 text-left disabled:cursor-not-allowed ${selected ? 'border-accent bg-space-900' : 'border-line'}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-lg">{instrument.name}</h2>
                  {recommended.has(instrument.id) ? <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-accent">Recommended</span> : null}
                  {selected ? <span className="ml-auto text-sm text-good">On the payload</span> : null}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-mute">{instrument.description}</p>
                <p className="mt-3 text-xs text-faint">
                  {usd(instrument.costUsd)} · {kg(instrument.massKg)} · {watts(instrument.drawsW)} · capability {instrument.capability}
                </p>
                <p className="mt-2 text-xs text-mute">
                  Supports {instrument.objectiveIds.map((id) => getObjective(id)?.name).filter(Boolean).join(', ')}
                </p>
              </button>
            )
          })}
        </div>
        <aside className="panel h-fit p-5 lg:sticky lg:top-24">
          <p className="kicker">Payload totals</p>
          <SpecRow label="Payload mass" value={kg(metrics.payloadMassKg)} />
          <SpecRow label="Instrument cost" value={usd(metrics.costs.instruments)} />
          <SpecRow label="Cruise power" value={watts(metrics.cruiseLoadW)} />
          <SpecRow label="Power balance" value={`${Math.round(metrics.powerBalanceW)} W`} tone={metrics.powerBalanceW < 0 ? 'bad' : 'good'} />
          <SpecRow label="Spacecraft mass" value={kg(metrics.totalMassKg)} />
          <SpecRow label="Budget remaining" value={usd(metrics.remainingBudgetUsd)} tone={metrics.remainingBudgetUsd < 0 ? 'bad' : 'ink'} />
          <div className="mt-4">
            <IssueList issues={issues} />
          </div>
        </aside>
      </div>
    </div>
  )
}
