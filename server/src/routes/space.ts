import { Router } from 'express'
import {
  getHorizonsBodyChecked,
  getHorizonsElements,
  HORIZONS_ATTRIBUTION,
  HORIZONS_BODIES,
  HORIZONS_DOCS,
  HORIZONS_SOURCE,
  isHorizonsBody,
  parseEpochParam,
  separationKm,
  type HorizonsBodyId,
  type HorizonsSample,
} from '../horizons.js'

const FRAME = {
  center: '500@10',
  centerMeaning: 'Horizons center 500@10 is the Sun (body 10). Planet vectors are heliocentric.',
  referencePlane: 'ECLIPTIC',
  referenceSystem: 'ICRF',
  units: { position: 'km', velocity: 'km/s' },
  visualScale: 'The 3D view compresses heliocentric range with r_scene = (range / 1 AU) ^ 0.55 × 2.4 and keeps the ecliptic direction. Rendered sizes and the visual spin are artistic. They are not physical radii or sidereal rotation.',
}

export function sunOrigin(now: Date) {
  return {
    body: 'sun' as const,
    name: 'Sun',
    command: '10',
    center: '500@10' as const,
    referencePlane: 'ECLIPTIC' as const,
    referenceSystem: 'ICRF' as const,
    units: { position: 'km' as const, velocity: 'km/s' as const },
    epoch: now.toISOString(),
    jdtdb: null,
    positionKm: { x: 0, y: 0, z: 0 },
    velocityKmS: { x: 0, y: 0, z: 0 },
    rangeKm: 0,
    speedKmS: 0,
    source: HORIZONS_ATTRIBUTION,
    sourceUrl: HORIZONS_SOURCE,
    docsUrl: HORIZONS_DOCS,
    fetchedAt: now.toISOString(),
    stale: false,
    dataClass: 'coordinate-origin' as const,
    note: 'The Sun is the origin of the heliocentric frame used for every other body on this page. These zeroes are that frame definition, not a Horizons state vector.',
  }
}

function epochFrom(query: unknown) {
  return parseEpochParam(query)
}

async function loadBody(id: string, epoch: Date | undefined) {
  if (id === 'sun') return sunOrigin(epoch ?? new Date())
  return getHorizonsBodyChecked(id, epoch ? { epoch } : {})
}

