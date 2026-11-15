import { Router } from 'express'
import type { DatabaseMode } from '../db.js'

interface StoredGame {
  id: string
  game: string
  difficulty: string
  won: boolean
  score: number
  summary: string
  at: string
}

const memory: StoredGame[] = []

export function gamesRouter(_mode: DatabaseMode) {
  const router = Router()

  router.get('/', (_req, res) => {
    res.json(memory)
  })

  router.post('/', (req, res) => {
    const body = req.body as Partial<StoredGame>
    if (body.game !== 'orbit' && body.game !== 'engineer' && body.game !== 'survival') {
      res.status(400).json({ message: 'Unknown game.' })
      return
    }
    if (typeof body.score !== 'number' || typeof body.won !== 'boolean') {
      res.status(400).json({ message: 'A game result needs a score and an outcome.' })
      return
    }
    const record: StoredGame = {
      id: typeof body.id === 'string' ? body.id : crypto.randomUUID(),
      game: body.game,
      difficulty: typeof body.difficulty === 'string' ? body.difficulty : 'beginner',
      won: body.won,
      score: body.score,
      summary: typeof body.summary === 'string' ? body.summary.slice(0, 240) : '',
      at: typeof body.at === 'string' ? body.at : new Date().toISOString(),
    }
    memory.unshift(record)
    memory.splice(40)
    res.status(201).json(record)
  })

  return router
}
