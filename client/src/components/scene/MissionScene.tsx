import { useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Line, OrbitControls, Stars } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { Vector3, type Group, type Mesh } from 'three'
import { getMission, getVehicle } from '../../data/catalog'
import { computeMetrics } from '../../engine/calculations'
import { conicPoint } from '../../engine/physics'
import type { FlightState, MissionConfig, StageId } from '../../types'
import { km } from '../../utils/format'
import { SpacecraftModel, type CraftPose } from './SpacecraftModel'
import { Planet } from './planets'

const AU_KM = 149_597_870.7

function stageProgress(flight: FlightState | null, id: StageId): number {
  if (!flight) return 0
  const index = flight.plan.findIndex((stage) => stage.id === id)
  if (index < 0) return 0
  if (flight.stageIndex > index) return 1
  if (flight.stageIndex < index) return 0
  const duration = flight.plan[index]?.durationHours ?? 0
  if (duration <= 0) return 1
  return Math.min(1, Math.max(0, flight.stageElapsedHours / duration))
}

function currentStage(flight: FlightState | null): StageId | null {
  if (!flight) return null
  return flight.plan[flight.stageIndex]?.id ?? null
}

type Shot = 'near-earth' | 'helio' | 'ascent' | 'earth-orbit' | 'lunar-transfer' | 'lunar-orbit' | 'arrival'

function shotFor(destinationId: string | null, stage: StageId | null): Shot {
  if (!stage) return destinationId === 'earth' || destinationId === 'lunar' || !destinationId ? 'near-earth' : 'helio'
  if (stage === 'prelaunch' || stage === 'ignition' || stage === 'launch') return 'ascent'
  if (destinationId === 'earth') return 'earth-orbit'
  if (destinationId === 'lunar') return stage === 'departure' || stage === 'cruise' ? 'lunar-transfer' : 'lunar-orbit'
  if (stage === 'departure' || stage === 'cruise') return 'helio'
  return 'arrival'
}

const CAMERA: Record<Shot, { position: [number, number, number]; target: [number, number, number] }> = {
  'near-earth': { position: [4.4, 2.1, 5.2], target: [0, 0, 0] },
  helio: { position: [7.5, 5.5, 9], target: [0, 0, 0] },
  ascent: { position: [5.2, 2.2, 6.4], target: [0, 1.6, 0] },
  'earth-orbit': { position: [3.2, 1.6, 3.8], target: [0, 0, 0] },
  'lunar-transfer': { position: [4.2, 3.4, 7.2], target: [0, 0, 0] },
  'lunar-orbit': { position: [2.8, 1.4, 3.2], target: [0, 0, 0] },
  arrival: { position: [3.4, 1.7, 4.2], target: [0, 0, 0] },
}

function CameraRig({ shot }: { shot: Shot }) {
  const camera = useThree((state) => state.camera)
  const controls = useThree((state) => state.controls) as OrbitControlsImpl | null
  const anim = useRef(1.2)
  const previous = useRef(shot)
  const desired = useMemo(() => new Vector3(...CAMERA[shot].position), [shot])
  const target = useMemo(() => new Vector3(...CAMERA[shot].target), [shot])
  if (previous.current !== shot) {
    previous.current = shot
    anim.current = 1.25
  }
  useFrame((_, delta) => {
    if (anim.current <= 0 || !controls) return
    anim.current = Math.max(0, anim.current - delta)
    const blend = 1 - Math.exp(-3.1 * delta)
    camera.position.lerp(desired, blend)
    controls.target.lerp(target, blend)
    controls.enabled = anim.current <= 0
    controls.update()
  })
  return null
}

function OrbitRing({ radius, color }: { radius: number; color: string }) {
  const points = useMemo(() => {
    const ring: [number, number, number][] = []
    for (let index = 0; index <= 128; index += 1) {
      const angle = (index / 128) * Math.PI * 2
      ring.push([Math.cos(angle) * radius, 0, Math.sin(angle) * radius])
    }
    return ring
  }, [radius])
  return <Line points={points} color={color} transparent opacity={0.7} />
}

