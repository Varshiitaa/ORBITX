import type { Difficulty } from '../types'

export type GameId = 'orbit' | 'engineer' | 'survival'

export interface GameResult {
  id: string
  game: GameId
  difficulty: Difficulty
  won: boolean
  score: number
  summary: string
  at: string
  fuelFraction?: number
  science?: number
}

export interface GameBadge {
  id: string
  name: string
  description: string
}

export const GAME_BADGES: GameBadge[] = [
  { id: 'orbital-expert', name: 'Orbital Expert', description: 'Close a stable orbit in Orbit Master on Expert.' },
  { id: 'master-engineer', name: 'Master Engineer', description: 'Build a mission-ready spacecraft in Spacecraft Engineer.' },
  { id: 'mission-survivor', name: 'Mission Survivor', description: 'Keep the spacecraft through every event in Mission Survival.' },
  { id: 'fuel-saver', name: 'Fuel Saver', description: 'Win Orbit Master with at least 40% of the insertion fuel still aboard.' },
  { id: 'scientific-explorer', name: 'Scientific Explorer', description: 'Win Spacecraft Engineer with a science score of 70 or more, or finish Mission Survival with science data still stored.' },
]

const KEY = 'orbitx-game-history'

export function readGameHistory(): GameResult[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isResult).slice(0, 40)
  } catch {
    return []
  }
}

function isResult(value: unknown): value is GameResult {
  if (!value || typeof value !== 'object') return false
  const item = value as GameResult
  return (item.game === 'orbit' || item.game === 'engineer' || item.game === 'survival') && typeof item.score === 'number' && typeof item.won === 'boolean'
}

export function writeGameResult(result: Omit<GameResult, 'id' | 'at'>): GameResult[] {
  const next: GameResult = { ...result, id: crypto.randomUUID(), at: new Date().toISOString() }
  const history = [next, ...readGameHistory()].slice(0, 40)
  localStorage.setItem(KEY, JSON.stringify(history))
  void fetch('/api/games', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(next),
  }).catch(() => undefined)
  return history
}

export function unlockedGameBadges(history: GameResult[]) {
  const ids = new Set<string>()
  if (history.some((item) => item.game === 'orbit' && item.won && item.difficulty === 'expert')) ids.add('orbital-expert')
  if (history.some((item) => item.game === 'engineer' && item.won)) ids.add('master-engineer')
  if (history.some((item) => item.game === 'survival' && item.won)) ids.add('mission-survivor')
  if (history.some((item) => item.game === 'orbit' && item.won && (item.fuelFraction ?? 0) >= 0.4)) ids.add('fuel-saver')
  if (history.some((item) => (item.game === 'engineer' && item.won && (item.science ?? 0) >= 70) || (item.game === 'survival' && item.won && (item.science ?? 0) >= 25))) {
    ids.add('scientific-explorer')
  }
  return GAME_BADGES.filter((badge) => ids.has(badge.id))
}

export function bestScore(history: GameResult[], game: GameId) {
  return history.filter((item) => item.game === game).reduce((best, item) => Math.max(best, item.score), 0)
}
