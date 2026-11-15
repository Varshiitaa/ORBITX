import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

export const HORIZONS_URL = 'https://ssd.jpl.nasa.gov/api/horizons.api'
export const HORIZONS_SOURCE = 'https://ssd.jpl.nasa.gov/horizons/'
export const HORIZONS_DOCS = 'https://ssd-api.jpl.nasa.gov/doc/horizons.html'
export const HORIZONS_ATTRIBUTION = 'Planetary ephemeris data provided by NASA/JPL Horizons.'

/**
 * Heliocentric major-body commands. The Sun (10) is the coordinate origin
 * CENTER='500@10', so it is not requested as a state vector.
 * https://ssd.jpl.nasa.gov/horizons/app.html#/definitions
 */
export const HORIZONS_BODIES = {
  mercury: { command: '199', name: 'Mercury' },
  venus: { command: '299', name: 'Venus' },
  earth: { command: '399', name: 'Earth' },
  moon: { command: '301', name: 'Moon' },
  mars: { command: '499', name: 'Mars' },
  jupiter: { command: '599', name: 'Jupiter' },
  saturn: { command: '699', name: 'Saturn' },
  uranus: { command: '799', name: 'Uranus' },
  neptune: { command: '899', name: 'Neptune' },
} as const

export type HorizonsBodyId = keyof typeof HORIZONS_BODIES

export interface HorizonsSample {
  body: HorizonsBodyId
  name: string
  command: string
  center: '500@10'
  referencePlane: 'ECLIPTIC'
  referenceSystem: 'ICRF'
  units: { position: 'km'; velocity: 'km/s' }
  epoch: string
  jdtdb: number
  positionKm: { x: number; y: number; z: number }
  velocityKmS: { x: number; y: number; z: number }
  rangeKm: number
  speedKmS: number
  source: string
  sourceUrl: string
  docsUrl: string
  fetchedAt: string
  stale: boolean
  dataClass: 'horizons-vector'
  warning?: string
}

export interface HorizonsElements {
  body: HorizonsBodyId
  name: string
  command: string
  center: '500@10'
  referencePlane: 'ECLIPTIC'
  referenceSystem: 'ICRF'
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
  sourceUrl: string
  docsUrl: string
  fetchedAt: string
  stale: boolean
  dataClass: 'horizons-elements'
  unitsNote: string
  warning?: string
}

const CURRENT_TTL_MS = 15 * 60 * 1000
const ARCHIVE_TTL_MS = 24 * 60 * 60 * 1000
const vectorCache = new Map<string, { savedAt: number; sample: HorizonsSample }>()
const elementCache = new Map<string, { savedAt: number; sample: HorizonsElements }>()
const cacheFile = path.resolve(process.cwd(), 'data', 'horizons-cache.json')

export function dayKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function parseEpochParam(value: unknown): Date | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('Epoch must be a calendar date, YYYY-MM-DD.')
  }
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime()) || dayKey(date) !== value) {
    throw new Error('Epoch is not a valid calendar date.')
  }
  const year = date.getUTCFullYear()
  if (year < 1800 || year > 2200) throw new Error('Epoch must fall between 1800-01-01 and 2200-12-31.')
  return date
}

export function horizonsQuery(command: string, start: Date, kind: 'vectors' | 'elements' = 'vectors') {
  const stop = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  const url = new URL(HORIZONS_URL)
  url.searchParams.set('format', 'json')
  url.searchParams.set('COMMAND', `'${command}'`)
  url.searchParams.set('OBJ_DATA', 'NO')
  url.searchParams.set('MAKE_EPHEM', 'YES')
  url.searchParams.set('EPHEM_TYPE', kind === 'elements' ? 'ELEMENTS' : 'VECTORS')
  url.searchParams.set('CENTER', "'500@10'")
  url.searchParams.set('START_TIME', dayKey(start))
  url.searchParams.set('STOP_TIME', dayKey(stop))
  url.searchParams.set('STEP_SIZE', '1 d')
  url.searchParams.set('REF_PLANE', 'ECLIPTIC')
  url.searchParams.set('REF_SYSTEM', 'ICRF')
  url.searchParams.set('OUT_UNITS', 'KM-S')
  if (kind === 'vectors') {
    url.searchParams.set('VEC_TABLE', '2')
    url.searchParams.set('VEC_LABELS', 'NO')
  }
  url.searchParams.set('CSV_FORMAT', 'YES')
  return url
}

