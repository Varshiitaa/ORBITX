import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CatalogStatus, DataStamp } from '../components/DataStamp'
import { SolarSystem } from '../components/scene/SolarSystem'
import { useSpaceCatalog } from '../hooks/useSpaceCatalog'
import { BODY_ORDER, PLANET_COPY } from '../space/copy'
import { VISUAL_SCALE_NOTE } from '../space/scale'
import { km } from '../utils/format'

export function ExplorePage() {
  const [params, setParams] = useSearchParams()
  const epoch = params.get('epoch') ?? ''
  const focus = params.get('focus')
  const { catalog, error, loading } = useSpaceCatalog(epoch)
  const [picked, setPicked] = useState<string | null>(focus)
  const selected = picked ?? focus
  const body = catalog?.bodies.find((item) => item.body === selected) ?? null
  const ordered = BODY_ORDER.map((id) => catalog?.bodies.find((item) => item.body === id)).filter((item) => item != null)

  return (
    <div>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] tracking-[0.16em] text-cyan-300">STAR MAP</p>
          <h1 className="font-display text-3xl text-white">Solar system</h1>
        </div>
        <label className="font-mono text-[11px] text-slate-400">
          Epoch
          <input
            type="date"
            min="1800-01-01"
            max="2200-12-31"
            value={epoch}
            onChange={(event) => {
              const next = new URLSearchParams(params)
              if (event.target.value) next.set('epoch', event.target.value)
              else next.delete('epoch')
              setParams(next)
            }}
            className="ml-2 rounded-full border border-cyan-900/60 bg-[#0b0e18] px-3 py-1 text-cyan-100"
          />
        </label>
      </div>
      <div className="hud-card grid overflow-hidden lg:grid-cols-[200px_minmax(0,1fr)_300px]">
        <aside className="border-b border-line px-4 py-4 lg:border-b-0 lg:border-r">
          <ul className="space-y-1">
            {BODY_ORDER.map((id) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => setPicked(id)}
                  className={`w-full rounded-lg px-3 py-1.5 text-left text-sm ${selected === id ? 'bg-space-800 text-ink' : 'text-mute hover:text-ink'}`}
                >
                  {id[0].toUpperCase() + id.slice(1)}
                </button>
              </li>
            ))}
          </ul>
        </aside>
        <div className="relative h-[62svh]">
          {catalog && catalog.bodies.length > 0 ? (
            <SolarSystem bodies={catalog.bodies} selected={selected} onSelect={setPicked} />
          ) : (
            <div className="grid h-full place-items-center px-6 text-sm text-mute">Waiting for a Horizons catalog.</div>
          )}
        </div>
        <aside className="border-t border-line px-5 py-5 lg:border-l lg:border-t-0">
          {body ? (
            <>
              <h1 className="font-display text-3xl">{body.name}</h1>
              <p className="mt-2 text-sm leading-relaxed text-mute">{PLANET_COPY[body.body]}</p>
              <p className="mt-1 text-[11px] text-faint">Editorial description. Not a Horizons product.</p>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-faint">Distance from the Sun</dt><dd>{body.dataClass === 'coordinate-origin' ? 'Origin' : km(body.rangeKm)}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-faint">Speed</dt><dd>{body.speedKmS.toFixed(3)} km/s</dd></div>
              </dl>
              <div className="mt-4">
                <DataStamp body={body} />
              </div>
              <Link to={`/explore/${body.body}${epoch ? `?epoch=${epoch}` : ''}`} className="mt-4 inline-block text-sm text-accent">
                Planet explorer
              </Link>
            </>
          ) : (
            <p className="text-sm text-mute">Choose a body to read its state vector.</p>
          )}
          <div className="mt-6">
            <CatalogStatus catalog={catalog} loading={loading} error={error} />
            <p className="mt-2 text-[11px] leading-relaxed text-faint">{VISUAL_SCALE_NOTE}</p>
            {ordered.length === 0 && !loading ? null : null}
          </div>
        </aside>
      </div>
    </div>
  )
}
