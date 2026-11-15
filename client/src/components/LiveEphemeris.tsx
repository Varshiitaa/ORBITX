import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchSpaceBody, type SpaceBody } from '../services/space'
import { km } from '../utils/format'

const DESTINATION_BODY: Record<string, string | null> = {
  lunar: 'moon',
  earth: 'earth',
  venus: 'venus',
  mars: 'mars',
  jupiter: 'jupiter',
  asteroid: null,
}

export function LiveEphemeris({ destinationId }: { destinationId: string | null }) {
  const bodyId = destinationId ? DESTINATION_BODY[destinationId] ?? null : null
  const [body, setBody] = useState<SpaceBody | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!bodyId) return
    let cancelled = false
    setBody(null)
    setError('')
    void fetchSpaceBody(bodyId)
      .then((next) => {
        if (!cancelled) setBody(next)
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'Horizons is unavailable.')
      })
    return () => {
      cancelled = true
    }
  }, [bodyId])

  return (
    <section className="mb-5 rounded-2xl border border-line px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.16em] text-faint">Destination, live Horizons state</p>
        <p className="text-[11px] uppercase tracking-[0.16em] text-faint">Spacecraft fuel, battery, and health below are simulated</p>
      </div>
      {!destinationId ? (
        <p className="mt-2 text-sm text-mute">Choose a destination to compare its live Horizons state with the simulated flight.</p>
      ) : !bodyId ? (
        <p className="mt-2 text-sm text-mute">This destination has no Horizons major-body command in ORBITX. The flight stays an educational simulation.</p>
      ) : error ? (
        <p className="mt-2 text-sm text-warn">{error} The live state is omitted. The simulation is still available.</p>
      ) : body ? (
        <p className="mt-2 text-sm text-mute">
          {body.name} is {km(body.rangeKm)} from the Sun at {body.speedKmS.toFixed(2)} km/s. Epoch {body.epoch}. {body.stale ? 'Cached.' : 'Live epoch.'}{' '}
          <Link to={`/explore/${body.body}`} className="text-accent">Open the planet</Link>
        </p>
      ) : (
        <p className="mt-2 text-sm text-mute">Requesting the destination’s Horizons vector…</p>
      )}
      <p className="mt-2 text-[11px] text-faint">Planetary ephemeris data provided by NASA/JPL Horizons. The animated transfer is not this ephemeris.</p>
    </section>
  )
}
