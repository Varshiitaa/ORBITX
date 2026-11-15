import { useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Component, useLayoutEffect, useMemo, useRef } from 'react'
import type { ReactNode, RefObject } from 'react'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { useNavigate } from 'react-router-dom'
import { COMPONENT_CATEGORIES, componentsByCategory, getComponent } from '../data/catalog'
import { useActiveMission } from '../hooks/useActiveMission'
import { designLocked, useMissionStore } from '../store/missionStore'
import type { ComponentCategory } from '../types'
import { dataRate, kg, signedWatts, usd, watts } from '../utils/format'
import { EmptyMission, Meter, PageHeader, SpecRow } from '../components/ui'
import { SpacecraftModel } from '../components/scene/SpacecraftModel'
import { craftGeometry } from '../engine/craft'

function FitCamera({ span, controls }: { span: number; controls: RefObject<OrbitControlsImpl | null> }) {
  const camera = useThree((state) => state.camera)
  useLayoutEffect(() => {
    const distance = Math.max(3.6, span * 1.85)
    camera.position.set(distance * 0.62, distance * 0.36, distance * 0.92)
    camera.near = 0.05
    camera.far = Math.max(40, distance * 8)
    camera.updateProjectionMatrix()
    const orbit = controls.current
    if (!orbit) return
    orbit.target.set(0, 0, 0)
    orbit.minDistance = distance * 0.45
    orbit.maxDistance = distance * 3
    orbit.update()
  }, [camera, controls, span])
  return null
}

class ViewBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    if (this.state.failed) {
      return <div className="grid h-full place-items-center px-6 text-center text-sm text-mute">The 3D view could not start. Mass, power, and cost are still live.</div>
    }
    return this.props.children
  }
}

export function SpacecraftPage() {
  const navigate = useNavigate()
  const { mission, metrics } = useActiveMission()
  const createMission = useMissionStore((state) => state.createMission)
  const updateActive = useMissionStore((state) => state.updateActive)
  const [category, setCategory] = useState<ComponentCategory>('structure')
  const options = useMemo(() => componentsByCategory(category), [category])
  if (!mission || !metrics) return <EmptyMission onCreate={() => { createMission(); navigate('/app/spacecraft') }} />
  const locked = designLocked(mission.status)
  const selectedId = mission.spacecraft[category]
  const span = craftGeometry(mission.spacecraft, mission.instrumentIds).spanM
  const orbit = useRef<OrbitControlsImpl>(null)

  return (
    <div>
      <PageHeader
        kicker="Spacecraft builder"
        title="Assemble the bus."
        description="Changing a part updates mass, cost, generation, and cruise load immediately. The preview on the right uses the same selections."
      />
      {locked ? <p className="mb-4 text-sm text-warn">Restart the simulation before changing hardware.</p> : null}
      {mission.report ? <p className="mb-4 text-sm text-mute">Editing this finished mission clears its report.</p> : null}
      <div className="grid gap-6 xl:grid-cols-[200px_minmax(0,1fr)_320px]">
        <div className="flex gap-2 overflow-x-auto xl:flex-col">
          {COMPONENT_CATEGORIES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCategory(item.id)}
              className={`shrink-0 rounded-xl px-3 py-2 text-left text-sm ${category === item.id ? 'bg-space-800 text-ink' : 'text-mute'}`}
            >
              <span className="block">{item.label}</span>
              <span className="block text-xs text-faint">{getComponent(mission.spacecraft[item.id])?.name ?? 'Not selected'}</span>
            </button>
          ))}
        </div>
        <div>
          <p className="mb-4 text-sm leading-relaxed text-mute">{COMPONENT_CATEGORIES.find((item) => item.id === category)?.prompt}</p>
          <div className="space-y-3">
            {options.map((option) => {
              const active = selectedId === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={locked}
                  data-testid={option.id}
                  onClick={() => updateActive((current) => ({ ...current, spacecraft: { ...current.spacecraft, [category]: option.id } }))}
                  className={`w-full rounded-2xl border p-4 text-left disabled:cursor-not-allowed ${active ? 'border-accent bg-space-900' : 'border-line'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-display text-lg">{option.name}</h2>
                    <span className="num text-sm">{usd(option.costUsd)}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-mute">{option.description}</p>
                  <p className="mt-3 text-xs text-faint">
                    {kg(option.massKg)}
                    {option.generatesW > 0 ? ` · ${watts(option.generatesW)} at Earth` : ''}
                    {option.drawsW > 0 ? ` · draws ${watts(option.drawsW)}` : ''}
                    {option.isp ? ` · Isp ${option.isp} s` : ''}
                    {option.linkFactor ? ` · link factor ${option.linkFactor}` : ''}
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <Meter value={option.performance} />
                    <span className="num text-xs text-faint">{option.performance}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <div className="h-[420px] overflow-hidden rounded-2xl border border-line bg-space-950">
            <ViewBoundary>
              <Canvas camera={{ position: [2.6, 1.3, 3.4], fov: 42 }} dpr={[1, 1.5]}>
                <color attach="background" args={['#07090f']} />
                <ambientLight intensity={0.5} />
                <directionalLight position={[4, 3, 2]} intensity={1.5} />
                <directionalLight position={[-3, -1, -2]} intensity={0.35} color="#9eb6de" />
                <SpacecraftModel selection={mission.spacecraft} instrumentIds={mission.instrumentIds} />
                <OrbitControls ref={orbit} enablePan={false} />
                <FitCamera span={span} controls={orbit} />
              </Canvas>
            </ViewBoundary>
          </div>
          <section className="panel p-4">
            <p className="kicker">Running totals</p>
            <SpecRow label="Spacecraft mass" value={kg(metrics.totalMassKg)} />
            <SpecRow label="Dry mass" value={kg(metrics.dryMassKg)} />
            <SpecRow label="Propellant" value={kg(metrics.tankPropellantKg)} />
            <SpecRow label="Component cost" value={usd(metrics.costs.components)} />
            <SpecRow label="Budget remaining" value={usd(metrics.remainingBudgetUsd)} tone={metrics.remainingBudgetUsd < 0 ? 'bad' : 'ink'} />
            <SpecRow label="Power generated" value={watts(metrics.powerGeneratedW)} />
            <SpecRow label="Cruise consumption" value={watts(metrics.cruiseLoadW)} />
            <SpecRow label="Power balance" value={signedWatts(metrics.powerBalanceW)} tone={metrics.powerBalanceW < 0 ? 'bad' : 'good'} />
            <SpecRow label="Battery for eclipse" value={`${Math.round(metrics.physics.batteryRequiredWh)} / ${Math.round(metrics.physics.batteryCapacityWh)} Wh`} tone={metrics.physics.batterySufficient ? 'ink' : 'bad'} />
            <SpecRow label="Link margin" value={`${metrics.physics.linkMarginDb.toFixed(1)} dB`} tone={metrics.physics.linkCapable ? 'ink' : 'bad'} />
            <SpecRow label="Link rate" value={dataRate(metrics.physics.linkMaxBps)} />
            <SpecRow label="Thermal node" value={`${metrics.physics.thermalHotC.toFixed(0)}° / ${metrics.physics.thermalColdC.toFixed(0)}°`} tone={metrics.physics.thermalSafe ? 'ink' : 'bad'} />
          </section>
        </aside>
      </div>
    </div>
  )
}
