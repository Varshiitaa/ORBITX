import { MISSIONS } from '../data/catalog'

const PLANET_SWATCH: Record<string, string> = {
  earth: 'radial-gradient(circle at 35% 35%, #d5e6fb, #1d4e89 55%, #0c1a30)',
  lunar: 'radial-gradient(circle at 35% 35%, #f4f7fb, #9aa8bd 50%, #3d4654)',
  mars: 'radial-gradient(circle at 35% 35%, #f0c2ae, #b5533a 55%, #4a221c)',
  venus: 'radial-gradient(circle at 35% 35%, #f3e2b0, #c4a15a 55%, #5c4a28)',
  jupiter: 'radial-gradient(circle at 35% 35%, #f0ddc4, #c48b62 42%, #8d5a3c 70%, #d7c4a4)',
  asteroid: 'radial-gradient(circle at 35% 35%, #d5dbe3, #6d7888 60%, #2c333c)',
}
import { DIFFICULTY } from '../engine/constants'
import { useActiveMission } from '../hooks/useActiveMission'
import { DIFFICULTY_ORDER, useMissionStore } from '../store/missionStore'
import { daysLabel, km, usd } from '../utils/format'
import { EmptyMission, PageHeader } from '../components/ui'
import { useNavigate } from 'react-router-dom'

export function MissionSelectPage() {
  const navigate = useNavigate()
  const { mission } = useActiveMission()
  const createMission = useMissionStore((state) => state.createMission)
  const updateActive = useMissionStore((state) => state.updateActive)
  if (!mission) return <EmptyMission onCreate={() => { createMission(); navigate('/app/missions') }} />

  const selected = MISSIONS.find((item) => item.id === mission.destinationId) ?? null
  const budget = selected ? selected.baseBudgetUsd * DIFFICULTY[mission.difficulty].budget : 0
  const sunlight = selected ? Math.round(100 / selected.distanceAu ** 2) : 0

  return (
    <div>
      <PageHeader
        kicker="Mission selection"
        title="Where is this spacecraft going?"
        description="Choosing a destination updates the budget, delta-v, sunlight, thermal stress, and the recommended science. The rest of the console recalculates from that choice."
      />
      <label className="mb-6 block max-w-md text-sm text-mute">
        Mission name
        <input
          value={mission.name}
          maxLength={64}
          onChange={(event) => updateActive((current) => ({ ...current, name: event.target.value }))}
          className="mt-2 w-full rounded-xl border border-line bg-space-950 px-3 py-2 text-ink"
        />
      </label>
      <div className="mb-6 flex flex-wrap gap-2">
        {DIFFICULTY_ORDER.map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => updateActive((current) => ({ ...current, difficulty: level }))}
            className={`rounded-full border px-4 py-1.5 text-sm ${mission.difficulty === level ? 'border-accent text-ink' : 'border-line text-mute'}`}
          >
            {DIFFICULTY[level].label}
          </button>
        ))}
        <p className="w-full text-sm text-faint">{DIFFICULTY[mission.difficulty].summary}</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3">
          {MISSIONS.map((item) => {
            const active = mission.destinationId === item.id
            return (
              <button
                key={item.id}
                type="button"
                data-testid={`destination-${item.id}`}
                onClick={() => updateActive((current) => ({ ...current, destinationId: item.id }))}
                className={`block w-full rounded-2xl border p-4 text-left ${active ? 'border-accent bg-space-900' : 'border-line bg-space-900/50'}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-3">
                    <span className="mt-1 h-10 w-10 shrink-0 rounded-full border border-line" style={{ background: PLANET_SWATCH[item.id] }} aria-hidden />
                    <div>
                    <h2 className="font-display text-xl">{item.name}</h2>
                    <p className="mt-1 text-sm text-mute">{item.summary}</p>
                    </div>
                  </div>
                  <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">{item.recommendedDifficulty}</span>
                </div>
                <p className="mt-3 text-xs text-faint">
                  {item.distanceLabel} · {daysLabel(item.durationDays)} · Δv {item.deltaV.toLocaleString('en-US')} m/s
                </p>
              </button>
            )
          })}
        </div>
        <aside className="panel h-fit p-5 lg:sticky lg:top-24">
          {selected ? (
            <>
              <p className="kicker">{selected.destination}</p>
              <h2 className="mt-2 font-display text-2xl">{selected.name}</h2>
              <p className="mt-3 text-sm leading-relaxed text-mute">{selected.narrative}</p>
              <dl className="mt-5 space-y-2 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-mute">Distance</dt><dd className="num">{km(selected.distanceKm)}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-mute">Duration</dt><dd className="num">{daysLabel(selected.durationDays)}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-mute">Delta-v</dt><dd className="num">{selected.deltaV.toLocaleString('en-US')} m/s</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-mute">Sunlight</dt><dd className="num">{sunlight}% of Earth</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-mute">Importance</dt><dd>{selected.scientificImportance}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-mute">Budget at this difficulty</dt><dd className="num">{usd(budget)}</dd></div>
              </dl>
              <p className="mt-4 text-sm text-mute">{selected.importanceNote}</p>
              <h3 className="mt-5 font-display text-lg">Engineering constraints</h3>
              <ul className="mt-2 space-y-2 text-sm text-mute">
                {selected.constraints.map((constraint) => (
                  <li key={constraint}>{constraint}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-mute">Select a destination. The budget, propellant, and power pages will update from it.</p>
          )}
        </aside>
      </div>
    </div>
  )
}
