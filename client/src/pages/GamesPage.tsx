import { Link } from 'react-router-dom'
import { PageHeader } from '../components/ui'
import { GAME_BADGES, bestScore, readGameHistory, unlockedGameBadges } from '../games/history'

const CARDS = [
  { to: '/app/games/orbit', kicker: 'Orbital mechanics', title: 'Orbit Master', body: 'Burn into a target orbit. Too little speed falls. Too much speed escapes.' },
  { to: '/app/games/engineer', kicker: 'Spacecraft design', title: 'Spacecraft Engineer', body: 'Close mass, power, budget, and the launcher with the same engineering engine as the mission.' },
  { to: '/app/games/survival', kicker: 'Emergency management', title: 'Mission Survival', body: 'Answer storms, leaks, heat, and failed instruments. Each choice spends a different reserve.' },
]

export function GamesPage() {
  const history = readGameHistory()
  const badges = unlockedGameBadges(history)
  return (
    <div>
      <PageHeader
        kicker="Space games"
        title="Three challenges. One mission model."
        description="A separate practice section. The games score on their own, use the same engineering model as the mission planner, and do not change that mission unless you explicitly apply a winning design."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        {CARDS.map((card) => (
          <Link key={card.to} to={card.to} className="hud-card block p-5">
            <p className="kicker">{card.kicker}</p>
            <h2 className="mt-3 font-display text-2xl">{card.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-mute">{card.body}</p>
            <p className="mt-4 text-sm text-accent">Play</p>
          </Link>
        ))}
      </div>
      <section className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="panel p-5">
          <p className="kicker">Game history</p>
          {history.length === 0 ? <p className="mt-3 text-sm text-mute">No games recorded on this device yet.</p> : (
            <ul className="mt-3 divide-y divide-line">
              {history.slice(0, 8).map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span>
                    <span className="text-ink capitalize">{item.game}</span>
                    <span className="mt-1 block text-xs text-faint">{item.difficulty} · {item.won ? 'Won' : 'Lost'} · {item.summary}</span>
                  </span>
                  <span className="num">{item.score}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="panel p-5">
          <p className="kicker">Training badges</p>
          <ul className="mt-3 space-y-3">
            {GAME_BADGES.map((badge) => {
              const unlocked = badges.some((item) => item.id === badge.id)
              return (
                <li key={badge.id} className={unlocked ? '' : 'opacity-50'}>
                  <p className="text-sm text-ink">{badge.name}</p>
                  <p className="text-xs text-faint">{unlocked ? 'Unlocked' : 'Locked'}</p>
                </li>
              )
            })}
          </ul>
          <p className="mt-4 text-xs text-faint">Best scores · Orbit {bestScore(history, 'orbit')} · Engineer {bestScore(history, 'engineer')} · Survival {bestScore(history, 'survival')}</p>
        </div>
      </section>
    </div>
  )
}
