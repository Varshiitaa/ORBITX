import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, PageHeader } from '../components/ui'
import { DifficultyPicker, ScoreGrid } from '../games/GameChrome'
import { writeGameResult } from '../games/history'
import { applyControl, circularSpeedKmS, createApproach, orbitChallenge, scoreOrbit, targetRadiusKm, type OrbitCraft } from '../games/orbit'
import type { Difficulty } from '../types'

export function OrbitMasterPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner')
  const challenge = orbitChallenge(difficulty)
  const [burn, setBurn] = useState(8)
  const [craft, setCraft] = useState<OrbitCraft>(() => createApproach(challenge))
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const recorded = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return
    const width = canvas.width
    const height = canvas.height
    const target = targetRadiusKm(challenge)
    const view = Math.max(target * 1.7, craft.radiusKm * 1.35)
    const scale = (Math.min(width, height) * 0.42) / view
    const cx = width / 2
    const cy = height / 2
    context.clearRect(0, 0, width, height)
    context.fillStyle = '#07090f'
    context.fillRect(0, 0, width, height)
    context.strokeStyle = '#23486e'
    context.setLineDash([4, 6])
    context.beginPath()
    context.arc(cx, cy, target * scale, 0, Math.PI * 2)
    context.stroke()
    context.setLineDash([])
    const gradient = context.createRadialGradient(cx - 20, cy - 20, 10, cx, cy, challenge.body.radiusKm * scale)
    gradient.addColorStop(0, challenge.body.id === 'mars' ? '#e7a08a' : challenge.body.id === 'moon' ? '#d5dbe3' : '#8eb7e8')
    gradient.addColorStop(1, challenge.body.id === 'mars' ? '#8a3d32' : '#1a4e86')
    context.fillStyle = gradient
    context.beginPath()
    context.arc(cx, cy, challenge.body.radiusKm * scale, 0, Math.PI * 2)
    context.fill()
    const x = cx + Math.cos(craft.angleRad) * craft.radiusKm * scale
    const y = cy + Math.sin(craft.angleRad) * craft.radiusKm * scale
    context.strokeStyle = '#9fd0ff'
    context.beginPath()
    context.moveTo(x, y)
    context.lineTo(x + Math.cos(craft.angleRad + Math.PI / 2) * 18, y + Math.sin(craft.angleRad + Math.PI / 2) * 18)
    context.stroke()
    context.fillStyle = '#e8eef7'
    context.fillRect(x - 5, y - 3, 10, 6)
    context.fillStyle = '#9fd0ff'
    context.fillRect(x - 12, y - 1, 7, 2)
    context.fillRect(x + 5, y - 1, 7, 2)
  }, [challenge, craft])

  useEffect(() => {
    if (craft.status === 'flying' || recorded.current) return
    recorded.current = true
    const score = scoreOrbit(craft, challenge)
    writeGameResult({
      game: 'orbit',
      difficulty,
      won: score.won,
      score: score.total,
      summary: craft.note,
      fuelFraction: craft.fuelKg / challenge.fuelKg,
    })
  }, [craft, challenge, difficulty])

  const score = craft.status === 'flying' ? null : scoreOrbit(craft, challenge)
  const altitude = craft.radiusKm - challenge.body.radiusKm
  const speed = Math.hypot(craft.radialKmS, craft.tangentialKmS)

  function reset(next: Difficulty = difficulty) {
    recorded.current = false
    setDifficulty(next)
    setCraft(createApproach(orbitChallenge(next)))
    setBurn(next === 'expert' ? 6 : 8)
  }

  function burnNow(direction: -1 | 0 | 1) {
    setCraft((current) => applyControl(current, challenge, { direction, burnSeconds: direction === 0 ? 0 : burn }))
  }

  return (
    <div>
      <PageHeader
        kicker="Orbit Master"
        title="Put the spacecraft on the circle."
        description="A two-body model: gravity is μ/r² and thrust changes tangential speed. Match the dashed target orbit. This is an educational propagator, not a flight-certified simulator."
        actions={<Link to="/app/games" className="text-sm text-accent">All games</Link>}
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <DifficultyPicker value={difficulty} disabled={craft.status === 'flying' && craft.elapsedS > 0} onChange={reset} />
        <p className="text-sm text-faint">{challenge.body.name} · target {challenge.targetAltitudeKm} km</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="overflow-hidden rounded-2xl border border-line bg-space-950">
          <canvas ref={canvasRef} width={900} height={560} className="h-auto w-full" aria-label="Orbital view" />
        </div>
        <aside className="panel space-y-4 p-4">
          <p className="text-sm leading-relaxed text-mute">{craft.note}</p>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-mute">Altitude</dt><dd className="num">{altitude.toFixed(1)} km</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-mute">Speed</dt><dd className="num">{speed.toFixed(3)} km/s</dd></div>
            {challenge.showTargetSpeed ? (
              <div className="flex justify-between gap-3"><dt className="text-mute">Circular speed</dt><dd className="num">{circularSpeedKmS(challenge).toFixed(3)} km/s</dd></div>
            ) : (
              <p className="text-xs text-faint" title="Expert hides the target speed.">Expert hides the target speed. Use altitude and the note.</p>
            )}
            <div className="flex justify-between gap-3"><dt className="text-mute">Fuel</dt><dd className="num">{craft.fuelKg.toFixed(1)} kg</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-mute">Eccentricity</dt><dd className="num">{craft.eccentricity.toFixed(3)}</dd></div>
          </dl>
          <label className="block text-sm text-mute">
            Burn duration · {burn.toFixed(0)} s
            <input
              type="range"
              min={1}
              max={challenge.maxBurnSeconds}
              value={burn}
              disabled={craft.status !== 'flying'}
              onChange={(event) => setBurn(Number(event.target.value))}
              className="mt-2 w-full"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Button disabled={craft.status !== 'flying'} title="Add tangential speed" onClick={() => burnNow(1)}>Prograde</Button>
            <Button variant="secondary" disabled={craft.status !== 'flying'} title="Remove tangential speed" onClick={() => burnNow(-1)}>Retrograde</Button>
          </div>
          <Button variant="secondary" className="w-full" disabled={craft.status !== 'flying'} title="Coast without thrusting" onClick={() => burnNow(0)}>Coast</Button>
          <Button variant="quiet" onClick={() => reset()}>Restart</Button>
        </aside>
      </div>
      {score ? (
        <section className={`panel mt-4 p-5 ${score.won ? 'border-good/50' : 'border-bad/50'}`}>
          <p className="kicker">{score.won ? 'Stable orbit' : 'Insertion failed'}</p>
          <h2 className="mt-2 font-display text-3xl">{score.won ? 'Target orbit captured.' : craft.status === 'crash' ? 'Impact.' : craft.status === 'escape' ? 'Escape trajectory.' : 'Fuel exhausted.'}</h2>
          <div className="mt-4">
            <ScoreGrid rows={[
              { label: 'Score', value: String(score.total) },
              { label: 'Accuracy', value: String(score.accuracy) },
              { label: 'Fuel', value: String(score.fuel) },
              { label: 'Safety', value: String(score.safety) },
            ]} />
          </div>
        </section>
      ) : null}
    </div>
  )
}