export function parseHorizonsVectors(result: string): { epoch: string; jdtdb: number; positionKm: { x: number; y: number; z: number }; velocityKmS: { x: number; y: number; z: number } } | null {
  const start = result.indexOf('$$SOE')
  const end = result.indexOf('$$EOE')
  if (start < 0 || end < start) return null
  const line = result
    .slice(start + 5, end)
    .split(/\r?\n/)
    .map((item) => item.trim())
    .find((item) => item.length > 0 && !item.startsWith('$$'))
  if (!line) return null
  const parts = line.split(',').map((item) => item.trim())
  if (parts.length < 8) return null
  const jdtdb = Number(parts[0])
  const epoch = parts[1]
  const numbers = parts.slice(2, 8).map(Number)
  if (!Number.isFinite(jdtdb) || numbers.some((value) => !Number.isFinite(value))) return null
  return {
    epoch,
    jdtdb,
    positionKm: { x: numbers[0], y: numbers[1], z: numbers[2] },
    velocityKmS: { x: numbers[3], y: numbers[4], z: numbers[5] },
  }
}

const ELEMENT_KEYS = {
  EC: 'eccentricity',
  QR: 'periapsisKm',
  IN: 'inclinationDeg',
  OM: 'longitudeOfAscendingNodeDeg',
  W: 'argumentOfPeriapsisDeg',
  A: 'semiMajorAxisKm',
  AD: 'apoapsisKm',
  PR: 'periodDays',
  MA: 'meanAnomalyDeg',
} as const

const CSV_ELEMENT_ORDER = ['JDTDB', 'Calendar Date (TDB)', 'EC', 'QR', 'IN', 'OM', 'W', 'Tp', 'N', 'MA', 'TA', 'A', 'AD', 'PR']

export function parseHorizonsElements(result: string) {
  const start = result.indexOf('$$SOE')
  const end = result.indexOf('$$EOE')
  if (start < 0 || end < start) return null
  const block = result.slice(start + 5, end)
  const line = block
    .split(/\r?\n/)
    .map((item) => item.trim())
    .find((item) => item.length > 0 && !item.startsWith('$$'))
  if (!line) return null
  if (line.includes('=')) return parseLabeledElements(block)
  const parts = line.split(',').map((item) => item.trim())
  const legend = result
    .slice(0, start)
    .split(/\r?\n/)
    .map((item) => item.trim())
    .reverse()
    .find((item) => item.includes('JDTDB') && item.includes('EC'))
  const headers = legend
    ? legend.replace(/,\s*$/, '').split(',').map((item) => item.trim())
    : CSV_ELEMENT_ORDER
  const byName = new Map<string, number>()
  headers.forEach((header, index) => {
    const value = Number(parts[index])
    if (Number.isFinite(value)) byName.set(header, value)
  })
  const eccentricity = byName.get('EC')
  const semiMajorAxisKm = byName.get('A')
  const periodSeconds = byName.get('PR')
  if (eccentricity === undefined && semiMajorAxisKm === undefined && periodSeconds === undefined) return null
  return {
    epoch: parts[1] ?? '',
    eccentricity,
    periapsisKm: byName.get('QR'),
    inclinationDeg: byName.get('IN'),
    longitudeOfAscendingNodeDeg: byName.get('OM'),
    argumentOfPeriapsisDeg: byName.get('W'),
    semiMajorAxisKm,
    apoapsisKm: byName.get('AD'),
    periodDays: periodSeconds === undefined ? undefined : periodSeconds / 86400,
    meanAnomalyDeg: byName.get('MA'),
  }
}

function parseLabeledElements(block: string) {
  const epoch = block.match(/A\.D\.\s+[0-9]{4}-[A-Za-z]{3}-[0-9]{2}[^,]*/)?.[0]?.trim() ?? ''
  const values: Partial<Record<(typeof ELEMENT_KEYS)[keyof typeof ELEMENT_KEYS], number>> = {}
  for (const key of Object.keys(ELEMENT_KEYS) as (keyof typeof ELEMENT_KEYS)[]) {
    const match = block.match(new RegExp(`(?:^|[,\\s])${key}\\s*=\\s*([+-]?(?:\\d+\\.?\\d*|\\.\\d+)(?:[Ee][+-]?\\d+)?)`))
    if (!match) continue
    const value = Number(match[1])
    if (Number.isFinite(value)) values[ELEMENT_KEYS[key]] = value
  }
  if (values.eccentricity === undefined && values.semiMajorAxisKm === undefined && values.periodDays === undefined) return null
  return { epoch, ...values }
}

