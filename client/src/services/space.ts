export interface SpaceBody {
  body: string
  name: string
  command: string
  center: string
  referencePlane: string
  referenceSystem: string
  units: { position: string; velocity: string }
  epoch: string
  jdtdb: number | null
  positionKm: { x: number; y: number; z: number }
  velocityKmS: { x: number; y: number; z: number }
  rangeKm: number
  speedKmS: number
  source: string
  sourceUrl: string
  docsUrl: string
  fetchedAt: string
  stale: boolean
  dataClass: 'horizons-vector' | 'coordinate-origin'
  warning?: string
  note?: string
}

export interface SpaceCatalog {
  attribution: string
  sourceUrl: string
  docsUrl: string
  frame: {
    center: string
    centerMeaning: string
    referencePlane: string
    referenceSystem: string
    units: { position: string; velocity: string }
    visualScale: string
  }
  refresh: string
  bodies: SpaceBody[]
  errors: { body: string; message: string }[]
  message?: string
}

export interface SpaceElements {
  body: string
  name: string
  command: string
  center: string
  referencePlane: string
  referenceSystem: string
  epoch: string
  eccentricity?: number
  periapsisKm?: number
  inclinationDeg?: number
  longitudeOfAscendingNodeDeg?: number
  argumentOfPeriapsisDeg?: number
  semiMajorAxisKm?: number
  apoapsisKm?: number
  periodDays?: number
  meanAnomalyDeg?: number
  source: string
  docsUrl: string
  fetchedAt: string
  stale: boolean
  dataClass: 'horizons-elements'
  unitsNote: string
  warning?: string
}

export interface SpaceComparison {
  a: SpaceBody
  b: SpaceBody
  separationKm: number
  formula: string
  units: string
  dataClass: 'calculated'
  assumptions: string[]
  attribution: string
  sourceUrl: string
  docsUrl: string
  message?: string
}

async function readJson<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T & { message?: string; bodies?: unknown[] }
  if (!response.ok && (!('bodies' in body) || !body.bodies || body.bodies.length === 0)) {
    throw new Error(body.message || 'NASA/JPL Horizons is unavailable.')
  }
  return body
}

function epochQuery(epoch?: string) {
  return epoch ? `?epoch=${encodeURIComponent(epoch)}` : ''
}

export async function fetchSpaceCatalog(epoch?: string) {
  const response = await fetch(`/api/space/planets${epochQuery(epoch)}`)
  return readJson<SpaceCatalog>(response)
}

export async function fetchSpaceBody(id: string, epoch?: string) {
  const response = await fetch(`/api/space/planets/${encodeURIComponent(id)}${epochQuery(epoch)}`)
  return readJson<SpaceBody>(response)
}

export async function fetchSpaceElements(id: string, epoch?: string) {
  const response = await fetch(`/api/space/planets/${encodeURIComponent(id)}/elements${epochQuery(epoch)}`)
  const body = (await response.json()) as SpaceElements & { message?: string; elements?: null; note?: string }
  if (!response.ok) throw new Error(body.message || 'Horizons did not return orbital elements.')
  return body
}

export async function fetchSpaceComparison(a: string, b: string, epoch?: string) {
  const params = new URLSearchParams({ a, b })
  if (epoch) params.set('epoch', epoch)
  const response = await fetch(`/api/space/compare?${params.toString()}`)
  return readJson<SpaceComparison>(response)
}
