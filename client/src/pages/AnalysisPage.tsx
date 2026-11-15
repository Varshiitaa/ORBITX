import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { DataStamp } from '../components/DataStamp'
import { BODY_ORDER } from '../space/copy'
import { fetchSpaceComparison, type SpaceComparison } from '../services/space'
import { km } from '../utils/format'

export function AnalysisPage() {
  const [a, setA] = useState('earth')
  const [b, setB] = useState('mars')
  const [epoch, setEpoch] = useState('')
  const [result, setResult] = useState<SpaceComparison | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    fetchSpaceComparison(a, b, epoch || undefined)
      .then((next) => {
        if (!cancelled) setResult(next)
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setResult(null)
          setError(reason instanceof Error ? reason.message : 'The comparison could not be calculated.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [a, b, epoch])

  return (
    <div>
      <p className="font-mono text-[11px] tracking-[0.16em] text-cyan-300">ORBITAL ANALYSIS</p>
      <main className="mt-4 grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        <form className="space-y-4 text-sm" onSubmit={(event) => event.preventDefault()}>
          <label className="block text-faint">
            First body
            <select value={a} onChange={(event) => setA(event.target.value)} className="mt-1 w-full rounded-xl border border-line bg-space-950 px-3 py-2 text-ink">
              {BODY_ORDER.map((id) => <option key={id} value={id}>{id}</option>)}
            </select>
          </label>
          <label className="block text-faint">
            Second body
            <select value={b} onChange={(event) => setB(event.target.value)} className="mt-1 w-full rounded-xl border border-line bg-space-950 px-3 py-2 text-ink">
              {BODY_ORDER.map((id) => <option key={id} value={id}>{id}</option>)}
            </select>
          </label>
          <label className="block text-faint">
            Epoch
            <input type="date" min="1800-01-01" max="2200-12-31" value={epoch} onChange={(event) => setEpoch(event.target.value)} className="mt-1 w-full rounded-xl border border-line bg-transparent px-3 py-2 text-ink" />
          </label>
          <p className="text-xs leading-relaxed text-faint">Leave the date empty for the current epoch. A chosen date asks Horizons for that calendar day.</p>
          <Link to="/explore" className="inline-block text-accent">Open the solar system</Link>
        </form>
        <section>
          <h1 className="font-display text-3xl">Separation</h1>
          {loading ? <p className="mt-4 text-sm text-mute">Calculating from Horizons state vectors…</p> : null}
          {error ? <p className="mt-4 text-sm text-warn">{error} No distance was invented.</p> : null}
          {result ? (
            <>
              <p className="mt-4 font-display text-4xl">{km(result.separationKm)}</p>
              <p className="mt-2 text-sm text-mute">{result.a.name} to {result.b.name}, center to center.</p>
              <div className="mt-6 text-sm">
                <p className="text-faint">Formula</p>
                <p className="mt-1 font-mono text-xs text-ink">{result.formula}</p>
                <p className="mt-3 text-faint">Units</p>
                <p className="mt-1">{result.units}</p>
                <p className="mt-3 text-faint">Assumptions</p>
                <ul className="mt-1 space-y-2 text-mute">
                  {result.assumptions.map((item) => <li key={item}>{item}</li>)}
                </ul>
                <p className="mt-3 text-[11px] uppercase tracking-[0.14em] text-faint">Status · {result.dataClass}</p>
              </div>
              <div className="mt-8 grid gap-6 md:grid-cols-2">
                <div>
                  <h2 className="font-display text-xl">{result.a.name}</h2>
                  <p className="mt-2 font-mono text-xs">{result.a.positionKm.x.toExponential(3)}, {result.a.positionKm.y.toExponential(3)}, {result.a.positionKm.z.toExponential(3)} km</p>
                  <div className="mt-3"><DataStamp body={result.a} /></div>
                </div>
                <div>
                  <h2 className="font-display text-xl">{result.b.name}</h2>
                  <p className="mt-2 font-mono text-xs">{result.b.positionKm.x.toExponential(3)}, {result.b.positionKm.y.toExponential(3)}, {result.b.positionKm.z.toExponential(3)} km</p>
                  <div className="mt-3"><DataStamp body={result.b} /></div>
                </div>
              </div>
            </>
          ) : null}
        </section>
      </main>
    </div>
  )
}
