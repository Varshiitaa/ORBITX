import { useEffect, useState } from 'react'
import { PageHeader } from '../components/ui'
import { EphemerisScene } from '../components/scene/EphemerisScene'
import { fetchHorizons, type HorizonsCatalog } from '../services/horizons'
import { km } from '../utils/format'

function coord(value: number) {
  return `${value.toExponential(4)} km`
}

export function NasaPage() {
  const [catalog, setCatalog] = useState<HorizonsCatalog | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    fetchHorizons()
      .then((next) => {
        if (!cancelled) setCatalog(next)
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'NASA/JPL Horizons is unavailable.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const stale = catalog?.bodies.some((body) => body.stale) ?? false

  return (
    <div>
      <PageHeader
        kicker="NASA data explorer"
        title="Where the planets are."
        description="Positions come from the NASA/JPL Horizons vector ephemeris, center 500@10 (Sun), ecliptic ICRF, kilometres and kilometres per second. Planet sizes in the view are enlarged. Spacecraft trajectories in the mission simulation are not these data."
      />
      {loading ? <p className="text-sm text-mute">Requesting Horizons through the ORBITX server…</p> : null}
      {error ? (
        <section className="panel border-bad/50 p-5">
          <p className="kicker">Horizons unavailable</p>
          <p className="mt-2 text-sm text-mute">{error} No substitute ephemeris is being shown.</p>
        </section>
      ) : null}
      {stale ? (
        <p className="mb-4 rounded-xl border border-warn/40 px-4 py-3 text-sm text-warn">
          At least one body is showing the last successful cache because the live request failed.
        </p>
      ) : null}
      {catalog && catalog.bodies.length > 0 ? (
        <>
          <div className="h-[420px] overflow-hidden rounded-2xl border border-line">
            <EphemerisScene samples={catalog.bodies} />
          </div>
          <p className="mt-3 text-xs text-faint">
            {catalog.attribution}{' '}
            <a className="text-accent" href={catalog.sourceUrl} target="_blank" rel="noreferrer">Official Horizons source</a>
            . Visual scale is artistic. The Moon sits near Earth because the view spans the outer planet.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {catalog.bodies.map((body) => (
              <article key={body.body} className={`panel p-4 ${body.stale ? 'border-warn/50' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-display text-2xl">{body.name}</h2>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">COMMAND {body.command}</span>
                </div>
                <p className="mt-2 text-xs text-faint">Epoch {body.epoch} · JD {body.jdtdb.toFixed(1)} · updated {new Date(body.fetchedAt).toLocaleString()}</p>
                {body.warning ? <p className="mt-2 text-xs text-warn">{body.warning}</p> : null}
                <dl className="mt-3 space-y-1 text-sm">
                  <div className="flex justify-between gap-3"><dt className="text-mute">X Y Z</dt><dd className="num text-right text-xs">{coord(body.positionKm.x)}<br />{coord(body.positionKm.y)}<br />{coord(body.positionKm.z)}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-mute">Velocity</dt><dd className="num text-xs">{body.velocityKmS.x.toFixed(3)}, {body.velocityKmS.y.toFixed(3)}, {body.velocityKmS.z.toFixed(3)} km/s</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-mute">Range from the Sun</dt><dd className="num">{km(body.rangeKm)}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-mute">Speed</dt><dd className="num">{body.speedKmS.toFixed(2)} km/s</dd></div>
                </dl>
                <p className="mt-3 text-xs text-faint">Range and speed are derived from the Horizons state vector. Frame {body.referencePlane} {body.referenceSystem}, center {body.center}.</p>
              </article>
            ))}
          </div>
          {catalog.errors.length > 0 ? (
            <ul className="mt-4 space-y-1 text-sm text-bad">
              {catalog.errors.map((item) => <li key={item.body}>{item.body}: {item.message}</li>)}
            </ul>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
