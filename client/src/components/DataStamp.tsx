import type { SpaceBody, SpaceCatalog } from '../services/space'

export function DataStamp({ body }: { body: SpaceBody }) {
  const rows = [
    ['Provider', 'NASA/JPL Horizons'],
    ['Object', `${body.name} · command ${body.command}`],
    ['Frame', `${body.center} · ${body.referencePlane}`],
    ['System', body.referenceSystem],
    ['Units', `${body.units.position}, ${body.units.velocity}`],
    ['Epoch', body.epoch],
    ['Retrieved', new Date(body.fetchedAt).toLocaleString()],
    ['Status', body.dataClass === 'coordinate-origin' ? 'Coordinate origin' : body.stale ? 'Cached' : 'Live epoch'],
  ]
  return (
    <div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-faint">{label}</dt>
            <dd className="mt-0.5 text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      {body.note ? <p className="mt-3 text-xs leading-relaxed text-mute">{body.note}</p> : null}
      {body.warning ? <p className="mt-3 text-xs text-warn">{body.warning}</p> : null}
      <Attribution docsUrl={body.docsUrl} />
    </div>
  )
}

export function Attribution({ docsUrl }: { docsUrl?: string }) {
  return (
    <p className="mt-3 text-[11px] leading-relaxed text-faint">
      Planetary ephemeris data provided by NASA/JPL Horizons.{' '}
      <a className="text-accent" href={docsUrl || 'https://ssd-api.jpl.nasa.gov/doc/horizons.html'} target="_blank" rel="noreferrer">
        Official documentation
      </a>
    </p>
  )
}

export function CatalogStatus({ catalog, loading, error }: { catalog: SpaceCatalog | null; loading: boolean; error: string }) {
  const live = catalog?.bodies.find((body) => body.dataClass === 'horizons-vector')
  const stale = catalog?.bodies.some((body) => body.stale) ?? false
  return (
    <div className="text-[11px] leading-relaxed text-faint">
      {loading ? <p>Requesting planetary vectors from NASA/JPL Horizons…</p> : null}
      {error ? <p className="text-warn">{error} No substitute positions are being drawn.</p> : null}
      {live ? (
        <p>
          {stale ? 'Cached ephemeris' : 'Live-epoch ephemeris'} · epoch {live.epoch} · retrieved {new Date(live.fetchedAt).toLocaleString()}
        </p>
      ) : null}
      {catalog?.errors.length ? <p className="text-warn">{catalog.errors.map((item) => `${item.body}: ${item.message}`).join(' ')}</p> : null}
    </div>
  )
}
