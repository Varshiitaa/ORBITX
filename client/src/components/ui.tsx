import { Link } from 'react-router-dom'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { EngineeringIssue, IssueStep } from '../types'

const STEP_PATH: Record<IssueStep, string> = {
  mission: '/app/missions',
  objectives: '/app/objectives',
  spacecraft: '/app/spacecraft',
  instruments: '/app/instruments',
  launch: '/app/launch',
  resources: '/app/resources',
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'quiet' }) {
  const styles = {
    primary: 'bg-accent text-space-950 hover:bg-white disabled:bg-space-800 disabled:text-faint',
    secondary: 'border border-line bg-space-900 text-ink hover:border-accent disabled:text-faint',
    quiet: 'text-mute hover:text-ink',
  }[variant]
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed ${styles} ${className}`}
    />
  )
}

export function PageHeader({
  kicker,
  title,
  description,
  actions,
}: {
  kicker: string
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0 max-w-3xl">
        <p className="kicker">{kicker}</p>
        <h1 className="mt-2 font-display text-3xl font-medium tracking-tight md:text-4xl">{title}</h1>
        {description ? <p className="mt-3 max-w-2xl text-base leading-relaxed text-mute">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  )
}

export function SpecRow({ label, value, tone = 'ink' }: { label: string; value: string; tone?: 'ink' | 'good' | 'warn' | 'bad' }) {
  const color = { ink: 'text-ink', good: 'text-good', warn: 'text-warn', bad: 'text-bad' }[tone]
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line/80 py-2.5 last:border-0">
      <span className="text-sm text-mute">{label}</span>
      <span className={`num text-sm ${color}`}>{value}</span>
    </div>
  )
}

export function IssueList({ issues }: { issues: EngineeringIssue[] }) {
  if (issues.length === 0) {
    return <p className="text-sm text-good">This configuration passes the current checks.</p>
  }
  return (
    <ul className="space-y-2">
      {issues.map((issue) => (
        <li key={issue.code} className="flex items-start justify-between gap-4 text-sm">
          <span className={issue.level === 'error' ? 'text-bad' : 'text-warn'}>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em]">{issue.level}</span>
            <span className="mt-1 block text-ink/90">{issue.message}</span>
          </span>
          <Link to={STEP_PATH[issue.step]} className="shrink-0 text-accent">
            Review
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function EmptyMission({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="panel max-w-xl p-8">
      <p className="kicker">No active mission</p>
      <h2 className="mt-3 font-display text-2xl">Open a mission file to begin.</h2>
      <p className="mt-3 text-mute">
        Destination, spacecraft, budget, and simulation all read from the same mission. Nothing on the following pages is filled in until you create one.
      </p>
      <Button className="mt-6" onClick={onCreate}>
        Create mission
      </Button>
    </div>
  )
}

export function Meter({ value, max = 100 }: { value: number; max?: number }) {
  const width = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-space-800">
      <div className="h-full rounded-full bg-accent" style={{ width: `${width}%` }} />
    </div>
  )
}
