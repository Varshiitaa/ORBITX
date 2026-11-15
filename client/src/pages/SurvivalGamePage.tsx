import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, PageHeader } from '../components/ui'
import { DifficultyPicker, ScoreGrid } from '../games/GameChrome'
import { writeGameResult } from '../games/history'
import { chooseResponse, createSurvival, currentEvent, scoreSurvival, type SurvivalState } from '../games/survival'
import type { Difficulty } from '../types'

export function SurvivalGamePage() {
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner')
  const [state, setState] = useState<SurvivalState>(() => createSurvival('beginner'))
  const recorded = useRef(false)
  const event = currentEvent(state, difficulty)
  const score = state.status === 'playing' ? null : scoreSurvival(state)

  function reset(next: Difficulty = difficulty) {
    recorded.current = false
    setDifficulty(next)
    setState(createSurvival(next))
  }

  function choose(optionId: string) {
    setState((current) => {
      const next = chooseResponse(current, difficulty, optionId)
      if (next.status !== 'playing' && !recorded.current) {
        recorded.current = true
        const result = scoreSurvival(next)
        writeGameResult({
          game: 'survival',
          difficulty,
          won: result.won,
          score: result.total,
          summary: next.log.at(-1)?.consequence ?? 'Scenario closed.',
          science: result.science,
        })
      }
      return next
    })
  }

  const resources = state.resources

  return (
    <div>
      <PageHeader
        kicker="Mission Survival"
        title="Keep the spacecraft alive."
        description="Each event changes health, fuel, battery, power margin, or stored science. The safe choice is not always the one that saves the data. This is a training scenario, not the main flight."
        actions={<Link to="/app/games" className="text-sm text-accent">All games</Link>}
      />
      <DifficultyPicker value={difficulty} disabled={state.log.length > 0 && state.status === 'playing'} onChange={reset} />
      <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ['Health', `${Math.round(resources.health)}`],
          ['Fuel', `${Math.round(resources.fuelKg)} kg`],
          ['Battery', `${Math.round(resources.batteryPct)}%`],
          ['Power margin', `${Math.round(resources.powerMarginW)} W`],
          ['Data', `${Math.round(resources.data)}`],
          ['Temperature', `${Math.round(resources.temperatureC)}°C`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-line bg-space-900/80 px-3 py-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-faint">{label}</p>
            <p className="num mt-1 text-xl">{value}</p>
          </div>
        ))}
      </div>
      {event && state.status === 'playing' ? (
        <section className="panel mt-4 border-warn/40 p-5">
          <p className="kicker">Emergency</p>
          <h2 className="mt-2 font-display text-3xl">{event.title}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-mute">{event.problem}</p>
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {event.options.map((option) => (
              <button
                key={option.id}
                type="button"
                title={option.detail}
                onClick={() => choose(option.id)}
                className="rounded-2xl border border-line p-4 text-left hover:border-accent"
              >
                <span className="block font-display text-lg">{option.label}</span>
                <span className="mt-2 block text-sm leading-relaxed text-mute">{option.detail}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}
      {state.log.length > 0 ? (
        <section className="mt-4 space-y-2">
          {state.log.map((entry) => (
            <p key={`${entry.eventId}-${entry.optionId}`} className="rounded-xl border border-line px-4 py-3 text-sm text-mute">{entry.consequence}</p>
          ))}
        </section>
      ) : null}
      {score ? (
        <section className={`panel mt-4 p-5 ${score.won ? 'border-good/50' : 'border-bad/50'}`}>
          <p className="kicker">{score.won ? 'Mission survived' : 'Spacecraft lost'}</p>
          <h2 className="mt-2 font-display text-3xl">{score.won ? 'The objectives still have a bus to fly on.' : 'A reserve hit zero before the scenario ended.'}</h2>
          <div className="mt-4">
            <ScoreGrid rows={[
              { label: 'Score', value: String(score.total) },
              { label: 'Response', value: String(score.response) },
              { label: 'Health', value: String(score.health) },
              { label: 'Science', value: String(score.science) },
            ]} />
          </div>
          <Button className="mt-4" variant="secondary" onClick={() => reset()}>Restart</Button>
        </section>
      ) : null}
    </div>
  )
}
