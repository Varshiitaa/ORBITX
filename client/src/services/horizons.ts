export interface HorizonsSample {
  body: string
  name: string
  command: string
  center: string
  referencePlane: string
  referenceSystem: string
  units: { position: string; velocity: string }
  epoch: string
  jdtdb: number
  positionKm: { x: number; y: number; z: number }
  velocityKmS: { x: number; y: number; z: number }
  rangeKm: number
  speedKmS: number
  source: string
  sourceUrl: string
  fetchedAt: string
  stale: boolean
  warning?: string
}

export interface HorizonsCatalog {
  attribution: string
  sourceUrl: string
  bodies: HorizonsSample[]
  errors: { body: string; message: string }[]
  message?: string
}

export async function fetchHorizons(): Promise<HorizonsCatalog> {
  const response = await fetch('/api/horizons')
  const body = (await response.json()) as HorizonsCatalog
  if (!response.ok && (!body.bodies || body.bodies.length === 0)) {
    throw new Error(body.message || 'NASA/JPL Horizons is unavailable.')
  }
  return {
    attribution: body.attribution || 'Planetary ephemeris data provided by NASA/JPL Horizons.',
    sourceUrl: body.sourceUrl || 'https://ssd.jpl.nasa.gov/horizons/',
    bodies: Array.isArray(body.bodies) ? body.bodies : [],
    errors: Array.isArray(body.errors) ? body.errors : [],
    message: body.message,
  }
}