function ellipsePoints(periapsisKm: number, apoapsisKm: number, scale: number) {
  const points: [number, number, number][] = []
  for (let index = 0; index <= 96; index += 1) {
    const sample = conicPoint(periapsisKm, apoapsisKm, (index / 96) * Math.PI)
    points.push([sample.xKm * scale, 0, sample.yKm * scale])
  }
  return points
}

function CraftMarker({
  mission,
  pose,
  scale = 0.28,
}: {
  mission: MissionConfig
  pose: { current: CraftPose }
  scale?: number
}) {
  return (
    <group scale={scale}>
      <SpacecraftModel selection={mission.spacecraft} instrumentIds={mission.instrumentIds} spin={false} pose={pose} />
    </group>
  )
}

function Rocket({
  boosters,
  playhead,
  reaches,
  mission,
  pose,
}: {
  boosters: number
  playhead: { current: number }
  reaches: boolean
  mission: MissionConfig
  pose: { current: CraftPose }
}) {
  const root = useRef<Group>(null)
  const left = useRef<Group>(null)
  const right = useRef<Group>(null)
  const craft = useRef<Group>(null)
  const flame = useRef<Mesh>(null)
  useFrame(() => {
    const play = playhead.current
    const rise = reaches
      ? play * 7.2
      : play < 0.42
        ? (play / 0.42) * 3.1
        : 3.1 * (1 - (play - 0.42) / 0.58)
    if (root.current) root.current.position.y = Math.max(0, rise)
    const open = reaches && play > 0.48 ? Math.min(1, (play - 0.48) / 0.18) : 0
    if (left.current) left.current.position.x = -0.22 - open * 1.1
    if (right.current) right.current.position.x = 0.22 + open * 1.1
    pose.current.deploy = reaches && play > 0.7 ? Math.min(1, (play - 0.7) / 0.2) : 0
    pose.current.plume = play > 0.04 && (reaches || play < 0.45) ? 1 : 0
    if (craft.current) craft.current.visible = play > 0.52
    if (flame.current) flame.current.visible = play > 0.02 && play < (reaches ? 0.78 : 0.5)
  })
  return (
    <group ref={root}>
      <mesh position={[0, 1.15, 0]}>
        <cylinderGeometry args={[0.28, 0.34, 2.3, 20]} />
        <meshStandardMaterial color="#e7edf4" metalness={0.45} roughness={0.35} />
      </mesh>
      <mesh position={[0, 2.55, 0]}>
        <cylinderGeometry args={[0.2, 0.28, 0.7, 20]} />
        <meshStandardMaterial color="#c5ceda" metalness={0.4} roughness={0.4} />
      </mesh>
      <group ref={left} position={[-0.22, 3.15, 0]}>
        <mesh>
          <cylinderGeometry args={[0.2, 0.22, 0.7, 16]} />
          <meshStandardMaterial color="#d5dbe3" metalness={0.3} roughness={0.4} />
        </mesh>
      </group>
      <group ref={right} position={[0.22, 3.15, 0]}>
        <mesh>
          <cylinderGeometry args={[0.2, 0.22, 0.7, 16]} />
          <meshStandardMaterial color="#d5dbe3" metalness={0.3} roughness={0.4} />
        </mesh>
      </group>
      {boosters > 0 ? (
        <>
          <mesh position={[-0.62, 0.9, 0]}>
            <cylinderGeometry args={[0.16, 0.18, 1.8, 16]} />
            <meshStandardMaterial color="#d7dee8" metalness={0.4} roughness={0.35} />
          </mesh>
          <mesh position={[0.62, 0.9, 0]}>
            <cylinderGeometry args={[0.16, 0.18, 1.8, 16]} />
            <meshStandardMaterial color="#d7dee8" metalness={0.4} roughness={0.35} />
          </mesh>
        </>
      ) : null}
      <group ref={craft} position={[0, 3.15, 0]} scale={0.22} visible={false}>
        <SpacecraftModel selection={mission.spacecraft} instrumentIds={mission.instrumentIds} spin={false} pose={pose} />
      </group>
      <mesh ref={flame} position={[0, -0.15, 0]} visible={false}>
        <coneGeometry args={[0.22, 0.7, 16]} />
        <meshStandardMaterial color="#ffb15a" emissive="#ff7a3c" emissiveIntensity={1.5} transparent opacity={0.8} />
      </mesh>
    </group>
  )
}

