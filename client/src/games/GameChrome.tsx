import type { Difficulty } from '../types'

const LEVELS: Difficulty[] = ['beginner', 'intermediate', 'expert']

export function DifficultyPicker({ value, onChange, disabled }: { value: Difficulty; onChange: (value: Difficulty) => void; disabled?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Difficulty">
      {LEVELS.map((level) => (
        <button
          key={level}
          type="button"
          disabled={disabled}
          title={`${level} difficulty`}
          onClick={() => onChange(level)}
          className={`rounded-full border px-4 py-1.5 text-sm capitalize disabled:opacity-50 ${value === level ? 'border-accent text-ink' : 'border-line text-mute'}`}
        >
          {level}
        </button>
      ))}
    </div>
  )
}

export function ScoreGrid({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {rows.map((row) => (
        <div key={row.label} className="rounded-xl border border-line bg-space-950/70 px-3 py-2">
          <dt className="text-[11px] uppercase tracking-[0.14em] text-faint">{row.label}</dt>
          <dd className="num mt-1 text-lg">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}