export function spaceRouter() {
  const router = Router()

  router.get('/planets', async (req, res) => {
    let epoch: Date | undefined
    try {
      epoch = epochFrom(req.query.epoch)
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Invalid epoch.' })
      return
    }
    const ids = Object.keys(HORIZONS_BODIES) as HorizonsBodyId[]
    const bodies: Array<HorizonsSample | ReturnType<typeof sunOrigin>> = [sunOrigin(epoch ?? new Date())]
    const errors: { body: string; message: string }[] = []
    const queue = [...ids]
    async function worker() {
      while (queue.length > 0) {
        const id = queue.shift()
        if (!id) return
        try {
          bodies.push(await getHorizonsBodyChecked(id, epoch ? { epoch } : {}))
        } catch (error) {
          errors.push({ body: id, message: error instanceof Error ? error.message : 'Horizons request failed' })
        }
      }
    }
    await Promise.all([worker(), worker()])
    const planets = bodies.filter((body) => body.body !== 'sun')
    if (planets.length === 0) {
      res.status(503).json({
        message: 'NASA/JPL Horizons did not return ephemerides, and there is no cached sample to show.',
        attribution: HORIZONS_ATTRIBUTION,
        sourceUrl: HORIZONS_SOURCE,
        docsUrl: HORIZONS_DOCS,
        frame: FRAME,
        bodies: [],
        errors,
      })
      return
    }
    const order = ['sun', ...ids]
    bodies.sort((a, b) => order.indexOf(a.body) - order.indexOf(b.body))
    res.json({
      attribution: HORIZONS_ATTRIBUTION,
      sourceUrl: HORIZONS_SOURCE,
      docsUrl: HORIZONS_DOCS,
      frame: FRAME,
      refresh: 'Current-epoch vectors are cached for 15 minutes. A requested historical or future date is cached for 24 hours.',
      bodies,
      errors,
    })
  })

  router.get('/planets/:id/vectors', async (req, res) => {
    await sendBody(req, res)
  })

  router.get('/planets/:id/elements', async (req, res) => {
    const id = req.params.id
    if (id === 'sun') {
      res.json({
        body: 'sun',
        dataClass: 'coordinate-origin',
        elements: null,
        note: 'Heliocentric orbital elements are not defined for the coordinate origin.',
        attribution: HORIZONS_ATTRIBUTION,
        docsUrl: HORIZONS_DOCS,
      })
      return
    }
    if (!isHorizonsBody(id)) {
      res.status(400).json({ message: `Unknown target "${id}".` })
      return
    }
    let epoch: Date | undefined
    try {
      epoch = epochFrom(req.query.epoch)
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Invalid epoch.' })
      return
    }
    try {
      const elements = await getHorizonsElements(id, epoch ? { epoch } : {})
      res.json(elements)
    } catch (error) {
      res.status(503).json({
        message: error instanceof Error ? error.message : 'Horizons elements request failed',
        attribution: HORIZONS_ATTRIBUTION,
        docsUrl: HORIZONS_DOCS,
      })
    }
  })

  router.get('/planets/:id', async (req, res) => {
    await sendBody(req, res)
  })

  router.get('/compare', async (req, res) => {
    const leftId = typeof req.query.a === 'string' ? req.query.a : ''
    const rightId = typeof req.query.b === 'string' ? req.query.b : ''
    if (!leftId || !rightId) {
      res.status(400).json({ message: 'Provide two bodies with the a and b query parameters.' })
      return
    }
    let epoch: Date | undefined
    try {
      epoch = epochFrom(req.query.epoch)
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Invalid epoch.' })
      return
    }
    try {
      const a = await loadBody(leftId, epoch)
      const b = await loadBody(rightId, epoch)
      const distance = separationKm(a, b)
      res.json({
        a,
        b,
        separationKm: distance,
        formula: 'sqrt((x_b - x_a)^2 + (y_b - y_a)^2 + (z_b - z_a)^2)',
        units: 'km',
        dataClass: 'calculated',
        assumptions: [
          'Both positions are expressed in the same heliocentric ecliptic frame, Horizons CENTER 500@10, ICRF, kilometres.',
          'When one body is the Sun, its position is the coordinate origin, so the separation equals the other body\'s heliocentric range.',
          'The result is center-to-center. Planetary radii are not subtracted.',
          'The value is geometry from the returned state vectors. It is not a spacecraft trajectory.',
        ],
        attribution: HORIZONS_ATTRIBUTION,
        sourceUrl: HORIZONS_SOURCE,
        docsUrl: HORIZONS_DOCS,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Compare failed'
      const status = message.startsWith('Unknown Horizons target') ? 400 : 503
      res.status(status).json({ message, attribution: HORIZONS_ATTRIBUTION, docsUrl: HORIZONS_DOCS })
    }
  })

  return router

  async function sendBody(req: { params: { id: string }; query: { epoch?: unknown } }, res: { status: (code: number) => { json: (body: unknown) => void }; json: (body: unknown) => void }) {
    const id = req.params.id
    if (id !== 'sun' && !isHorizonsBody(id)) {
      res.status(400).json({ message: `Unknown target "${id}".` })
      return
    }
    let epoch: Date | undefined
    try {
      epoch = epochFrom(req.query.epoch)
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Invalid epoch.' })
      return
    }
    try {
      res.json(await loadBody(id, epoch))
    } catch (error) {
      res.status(503).json({
        message: error instanceof Error ? error.message : 'Horizons request failed',
        attribution: HORIZONS_ATTRIBUTION,
        sourceUrl: HORIZONS_SOURCE,
        docsUrl: HORIZONS_DOCS,
      })
    }
  }
}
