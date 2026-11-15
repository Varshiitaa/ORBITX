import { Canvas, useFrame } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Attribution, DataStamp } from '../components/DataStamp'
import { Planet } from '../components/scene/planets'
import { BODY_ORDER, PLANET_COPY } from '../space/copy'
import { fetchSpaceBody, fetchSpaceElements, type SpaceBody, type SpaceElements } from '../services/space'
import { km } from '../utils/format'

function Portrait({ kind }: { kind: string }) {
  const spin = useRef<import('three').Group>(null)
  useFrame((_, delta) => {
    if (spin.current) spin.current.rotation.y += delta * 0.15
  })
  return (
    <group ref={spin}>
      <Planet kind={kind} radius={1} />
    </group>
  )
}

export function PlanetPage() {
  const { bodyId = 'earth' } = useParams()
  const [params, setParams] = useSearchParams()
  const epoch = params.get('epoch') ?? ''
  const [body, setBody] = useState<SpaceBody | null>(null)
  const [elements, setElements] = useState<SpaceElements | null>(null)
  const [elementNote, setElementNote] = useState('')
  const [error, setError] = useState('')
  const [elementError, setElementError] = useState('')
  const [loading, setLoading] = useState(true)
  const known = (BODY_ORDER as readonly string[]).includes(bodyId)
  const index = BODY_ORDER.indexOf(bodyId as (typeof BODY_ORDER)[number])
  const previous = BODY_ORDER[(index + BODY_ORDER.length - 1) % BODY_ORDER.length]
  const next = BODY_ORDER[(index + 1) % BODY_ORDER.length]
  const query = epoch ? `?epoch=${epoch}` : ''

  useEffect(() => {
    if (!known) return
    let cancelled = false
    setLoading(true)
    setError('')
    setElementError('')
    setElementNote('')
    setBody(null)
    setElements(null)
    void fetchSpaceBody(bodyId, epoch || undefined)
      .then((nextBody) => {
        if (!cancelled) setBody(nextBody)
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'Horizons is unavailable.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    void fetchSpaceElements(bodyId, epoch || undefined)
      .then((nextElements) => {
        if (cancelled) return
        if ('elements' in nextElements && nextElements.elements === null) {
          setElementNote(nextElements.note || 'No heliocentric elements for this object.')
          return
        }
        setElements(nextElements)
      })
      .catch((reason: unknown) => {
        if (!cancelled) setElementError(reason instanceof Error ? reason.message : 'Elements are unavailable.')
      })
    return () => {
      cancelled = true
    }
  }, [bodyId, epoch, known])

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="font-mono text-[11px] tracking-[0.16em] text-cyan-300">PLANET EXPLORER</p>
        <label className="font-mono text-[11px] text-slate-400">
          Epoch
          <input
            type="date"
            min="1800-01-01"
            max="2200-12-31"
            value={epoch}
            onChange={(event) => {
              const nextParams = new URLSearchParams(params)
              if (event.target.value) nextParams.set('epoch', event.target.value)
              else nextParams.delete('epoch')
              setParams(nextParams)
            }}
            className="ml-2 rounded-full border border-cyan-900/60 bg-[#0b0e18] px-3 py-1 text-cyan-100"
          />
        </label>
      </div>
      {!known ? (
        <p className="px-8 py-10 text-sm text-mute">That body is not in the ORBITX catalog.</p>
      ) : (
        <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div className="hud-card relative h-[58svh] overflow-hidden">
            <Canvas camera={{ position: [0, 0.2, 4.2], fov: 34 }} dpr={[1, 1.5]}>
              <color attach="background" args={['#07090f']} />
              <ambientLight intensity={0.28} />
              <directionalLight position={[3.5, 1.6, 2.4]} intensity={1.6} color="#fff4e5" />
              <Stars radius={40} depth={20} count={800} factor={2} fade />
              <Portrait kind={bodyId} />
            </Canvas>
            <p className="absolute bottom-4 left-5 max-w-sm text-[11px] leading-relaxed text-faint">
              Portrait view. The sphere’s size and spin are visual. The numbers beside it are the Horizons state.
            </p>
          </div>
          <article className="border-t border-line px-5 py-6 lg:border-l lg:border-t-0 md:px-8">
            <div className="flex items-center justify-between gap-3 text-sm">
              <Link to={`/explore/${previous}${query}`} className="text-mute hover:text-ink">{previous}</Link>
              <Link to={`/explore${query ? `?epoch=${epoch}&focus=${bodyId}` : `?focus=${bodyId}`}`} className="text-accent">Solar system</Link>
              <Link to={`/explore/${next}${query}`} className="text-mute hover:text-ink">{next}</Link>
            </div>
            <h1 className="mt-4 font-display text-4xl">{body?.name ?? bodyId}</h1>
            <p className="mt-3 text-sm leading-relaxed text-mute">{PLANET_COPY[bodyId]}</p>
            <p className="mt-1 text-[11px] text-faint">Editorial description. Not a Horizons product.</p>
            {loading ? <p className="mt-6 text-sm text-mute">Requesting the Horizons state vector…</p> : null}
            {error ? <p className="mt-6 text-sm text-warn">{error} No substitute state is shown.</p> : null}
            {body ? (
              <dl className="mt-6 space-y-2 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-faint">Position</dt><dd className="text-right font-mono text-xs">{body.positionKm.x.toExponential(3)}, {body.positionKm.y.toExponential(3)}, {body.positionKm.z.toExponential(3)} km</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-faint">Velocity</dt><dd className="text-right font-mono text-xs">{body.velocityKmS.x.toFixed(3)}, {body.velocityKmS.y.toFixed(3)}, {body.velocityKmS.z.toFixed(3)} km/s</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-faint">Distance from the Sun</dt><dd>{body.dataClass === 'coordinate-origin' ? 'Origin' : km(body.rangeKm)}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-faint">Speed</dt><dd>{body.speedKmS.toFixed(3)} km/s</dd></div>
              </dl>
            ) : null}
            <section className="mt-6">
              <h2 className="text-sm text-ink">Orbital elements</h2>
              {elementNote ? <p className="mt-2 text-sm text-mute">{elementNote}</p> : null}
              {elementError ? <p className="mt-2 text-sm text-warn">{elementError}</p> : null}
              {elements ? (
                <>
                  <dl className="mt-3 space-y-2 text-sm">
                    {elements.periodDays !== undefined ? <div className="flex justify-between gap-4"><dt className="text-faint">Period</dt><dd>{elements.periodDays.toFixed(2)} days</dd></div> : null}
                    {elements.eccentricity !== undefined ? <div className="flex justify-between gap-4"><dt className="text-faint">Eccentricity</dt><dd>{elements.eccentricity.toFixed(5)}</dd></div> : null}
                    {elements.semiMajorAxisKm !== undefined ? <div className="flex justify-between gap-4"><dt className="text-faint">Semi-major axis</dt><dd>{km(elements.semiMajorAxisKm)}</dd></div> : null}
                    {elements.inclinationDeg !== undefined ? <div className="flex justify-between gap-4"><dt className="text-faint">Inclination</dt><dd>{elements.inclinationDeg.toFixed(3)}°</dd></div> : null}
                    {elements.periapsisKm !== undefined ? <div className="flex justify-between gap-4"><dt className="text-faint">Periapsis</dt><dd>{km(elements.periapsisKm)}</dd></div> : null}
                    {elements.apoapsisKm !== undefined ? <div className="flex justify-between gap-4"><dt className="text-faint">Apoapsis</dt><dd>{km(elements.apoapsisKm)}</dd></div> : null}
                  </dl>
                  <p className="mt-3 text-[11px] leading-relaxed text-faint">{elements.unitsNote}</p>
                  <p className="mt-2 text-[11px] text-faint">
                    Elements epoch {elements.epoch} · retrieved {new Date(elements.fetchedAt).toLocaleString()} · {elements.stale ? 'cached' : 'live epoch'}
                  </p>
                  {elements.warning ? <p className="mt-2 text-xs text-warn">{elements.warning}</p> : null}
                </>
              ) : null}
            </section>
            {body ? <div className="mt-6"><DataStamp body={body} /></div> : <Attribution />}
          </article>
        </div>
      )}
    </div>
  )
}