function useFlightRefs(mission: MissionConfig) {
  const flight = useRef(mission.flight)
  const pose = useRef<CraftPose>({ deploy: 1, plume: 0 })
  flight.current = mission.flight
  return { flight, pose }
}

function NearEarth({ mission, pose }: { mission: MissionConfig; pose: { current: CraftPose } }) {
  const destination = getMission(mission.destinationId)
  const craft = useRef<Group>(null)
  const moon = destination?.id === 'lunar'
  useFrame(({ clock }) => {
    const angle = clock.elapsedTime * (moon ? 0.15 : 0.35)
    const radius = moon ? 1.55 : 1.7
    if (craft.current) {
      craft.current.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius)
      craft.current.lookAt(0, 0, 0)
    }
    pose.current.deploy = 1
    pose.current.plume = 0
  })
  return (
    <>
      <Planet kind={moon ? 'earth' : destination?.id ?? 'earth'} radius={moon ? 1.05 : 1.15} />
      <OrbitRing radius={moon ? 1.55 : 1.7} color="#9fd0ff" />
      {moon ? (
        <>
          <Planet kind="moon" radius={0.28} position={[3.3, 0, 0]} />
          <OrbitRing radius={3.3} color="#73829a" />
        </>
      ) : null}
      <group ref={craft}>
        <CraftMarker mission={mission} pose={pose} />
      </group>
    </>
  )
}

function EarthOrbit({ mission, flight, pose }: { mission: MissionConfig; flight: { current: FlightState | null }; pose: { current: CraftPose } }) {
  const craft = useRef<Group>(null)
  useFrame(({ clock }) => {
    const along = flight.current ? stageProgress(flight.current, 'cruise') + stageProgress(flight.current, 'science') : clock.elapsedTime * 0.05
    const angle = along * Math.PI * 2
    if (craft.current) {
      craft.current.position.set(Math.cos(angle) * 1.72, 0, Math.sin(angle) * 1.72)
      craft.current.lookAt(0, 0, 0)
    }
    pose.current.deploy = 1
  })
  return (
    <>
      <Planet kind="earth" radius={1.15} />
      <OrbitRing radius={1.72} color="#9fd0ff" />
      <group ref={craft}>
        <CraftMarker mission={mission} pose={pose} />
      </group>
    </>
  )
}

function LunarTransfer({ mission, flight, pose }: { mission: MissionConfig; flight: { current: FlightState | null }; pose: { current: CraftPose } }) {
  const craft = useRef<Group>(null)
  const rp = 6371 + 550
  const ra = 384_400
  const scale = 6.4 / ra
  const path = useMemo(() => ellipsePoints(rp, ra, scale), [scale])
  const moon = conicPoint(rp, ra, Math.PI)
  useFrame(() => {
    const t = Math.max(stageProgress(flight.current, 'departure'), stageProgress(flight.current, 'cruise'))
    const sample = conicPoint(rp, ra, t * Math.PI * 0.98)
    if (craft.current) craft.current.position.set(sample.xKm * scale, 0, sample.yKm * scale)
    pose.current.deploy = 1
    pose.current.plume = stageProgress(flight.current, 'departure') > 0 && stageProgress(flight.current, 'departure') < 1 ? 0.8 : 0
  })
  return (
    <>
      <Planet kind="earth" radius={0.42} />
      <Line points={path} color="#9fd0ff" transparent opacity={0.8} />
      <Planet kind="moon" radius={0.16} position={[moon.xKm * scale, 0, moon.yKm * scale]} />
      <group ref={craft}>
        <CraftMarker mission={mission} pose={pose} scale={0.18} />
      </group>
    </>
  )
}