export function separationKm(
  a: { positionKm: { x: number; y: number; z: number } },
  b: { positionKm: { x: number; y: number; z: number } },
) {
  return Math.hypot(b.positionKm.x - a.positionKm.x, b.positionKm.y - a.positionKm.y, b.positionKm.z - a.positionKm.z)
}

async function readDiskCache() {
  try {
    const raw = await readFile(cacheFile, 'utf8')
    const parsed = JSON.parse(raw) as {
      vectors?: Record<string, { savedAt: number; sample: HorizonsSample }>
      elements?: Record<string, { savedAt: number; sample: HorizonsElements }>
    }
    for (const [key, entry] of Object.entries(parsed.vectors ?? {})) {
      const body = key.split(':')[0]
      if (entry?.sample?.positionKm && isHorizonsBody(body) && !vectorCache.has(key)) vectorCache.set(key, entry)
    }
    for (const [key, entry] of Object.entries(parsed.elements ?? {})) {
      const body = key.split(':')[0]
      if (entry?.sample?.command && isHorizonsBody(body) && !elementCache.has(key)) elementCache.set(key, entry)
    }
  } catch {
    /* no cache yet */
  }
}

async function writeDiskCache() {
  try {
    await mkdir(path.dirname(cacheFile), { recursive: true })
    const payload = {
      vectors: Object.fromEntries(vectorCache),
      elements: Object.fromEntries(elementCache),
    }
    await writeFile(cacheFile, JSON.stringify(payload))
  } catch {
    /* cache is optional */
  }
}

function ttlFor(epoch: Date, now: Date) {
  return dayKey(epoch) === dayKey(now) ? CURRENT_TTL_MS : ARCHIVE_TTL_MS
}

export async function getHorizonsBody(
  body: HorizonsBodyId,
  options: { fetchImpl?: typeof fetch; now?: Date; epoch?: Date; timeoutMs?: number; force?: boolean } = {},
): Promise<HorizonsSample> {
  await readDiskCache()
  const now = options.now ?? new Date()
  const epoch = options.epoch ?? now
  const key = `${body}:${dayKey(epoch)}`
  const cached = vectorCache.get(key)
  if (cached && !options.force && now.getTime() - cached.savedAt < ttlFor(epoch, now)) {
    return { ...cached.sample, stale: false }
  }
  const spec = HORIZONS_BODIES[body]
  const fetchImpl = options.fetchImpl ?? fetch
  const timeoutMs = options.timeoutMs ?? 12000
  try {
    const response = await fetchImpl(horizonsQuery(spec.command, epoch), { signal: AbortSignal.timeout(timeoutMs) })
    if (!response.ok) throw new Error(`Horizons returned HTTP ${response.status}`)
    const payload = (await response.json()) as { result?: unknown; error?: unknown }
    if (typeof payload.result !== 'string') throw new Error('Horizons did not return a result table.')
    const parsed = parseHorizonsVectors(payload.result)
    if (!parsed) throw new Error('Horizons result had no vector table.')
    const rangeKm = Math.hypot(parsed.positionKm.x, parsed.positionKm.y, parsed.positionKm.z)
    const speedKmS = Math.hypot(parsed.velocityKmS.x, parsed.velocityKmS.y, parsed.velocityKmS.z)
    const sample: HorizonsSample = {
      body,
      name: spec.name,
      command: spec.command,
      center: '500@10',
      referencePlane: 'ECLIPTIC',
      referenceSystem: 'ICRF',
      units: { position: 'km', velocity: 'km/s' },
      epoch: parsed.epoch,
      jdtdb: parsed.jdtdb,
      positionKm: parsed.positionKm,
      velocityKmS: parsed.velocityKmS,
      rangeKm,
      speedKmS,
      source: HORIZONS_ATTRIBUTION,
      sourceUrl: HORIZONS_SOURCE,
      docsUrl: HORIZONS_DOCS,
      fetchedAt: now.toISOString(),
      stale: false,
      dataClass: 'horizons-vector',
    }
    vectorCache.set(key, { savedAt: now.getTime(), sample })
    await writeDiskCache()
    return sample
  } catch (error) {
    if (cached) {
      const message = error instanceof Error ? error.message : 'Horizons request failed'
      return { ...cached.sample, stale: true, warning: `Showing the last cached ephemeris. ${message}` }
    }
    throw error
  }
}

