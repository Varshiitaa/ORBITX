import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'
import { rm } from 'node:fs/promises'
import path from 'node:path'
import { clearHorizonsCache, getHorizonsBody, getHorizonsBodyChecked, parseEpochParam, parseHorizonsElements, parseHorizonsVectors, separationKm } from './horizons.js'

const cacheFile = path.resolve(process.cwd(), 'data', 'horizons-cache.json')

const TABLE = `$$SOE
2460629.500000000, A.D. 2026-Nov-15 00:00:00.0000, 1.230000000000000E+08, -7.650000000000000E+07, 2.100000000000000E+06, -1.520000000000000E+01, 2.340000000000000E+01, 1.200000000000000E-01,
$$EOE`

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('horizons parser', () => {
  it('reads the first vector row', () => {
    const parsed = parseHorizonsVectors(TABLE)
    assert.ok(parsed)
    assert.equal(parsed.jdtdb, 2460629.5)
    assert.equal(parsed.positionKm.x, 1.23e8)
    assert.equal(parsed.velocityKmS.y, 23.4)
  })

  it('rejects a result with no ephemeris block', () => {
    assert.equal(parseHorizonsVectors('No ephemeris for that target.'), null)
  })

  it('reads the CSV elements row Horizons returns for KM-S', () => {
    const seconds = 686.97 * 86400
    const parsed = parseHorizonsElements(`JDTDB, Calendar Date (TDB), EC, QR, IN, OM, W, Tp, N, MA, TA, A, AD, PR,
$$SOE
2461359.500000000, A.D. 2026-Nov-15 00:00:00.0000, 9.339448209386561E-02, 2.066599340930511E+08, 1.847431150178563E+00, 4.948010015886297E+01, 2.866692937334315E+02, 2.461125862365065E+06, 6.064871822302482E-06, 1.224272714759093E+02, 1.308967164501375E+02, 2.279491245214853E+08, 2.492383149499196E+08, ${seconds},
$$EOE`)
    assert.ok(parsed)
    assert.equal(parsed.eccentricity, 0.09339448209386561)
    assert.equal(parsed.semiMajorAxisKm, 2.279491245214853e8)
    assert.equal(parsed.inclinationDeg, 1.847431150178563)
    assert.ok(Math.abs((parsed.periodDays ?? 0) - 686.97) < 1e-6)
  })

  it('reads named elements from the Horizons table', () => {
    const parsed = parseHorizonsElements(`$$SOE
2451544.500000000, A.D. 2000-Jan-01 00:00:00.0000, EC= 1.670000000000000E-02, QR= 1.470000000000000E+08, IN= 1.500000000000000E+00, OM= 1.600000000000000E+02, W = 2.900000000000000E+02, A = 1.496000000000000E+08, AD= 1.520000000000000E+08, PR= 3.650000000000000E+02,
$$EOE`)
    assert.ok(parsed)
    assert.equal(parsed.eccentricity, 0.0167)
    assert.equal(parsed.semiMajorAxisKm, 1.496e8)
    assert.equal(parsed.periodDays, 365)
    assert.equal(parsed.argumentOfPeriapsisDeg, 290)
  })

  it('computes center-to-center separation from two vectors', () => {
    const distance = separationKm(
      { positionKm: { x: 0, y: 0, z: 0 } },
      { positionKm: { x: 3, y: 4, z: 0 } },
    )
    assert.equal(distance, 5)
  })

  it('accepts a calendar epoch and rejects a rolled-over date', () => {
    assert.equal(parseEpochParam('2020-01-01')?.toISOString(), '2020-01-01T00:00:00.000Z')
    assert.equal(parseEpochParam(undefined), undefined)
    assert.throws(() => parseEpochParam('2020-02-31'), /calendar date/)
  })
})

describe('horizons client', () => {
  after(async () => {
    clearHorizonsCache()
    await rm(cacheFile, { force: true })
  })

  it('rejects an unknown target before any request', async () => {
    await assert.rejects(() => getHorizonsBodyChecked('pluto', { fetchImpl: async () => jsonResponse({}) }), /Unknown Horizons target/)
  })

  it('parses a live response and then serves the cache', async () => {
    clearHorizonsCache()
    await rm(cacheFile, { force: true })
    let calls = 0
    const fetchImpl: typeof fetch = async () => {
      calls += 1
      return jsonResponse({ result: TABLE })
    }
    const first = await getHorizonsBody('mars', { fetchImpl, now: new Date('2026-11-15T00:00:00Z') })
    const second = await getHorizonsBody('mars', { fetchImpl, now: new Date('2026-11-15T00:05:00Z') })
    assert.equal(calls, 1)
    assert.equal(first.stale, false)
    assert.equal(second.positionKm.x, 1.23e8)
    assert.equal(second.center, '500@10')
    assert.ok(second.rangeKm > 1e8)
  })

  it('returns the cached sample when the next request times out', async () => {
    clearHorizonsCache()
    await rm(cacheFile, { force: true })
    const fetchImpl: typeof fetch = async () => jsonResponse({ result: TABLE })
    await getHorizonsBody('venus', { fetchImpl, now: new Date('2026-11-15T00:00:00Z') })
    const failing: typeof fetch = async () => {
      throw new Error('The operation was aborted due to timeout')
    }
    const stale = await getHorizonsBody('venus', { fetchImpl: failing, now: new Date('2026-11-15T02:00:00Z'), force: true, timeoutMs: 5 })
    assert.equal(stale.stale, true)
    assert.match(stale.warning ?? '', /cached/i)
    assert.equal(stale.positionKm.x, 1.23e8)
  })

  it('refetches the current epoch after the 15 minute cache window', async () => {
    clearHorizonsCache()
    await rm(cacheFile, { force: true })
    let calls = 0
    const fetchImpl: typeof fetch = async () => {
      calls += 1
      return jsonResponse({ result: TABLE })
    }
    await getHorizonsBody('earth', { fetchImpl, now: new Date('2026-11-15T00:00:00Z') })
    await getHorizonsBody('earth', { fetchImpl, now: new Date('2026-11-15T00:20:00Z') })
    assert.equal(calls, 2)
  })

  it('requests a historical epoch instead of reusing today', async () => {
    clearHorizonsCache()
    await rm(cacheFile, { force: true })
    const requested: string[] = []
    const fetchImpl: typeof fetch = async (input) => {
      requested.push(String(input))
      return jsonResponse({ result: TABLE })
    }
    const now = new Date('2026-11-15T00:00:00Z')
    await getHorizonsBody('mercury', { fetchImpl, now })
    await getHorizonsBody('mercury', { fetchImpl, now, epoch: new Date('2020-01-01T00:00:00Z') })
    assert.equal(requested.length, 2)
    assert.match(requested[1], /START_TIME=2020-01-01/)
    assert.match(requested[1], /COMMAND=%27199%27|COMMAND='199'/)
  })

  it('does not invent a sample when nothing has been cached', async () => {
    clearHorizonsCache()
    await rm(cacheFile, { force: true })
    const fetchImpl: typeof fetch = async () => jsonResponse({ result: 'Cannot find that body.' })
    await assert.rejects(() => getHorizonsBody('jupiter', { fetchImpl, now: new Date('2026-11-15T00:00:00Z') }), /vector table/)
  })
})