function BodyOrbit({
  mission,
  flight,
  pose,
  kind,
  altitudeKm,
  radiusKm,
}: {
  mission: MissionConfig
  flight: { current: FlightState | null }
  pose: { current: CraftPose }
  kind: string
  altitudeKm: number
  radiusKm: number
}) {
  const craft = useRef<Group>(null)
  const bodyRadius = 1.15
  const orbit = bodyRadius * ((radiusKm + altitudeKm) / radiusKm)
  useFrame(() => {
    const capture = (flight.current?.telemetry.fuelKg ?? 1) > 0
    const insertion = stageProgress(flight.current, 'insertion')
    const science = stageProgress(flight.current, 'science')
    const angle = (insertion + science) * Math.PI * 2
    if (!craft.current) return
    if (!capture) {
      craft.current.position.set(0, 0, 4 - insertion * 8)
      return
    }
    if (insertion < 0.45 && science === 0) {
      craft.current.position.set(0, 0, 3.4 - insertion * 4)
      pose.current.plume = 1
      return
    }
    pose.current.plume = 0
    craft.current.position.set(Math.cos(angle) * orbit, 0, Math.sin(angle) * orbit)
    craft.current.lookAt(0, 0, 0)
  })
  return (
    <>
      <Planet kind={kind} radius={bodyRadius} />
      <OrbitRing radius={orbit} color="#e4c074" />
      <group ref={craft}>
        <CraftMarker mission={mission} pose={pose} />
      </group>
    </>
  )
}

function Helio({ mission, flight, pose }: { mission: MissionConfig; flight: { current: FlightState | null }; pose: { current: CraftPose } }) {
  const destination = getMission(mission.destinationId)
  const craft = useRef<Group>(null)
  const au = destination?.distanceAu ?? 1.52
  const inner = Math.min(1, au) * AU_KM
  const outer = Math.max(1, au) * AU_KM
  const scale = 6.2 / outer
  const path = useMemo(() => ellipsePoints(inner, outer, scale), [inner, outer, scale])
  const earth = conicPoint(inner, outer, au >= 1 ? 0 : Math.PI)
  const target = conicPoint(inner, outer, au >= 1 ? Math.PI : 0)
  useFrame(() => {
    const t = Math.max(stageProgress(flight.current, 'departure') * 0.08, stageProgress(flight.current, 'cruise'))
    const anomaly = au >= 1 ? t * Math.PI * 0.98 : Math.PI * (1 - t * 0.98)
    const sample = conicPoint(inner, outer, anomaly)
    if (craft.current) craft.current.position.set(sample.xKm * scale, 0, sample.yKm * scale)
    pose.current.deploy = 1
    pose.current.plume = mission.spacecraft.propulsion === 'prop-electric' ? 0.7 : stageProgress(flight.current, 'departure') > 0 ? 0.4 : 0
  })
  return (
    <>
      <mesh>
        <sphereGeometry args={[0.28, 24, 24]} />
        <meshStandardMaterial color="#f0c48a" emissive="#c47a3a" emissiveIntensity={0.8} />
      </mesh>
      <pointLight intensity={30} distance={20} color="#ffd7ae" />
      <OrbitRing radius={1 * AU_KM * scale} color="#6ea8ff" />
      <OrbitRing radius={au * AU_KM * scale} color="#d06a45" />
      <Line points={path} color="#9fd0ff" transparent opacity={0.9} />
      <Planet kind="earth" radius={0.18} position={[earth.xKm * scale, 0, earth.yKm * scale]} />
      <Planet kind={destination?.id ?? 'mars'} radius={destination?.id === 'jupiter' ? 0.42 : 0.16} position={[target.xKm * scale, 0, target.yKm * scale]} />
      <group ref={craft}>
        <CraftMarker mission={mission} pose={pose} scale={0.16} />
      </group>
    </>
  )
}

function Ascent({ mission, flight, pose }: { mission: MissionConfig; flight: { current: FlightState | null }; pose: { current: CraftPose } }) {
  const metrics = computeMetrics(mission)
  const vehicle = getVehicle(mission.launchVehicleId)
  const boosters = vehicle?.id === 'lv-heavy' || vehicle?.id === 'lv-deep' ? 2 : 0
  const playhead = useRef(0)
  useFrame(() => {
    const stage = currentStage(flight.current)
    if (stage === 'ignition') playhead.current = 0.08 * stageProgress(flight.current, 'ignition')
    else if (stage === 'launch') playhead.current = 0.12 + 0.88 * stageProgress(flight.current, 'launch')
    else playhead.current = 0
  })
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <circleGeometry args={[8, 40]} />
        <meshStandardMaterial color="#141a16" />
      </mesh>
      <Planet kind="earth" radius={18} position={[0, -18.2, -6]} />
      <Rocket boosters={boosters} playhead={playhead} reaches={metrics.physics.launchCompatible} mission={mission} pose={pose} />
    </>
  )
}