export async function getHorizonsElements(
  body: HorizonsBodyId,
  options: { fetchImpl?: typeof fetch; now?: Date; epoch?: Date; timeoutMs?: number; force?: boolean } = {},
): Promise<HorizonsElements> {
  await readDiskCache()
  const now = options.now ?? new Date()
  const epoch = options.epoch ?? now
  const key = `${body}:${dayKey(epoch)}`
  const cached = elementCache.get(key)
  if (cached && !options.force && now.getTime() - cached.savedAt < ttlFor(epoch, now)) {
    return { ...cached.sample, stale: false }
  }
  const spec = HORIZONS_BODIES[body]
  const fetchImpl = options.fetchImpl ?? fetch
  const timeoutMs = options.timeoutMs ?? 12000
  try {
    const response = await fetchImpl(horizonsQuery(spec.command, epoch, 'elements'), { signal: AbortSignal.timeout(timeoutMs) })
    if (!response.ok) throw new Error(`Horizons returned HTTP ${response.status}`)
    const payload = (await response.json()) as { result?: unknown }
    if (typeof payload.result !== 'string') throw new Error('Horizons did not return an elements table.')
    const parsed = parseHorizonsElements(payload.result)
    if (!parsed) throw new Error('Horizons result had no orbital elements.')
    const sample: HorizonsElements = {
      body,
      name: spec.name,
      command: spec.command,
      center: '500@10',
      referencePlane: 'ECLIPTIC',
      referenceSystem: 'ICRF',
      epoch: parsed.epoch,
      eccentricity: parsed.eccentricity,
      periapsisKm: parsed.periapsisKm,
      inclinationDeg: parsed.inclinationDeg,
      longitudeOfAscendingNodeDeg: parsed.longitudeOfAscendingNodeDeg,
      argumentOfPeriapsisDeg: parsed.argumentOfPeriapsisDeg,
      semiMajorAxisKm: parsed.semiMajorAxisKm,
      apoapsisKm: parsed.apoapsisKm,
      periodDays: parsed.periodDays,
      meanAnomalyDeg: parsed.meanAnomalyDeg,
      source: HORIZONS_ATTRIBUTION,
      sourceUrl: HORIZONS_SOURCE,
      docsUrl: HORIZONS_DOCS,
      fetchedAt: now.toISOString(),
      stale: false,
      dataClass: 'horizons-elements',
      unitsNote: 'Parsed from the Horizons ELEMENTS table with OUT_UNITS=KM-S. Distances are kilometres and angles are degrees. In that table PR is seconds, so periodDays is PR / 86400.',
    }
    elementCache.set(key, { savedAt: now.getTime(), sample })
    await writeDiskCache()
    return sample
  } catch (error) {
    if (cached) {
      const message = error instanceof Error ? error.message : 'Horizons request failed'
      return { ...cached.sample, stale: true, warning: `Showing the last cached elements. ${message}` }
    }
    throw error
  }
}

export function isHorizonsBody(value: string): value is HorizonsBodyId {
  return value in HORIZONS_BODIES
}

export async function getHorizonsBodyChecked(
  body: string,
  options: { fetchImpl?: typeof fetch; now?: Date; epoch?: Date; timeoutMs?: number; force?: boolean } = {},
) {
  if (!isHorizonsBody(body)) throw new Error(`Unknown Horizons target "${body}".`)
  return getHorizonsBody(body, options)
}

export function clearHorizonsCache() {
  vectorCache.clear()
  elementCache.clear()
}

export async function refreshCurrentEpoch() {
  const ids = Object.keys(HORIZONS_BODIES) as HorizonsBodyId[]
  const errors: { body: string; message: string }[] = []
  for (const id of ids) {
    try {
      await getHorizonsBody(id)
    } catch (error) {
      errors.push({ body: id, message: error instanceof Error ? error.message : 'Horizons request failed' })
    }
  }
  return { requested: ids.length, errors }
}
