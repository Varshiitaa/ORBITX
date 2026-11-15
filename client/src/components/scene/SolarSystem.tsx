import { Line, OrbitControls, Stars } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { Vector3 } from 'three'
import type { SpaceBody } from '../../services/space'
import { visualPosition } from '../../space/scale'
import { Planet } from './planets'

const RADIUS: Record<string, number> = {
  sun: 0.38,
  mercury: 0.07,
  venus: 0.13,
  earth: 0.14,
  moon: 0.045,
  mars: 0.1,
  jupiter: 0.3,
  saturn: 0.24,
  uranus: 0.17,
  neptune: 0.16,
}

const SPIN: Record<string, number> = {
  sun: 0.04,
  mercury: 0.12,
  venus: 0.03,
  earth: 0.18,
  moon: 0.07,
  mars: 0.16,
  jupiter: 0.28,
  saturn: 0.24,
  uranus: 0.18,
  neptune: 0.16,
}

function RangeRing({ radius }: { radius: number }) {
  const points = useMemo(() => {
    const next: [number, number, number][] = []
    for (let index = 0; index <= 96; index += 1) {
      const angle = (index / 96) * Math.PI * 2
      next.push([Math.cos(angle) * radius, 0, Math.sin(angle) * radius])
    }
    return next
  }, [radius])
  return <Line points={points} color="#8ea0b8" transparent opacity={0.32} />
}

function Focus({ point, token }: { point: [number, number, number] | null; token: string }) {
  const controls = useThree((state) => state.controls) as OrbitControlsImpl | null
  const camera = useThree((state) => state.camera)
  const goal = useRef(new Vector3())
  const desired = useRef(new Vector3())
  const until = useRef(0)

  useEffect(() => {
    until.current = performance.now() + 1400
  }, [token])

  useFrame((_, delta) => {
    if (!controls || !point || performance.now() > until.current) return
    goal.current.set(point[0], point[1], point[2])
    const step = 1 - Math.exp(-2.4 * delta)
    const offset = desired.current.copy(camera.position).sub(controls.target)
    const distance = Math.min(9, Math.max(2.4, offset.length()))
    desired.current.set(goal.current.x + distance * 0.45, goal.current.y + distance * 0.32, goal.current.z + distance)
    controls.target.lerp(goal.current, step)
    camera.position.lerp(desired.current, step)
    controls.update()
  })
  return null
}

function BodyView({
  body,
  selected,
  onSelect,
}: {
  body: SpaceBody
  selected: boolean
  onSelect: (id: string) => void
}) {
  const spin = useRef<import('three').Group>(null)
  const position = visualPosition(body.positionKm)
  const radius = RADIUS[body.body] ?? 0.12
  const ring = Math.hypot(position[0], position[2])
  useFrame((_, delta) => {
    if (spin.current) spin.current.rotation.y += delta * (SPIN[body.body] ?? 0.1)
  })
  return (
    <group>
      {body.body !== 'sun' && body.body !== 'moon' && ring > 0.08 ? <RangeRing radius={ring} /> : null}
      <group position={position}>
        <group ref={spin}>
          <Planet kind={body.body} radius={radius} />
        </group>
        <mesh
          onClick={(event) => {
            event.stopPropagation()
            onSelect(body.body)
          }}
        >
          <sphereGeometry args={[Math.max(radius * 1.8, 0.16), 12, 12]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        {selected ? (
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[radius * 1.7, radius * 1.95, 48]} />
            <meshBasicMaterial color="#d5e6f5" transparent opacity={0.85} />
          </mesh>
        ) : null}
      </group>
    </group>
  )
}

export function SolarSystem({
  bodies,
  selected,
  onSelect,
}: {
  bodies: SpaceBody[]
  selected: string | null
  onSelect: (id: string) => void
}) {
  const selectedBody = bodies.find((body) => body.body === selected) ?? null
  const focus = selectedBody ? visualPosition(selectedBody.positionKm) : null
  return (
    <Canvas camera={{ position: [0, 4.2, 9.5], fov: 42 }} dpr={[1, 1.5]}>
      <color attach="background" args={['#07090f']} />
      <ambientLight intensity={0.18} />
      <pointLight position={[0, 0.2, 0]} intensity={48} distance={40} decay={2} color="#ffd8b0" />
      <Stars radius={90} depth={40} count={1600} factor={3} fade speed={0.2} />
      {bodies.map((body) => (
        <BodyView key={body.body} body={body} selected={body.body === selected} onSelect={onSelect} />
      ))}
      <Focus point={focus} token={`${selected ?? ''}:${focus ? 'ready' : 'wait'}`} />
      <OrbitControls makeDefault enablePan={false} minDistance={2} maxDistance={28} />
    </Canvas>
  )
}