function SceneBody({ mission }: { mission: MissionConfig }) {
  const { flight, pose } = useFlightRefs(mission)
  const stage = currentStage(mission.flight)
  const shot = shotFor(mission.destinationId, stage)
  const destination = getMission(mission.destinationId)
  return (
    <>
      <CameraRig shot={shot} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[6, 4, 3]} intensity={1.6} />
      {shot === 'ascent' ? <Ascent mission={mission} flight={flight} pose={pose} /> : null}
      {shot === 'near-earth' ? <NearEarth mission={mission} pose={pose} /> : null}
      {shot === 'earth-orbit' ? <EarthOrbit mission={mission} flight={flight} pose={pose} /> : null}
      {shot === 'lunar-transfer' ? <LunarTransfer mission={mission} flight={flight} pose={pose} /> : null}
      {shot === 'lunar-orbit' || shot === 'arrival' ? (
        <BodyOrbit
          mission={mission}
          flight={flight}
          pose={pose}
          kind={destination?.id === 'lunar' ? 'moon' : destination?.id ?? 'mars'}
          altitudeKm={destination?.orbitAltitudeKm ?? 400}
          radiusKm={destination?.id === 'lunar' ? 1737.4 : destination?.id === 'jupiter' ? 69911 : destination?.id === 'venus' ? 6051.8 : destination?.id === 'earth' ? 6371 : 3389.5}
        />
      ) : null}
      {shot === 'helio' ? <Helio mission={mission} flight={flight} pose={pose} /> : null}
    </>
  )
}

export function MissionScene({ mission }: { mission: MissionConfig }) {
  const metrics = useMemo(
    () => computeMetrics(mission),
    [mission],
  )
  const stage = currentStage(mission.flight)
  const shot = shotFor(mission.destinationId, stage)
  const destination = getMission(mission.destinationId)
  const caption =
    shot === 'helio'
      ? `Designed Hohmann ellipse, not a live Horizons trajectory. Sun and planets are enlarged. Catalog range ${destination ? km(destination.distanceKm) : 'unset'}.`
      : shot === 'lunar-transfer'
        ? 'Patched-conic Earth–Moon ellipse, drawn to one scale. Earth and the Moon are enlarged.'
        : shot === 'ascent'
          ? metrics.physics.launchCompatible
            ? `${getVehicle(mission.launchVehicleId)?.name ?? 'Launcher'} can lift ${Math.round(metrics.physics.launchMassKg).toLocaleString('en-US')} kg.`
            : `Wet mass ${Math.round(metrics.physics.launchMassKg).toLocaleString('en-US')} kg exceeds throw weight. The ascent does not reach orbit.`
          : shot === 'arrival' || shot === 'lunar-orbit'
            ? (mission.flight?.telemetry.fuelKg ?? 1) > 0
              ? `Capture burn uses the rocket-equation propellant. Target altitude ${destination?.orbitAltitudeKm ?? 0} km.`
              : 'Propellant is gone, so this pass is a flyby instead of orbit insertion.'
            : 'Vehicle shape follows the selected bus, arrays, antenna, engine, and instruments.'

  return (
    <div className="relative h-full w-full">
      <Canvas camera={{ position: CAMERA[shot].position, fov: 42 }} dpr={[1, 1.6]}>
        <color attach="background" args={['#07090f']} />
        <Stars radius={80} depth={40} count={1400} factor={2.2} fade speed={0.15} />
        <SceneBody mission={mission} />
        <OrbitControls makeDefault enableDamping />
      </Canvas>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-space-950/90 to-transparent px-4 py-3 text-xs text-mute">
        <p>{caption}</p>
        <p className="mt-1 font-mono text-[11px] text-faint">
          {Math.round(metrics.physics.powerGeneratedW)} W generated · {Math.round(metrics.physics.powerConsumptionW)} W cruise · link {metrics.physics.linkMarginDb.toFixed(1)} dB · {metrics.physics.thermalHotC.toFixed(0)}°C hot
        </p>
      </div>
    </div>
  )
}
