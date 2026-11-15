import { Router } from 'express'
import { getHorizonsBodyChecked, HORIZONS_ATTRIBUTION, HORIZONS_BODIES, HORIZONS_SOURCE, isHorizonsBody, type HorizonsBodyId } from '../horizons.js'

export function horizonsRouter() {
  const router = Router()

  router.get('/', async (_req, res) => {
    const ids = Object.keys(HORIZONS_BODIES) as HorizonsBodyId[]
    const bodies = []
    const errors: { body: string; message: string }[] = []
    for (const id of ids) {
      try {
        bodies.push(await getHorizonsBodyChecked(id))
      } catch (error) {
        errors.push({ body: id, message: error instanceof Error ? error.message : 'Horizons request failed' })
      }
    }
    if (bodies.length === 0) {
      res.status(503).json({
        message: 'NASA/JPL Horizons did not return ephemerides, and there is no cached sample to show.',
        attribution: HORIZONS_ATTRIBUTION,
        sourceUrl: HORIZONS_SOURCE,
        bodies: [],
        errors,
      })
      return
    }
    res.json({ attribution: HORIZONS_ATTRIBUTION, sourceUrl: HORIZONS_SOURCE, bodies, errors })
  })

  router.get('/:body', async (req, res) => {
    const body = req.params.body
    if (!isHorizonsBody(body)) {
      res.status(400).json({ message: `Unknown target "${body}". Use ${Object.keys(HORIZONS_BODIES).join(', ')}.` })
      return
    }
    try {
      const sample = await getHorizonsBodyChecked(body)
      res.json(sample)
    } catch (error) {
      res.status(503).json({
        message: error instanceof Error ? error.message : 'Horizons request failed',
        attribution: HORIZONS_ATTRIBUTION,
        sourceUrl: HORIZONS_SOURCE,
      })
    }
  })

  return router
}
