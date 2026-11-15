import { Router } from 'express'
import { MissionRecord } from '../models/MissionRecord.js'
import type { DatabaseMode } from '../db.js'

interface MissionBody {
  id?: string
  name?: string
  updatedAt?: string
}

function routeId(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function isMissionBody(value: unknown): value is MissionBody & Record<string, unknown> {
  if (!value || typeof value !== 'object') return false
  const body = value as MissionBody
  return typeof body.id === 'string' && body.id.length > 0 && body.id.length < 80 && typeof body.name === 'string'
}

export function missionRouter(mode: DatabaseMode) {
  const router = Router()

  router.use((req, res, next) => {
    if (mode !== 'mongo') {
      res.status(503).json({
        demo: true,
        message: 'Database is not connected. Missions stay in this browser.',
      })
      return
    }
    next()
  })

  router.get('/', async (_req, res, next) => {
    try {
      const rows = await MissionRecord.find().sort({ updatedAt: -1 }).lean()
      res.json(rows.map((row) => row.payload))
    } catch (error) {
      next(error)
    }
  })

  router.get('/:id', async (req, res, next) => {
    try {
      const row = await MissionRecord.findById(routeId(req.params.id)).lean<{ payload: unknown } | null>()
      if (!row) {
        res.status(404).json({ message: 'Mission not found.' })
        return
      }
      res.json(row.payload)
    } catch (error) {
      next(error)
    }
  })

  router.put('/:id', async (req, res, next) => {
    try {
      const id = routeId(req.params.id)
      if (!id || !isMissionBody(req.body) || req.body.id !== id) {
        res.status(400).json({ message: 'Mission payload must include a matching id and name.' })
        return
      }
      const updatedAt = new Date(req.body.updatedAt || Date.now())
      await MissionRecord.findByIdAndUpdate(
        id,
        { _id: id, payload: req.body, updatedAt },
        { upsert: true, new: true },
      )
      res.json({ ok: true, id })
    } catch (error) {
      next(error)
    }
  })

  router.delete('/:id', async (req, res, next) => {
    try {
      await MissionRecord.findByIdAndDelete(routeId(req.params.id))
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  return router
}
