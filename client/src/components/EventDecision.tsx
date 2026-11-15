import { useMissionStore } from '../store/missionStore'
import type { PendingEvent } from '../types'

const riskCopy = { low: 'Lower risk', medium: 'Mixed', high: 'Higher risk' }

export function EventDecision({ pending }: { pending: PendingEvent }) {
  const resolveEvent = useMissionStore((state) => state.resolveEvent)
  return (
    <section className="panel border-warn/40 p-5" aria-live="polite">
      <p className="kicker text-warn">Mission event · simulation holding</p>
      <h2 className="mt-2 font-display text-2xl">{pending.title}</h2>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-mute">{pending.description}</p>
      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {pending.options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => resolveEvent(option.id)}
            className="rounded-2xl border border-line bg-space-950/50 p-4 text-left transition hover:border-accent"
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">{riskCopy[option.risk]}</span>
            <span className="mt-2 block font-display text-lg text-ink">{option.label}</span>
            <span className="mt-2 block text-sm leading-relaxed text-mute">{option.detail}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
