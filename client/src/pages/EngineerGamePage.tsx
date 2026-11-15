import { useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Link } from 'react-router-dom'
import { COMPONENTS, INSTRUMENTS, LAUNCH_VEHICLES, componentsByCategory } from '../data/catalog'
import { computeMetrics } from '../engine/calculations'
import { Button, PageHeader } from '../components/ui'
import { SpacecraftModel } from '../components/scene/SpacecraftModel'
import { DifficultyPicker, ScoreGrid } from '../games/GameChrome'
import { ENGINEER_BRIEFS, blankEngineerCraft, engineerMission, scoreEngineer } from '../games/engineer'
import { writeGameResult } from '../games/history'
import { designLocked, useMissionStore } from '../store/missionStore'
import type { ComponentCategory, Difficulty, SpacecraftSelection } from '../types'
import { kg, signedWatts, usd } from '../utils/format'

const CATEGORIES: ComponentCategory[] = ['structure', 'propulsion', 'power', 'communication', 'thermal', 'storage']

export function EngineerGamePage() {
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner')
  const [category, setCategory] = useState<ComponentCategory>('structure')
  const [spacecraft, setSpacecraft] = useState<SpacecraftSelection>(blankEngineerCraft)
  const [instrumentIds, setInstrumentIds] = useState<string[]>([])
  const [launchVehicleId, setLaunchVehicleId] = useState<string | null>(null)
  const [locked, setLocked] = useState(false)
  const [notice, setNotice] = useState('')
  const recorded = useRef(false)
  const brief = ENGINEER_BRIEFS[difficulty]
  const mission = useMemo(
    () => engineerMission({ difficulty, spacecraft, instrumentIds, launchVehicleId }),
    [difficulty, spacecraft, instrumentIds, launchVehicleId],
  )
  const metrics = useMemo(() => computeMetrics(mission), [mission])
  const score = scoreEngineer(mission)
  const updateActive = useMissionStore((state) => state.updateActive)
  const createMission = useMissionStore((state) => state.createMission)

  function reset(next: Difficulty = difficulty) {
    recorded.current = false
    setDifficulty(next)
    setSpacecraft(blankEngineerCraft())
    setInstrumentIds([])
    setLaunchVehicleId(null)
    setLocked(false)
    setNotice('')
  }

  function finish() {
    setLocked(true)
    if (recorded.current) return
    recorded.current = true
    writeGameResult({
      game: 'engineer',
      difficulty,
      won: score.won,
      score: score.total,
      summary: score.won ? `${brief.title} is mission-ready.` : `${score.errors} engineering error${score.errors === 1 ? '' : 's'} still open.`,
      science: score.science,
    })
  }

  function applyDesign() {
    const state = useMissionStore.getState()
    if (!state.activeMissionId) createMission()
    const active = useMissionStore.getState().missions.find((item) => item.id === useMissionStore.getState().activeMissionId)
    if (active && designLocked(active.status)) {
      setNotice('The active mission is in flight. Restart that simulation before applying this design.')
      return
    }
    updateActive((current) => ({
      ...current,
      difficulty,
      destinationId: brief.destinationId,
      objectiveIds: brief.objectiveIds,
      spacecraft,
      instrumentIds,
      launchVehicleId,
      status: 'draft',
      flight: null,
      report: null,
    }))
    setNotice('Applied to the active mission. The flight report was cleared because the design changed.')
  }

  return (
    <div>
      <PageHeader
        kicker="Spacecraft Engineer"
        title={brief.title}
        description={`${brief.requirement} Totals use the same mission engine as the main console. This game does not change that mission unless you apply the design.`}
        actions={<Link to="/app/games" className="text-sm text-accent">All games</Link>}
      />
      <div className="mb-4">
        <DifficultyPicker value={difficulty} disabled={locked} onChange={reset} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div className="flex gap-2 overflow-x-auto">
            {CATEGORIES.map((item) => (
              <button key={item} type="button" onClick={() => setCategory(item)} className={`shrink-0 rounded-full border px-3 py-1.5 text-sm capitalize ${category === item ? 'border-accent text-ink' : 'border-line text-mute'}`}>
                {item}
              </button>
            ))}
          </div>
          <div className="grid gap-2">
            {componentsByCategory(category).map((option) => {
              const active = spacecraft[category] === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={locked}
                  title={option.description}
                  onClick={() => setSpacecraft((current) => ({ ...current, [category]: option.id }))}
                  className={`rounded-2xl border p-3 text-left disabled:opacity-70 ${active ? 'border-accent bg-space-900' : 'border-line'}`}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-display text-lg">{option.name}</span>
                    <span className="num text-xs">{usd(option.costUsd)}</span>
                  </span>
                  <span className="mt-1 block text-xs text-faint">{kg(option.massKg)}{option.generatesW ? ` · ${option.generatesW} W at Earth` : ''}</span>
                </button>
              )
            })}
          </div>
          <div>
            <p className="kicker">Instruments</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {INSTRUMENTS.map((instrument) => {
                const active = instrumentIds.includes(instrument.id)
                return (
                  <button
                    key={instrument.id}
                    type="button"
                    disabled={locked}
                    title={instrument.description}
                    onClick={() => setInstrumentIds((current) => active ? current.filter((id) => id !== instrument.id) : [...current, instrument.id])}
                    className={`rounded-full border px-3 py-1.5 text-sm ${active ? 'border-accent text-ink' : 'border-line text-mute'}`}
                  >
                    {instrument.name}
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <p className="kicker">Launcher</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {LAUNCH_VEHICLES.map((vehicle) => (
                <button
                  key={vehicle.id}
                  type="button"
                  disabled={locked}
                  onClick={() => setLaunchVehicleId(vehicle.id)}
                  className={`rounded-xl border p-3 text-left text-sm ${launchVehicleId === vehicle.id ? 'border-accent' : 'border-line'}`}
                >
                  <span className="block font-display">{vehicle.name}</span>
                  <span className="text-xs text-faint">{kg(vehicle.maxPayloadKg)} · {usd(vehicle.costUsd)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <div className="h-64 overflow-hidden rounded-2xl border border-line bg-space-950">
            <Canvas camera={{ position: [7.5, 3.4, 8.6], fov: 42 }}>
              <color attach="background" args={['#07090f']} />
              <ambientLight intensity={0.55} />
              <directionalLight position={[4, 3, 2]} intensity={1.4} />
              <SpacecraftModel selection={spacecraft} instrumentIds={instrumentIds} />
              <OrbitControls enablePan={false} />
            </Canvas>
          </div>
          <section className="panel p-4 text-sm">
            <p className="kicker">Live evaluation</p>
            <dl className="mt-3 space-y-2">
              <div className="flex justify-between"><dt className="text-mute">Mass</dt><dd className="num">{kg(metrics.totalMassKg)}</dd></div>
              <div className="flex justify-between"><dt className="text-mute">Budget left</dt><dd className={`num ${metrics.remainingBudgetUsd < 0 ? 'text-bad' : ''}`}>{usd(metrics.remainingBudgetUsd)}</dd></div>
              <div className="flex justify-between"><dt className="text-mute">Power</dt><dd className={`num ${metrics.powerBalanceW < 0 ? 'text-bad' : ''}`}>{signedWatts(metrics.powerBalanceW)}</dd></div>
              <div className="flex justify-between"><dt className="text-mute">Payload</dt><dd className="num">{kg(metrics.payloadMassKg)}</dd></div>
            </dl>
            <ul className="mt-3 space-y-2">
              {metrics.issues.filter((issue) => issue.level === 'error').slice(0, 4).map((issue) => (
                <li key={issue.code} className="text-xs text-bad">{issue.message}</li>
              ))}
              {metrics.issues.every((issue) => issue.level !== 'error') ? <li className="text-xs text-good">Every blocking check is closed.</li> : null}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button disabled={locked} onClick={finish}>{score.won ? 'Record a win' : 'Record this attempt'}</Button>
              <Button variant="quiet" onClick={() => reset()}>Restart</Button>
            </div>
          </section>
        </aside>
      </div>
      {locked ? (
        <section className={`panel mt-4 p-5 ${score.won ? 'border-good/50' : 'border-bad/50'}`}>
          <p className="kicker">{score.won ? 'Mission-ready' : 'Not ready'}</p>
          <h2 className="mt-2 font-display text-3xl">{score.won ? 'The design can fly.' : 'The design is still blocked.'}</h2>
          <div className="mt-4">
            <ScoreGrid rows={[
              { label: 'Score', value: String(score.total) },
              { label: 'Budget', value: String(score.budget) },
              { label: 'Mass', value: String(score.mass) },
              { label: 'Science', value: String(score.science) },
            ]} />
          </div>
          {score.won ? <Button className="mt-4" onClick={applyDesign}>Apply this design to the active mission</Button> : null}
          {notice ? <p className="mt-3 text-sm text-mute">{notice}</p> : null}
          <p className="mt-3 text-xs text-faint">Selected parts: {COMPONENTS.filter((item) => Object.values(spacecraft).includes(item.id)).map((item) => item.name).join(', ') || 'none'}.</p>
        </section>
      ) : null}
    </div>
  )
}
