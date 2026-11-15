import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CanvasTexture, type Group } from 'three'
import { craftGeometry } from '../../engine/craft'
import type { SpacecraftSelection } from '../../types'

export interface CraftPose {
  deploy: number
  plume: number
}

function cellTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 64
  const context = canvas.getContext('2d')
  if (!context) return null
  context.fillStyle = '#1d4f92'
  context.fillRect(0, 0, 128, 64)
  context.strokeStyle = '#e7f1fb'
  context.lineWidth = 2
  for (let x = 0; x <= 128; x += 16) {
    context.beginPath()
    context.moveTo(x, 0)
    context.lineTo(x, 64)
    context.stroke()
  }
  for (let y = 0; y <= 64; y += 16) {
    context.beginPath()
    context.moveTo(0, y)
    context.lineTo(128, y)
    context.stroke()
  }
  const texture = new CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

function Instrument({ id, index, total, bodyY }: { id: string; index: number; total: number; bodyY: number }) {
  const x = (index - (total - 1) / 2) * 0.22
  if (id === 'inst-mag') {
    return (
      <group position={[0.15, bodyY * 0.1, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.012, 0.012, 0.85, 8]} />
          <meshStandardMaterial color="#e4c074" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>
    )
  }
  if (id === 'inst-radar') {
    return (
      <mesh position={[x, -bodyY / 2 - 0.08, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.12, 0.05, 20]} />
        <meshStandardMaterial color="#d7dee6" metalness={0.6} roughness={0.28} />
      </mesh>
    )
  }
  if (id === 'inst-camera') {
    return (
      <mesh position={[x, -bodyY / 2 - 0.05, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.045, 0.06, 0.1, 16]} />
        <meshStandardMaterial color="#1c2430" metalness={0.4} roughness={0.35} />
      </mesh>
    )
  }
  return (
    <mesh position={[x, -bodyY / 2 - 0.05, 0]}>
      <boxGeometry args={[0.12, 0.08, 0.14]} />
      <meshStandardMaterial color={id === 'inst-ir' ? '#c4b5fd' : '#9aa8bd'} metalness={0.45} roughness={0.4} />
    </mesh>
  )
}

export function SpacecraftModel({
  selection,
  instrumentIds = [],
  spin = true,
  pose,
}: {
  selection: SpacecraftSelection
  instrumentIds?: string[]
  spin?: boolean
  pose?: { current: CraftPose }
}) {
  const root = useRef<Group>(null)
  const wings = useRef<(Group | null)[]>([])
  const plume = useRef<Group>(null)
  const geometry = useMemo(() => craftGeometry(selection, instrumentIds), [selection, instrumentIds])
  const cells = useMemo(() => cellTexture(), [])
  const instrumentKey = instrumentIds.join('|')

  useFrame((_, delta) => {
    if (spin && root.current) root.current.rotation.y += delta * 0.22
    const deploy = pose?.current.deploy ?? 1
    const plumeAmount = pose?.current.plume ?? 0
    wings.current.forEach((wing, index) => {
      if (!wing) return
      const side = index % 2 === 0 ? 1 : -1
      const target = side * (1 - deploy) * (Math.PI / 2)
      wing.rotation.z += (target - wing.rotation.z) * 0.15
    })
    if (plume.current) {
      plume.current.visible = plumeAmount > 0.02
      plume.current.scale.setScalar(0.4 + plumeAmount)
    }
  })

  const [width, height, depth] = geometry.body
  const markers = geometry.instrumentIds.slice(0, 6)

  return (
    <group ref={root}>
      <mesh castShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={geometry.bodyColor} metalness={0.62} roughness={0.34} />
      </mesh>
      {geometry.panelCount > 0
        ? Array.from({ length: geometry.panelCount }, (_, index) => {
            const side = index % 2 === 0 ? 1 : -1
            return (
              <group key={`wing-${index}`} position={[side * (width / 2), 0, 0]}>
                <group ref={(node) => { wings.current[index] = node }}>
                  <mesh position={[side * 0.08, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.018, 0.018, 0.16, 8]} />
                    <meshStandardMaterial color="#c5ced8" metalness={0.7} roughness={0.3} />
                  </mesh>
                  <mesh position={[side * (geometry.panelLength / 2 + 0.08), 0, 0]} rotation={[side * 0.28, 0, 0]}>
                    <boxGeometry args={[geometry.panelLength, Math.max(0.045, geometry.panelWidth * 0.08), geometry.panelWidth]} />
                    <meshStandardMaterial map={cells ?? undefined} color="#6ea0d8" emissive="#12325f" emissiveIntensity={0.35} metalness={0.35} roughness={0.4} />
                  </mesh>
                </group>
              </group>
            )
          })
        : null}
      {geometry.rtg ? (
        <mesh position={[width / 2 + 0.16, -0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.1, 0.1, 0.42, 20]} />
          <meshStandardMaterial color="#8d97a6" metalness={0.8} roughness={0.25} />
        </mesh>
      ) : null}
      {geometry.patch ? (
        <mesh position={[0, height / 2 + 0.02, 0]}>
          <boxGeometry args={[geometry.dishDiameter, 0.03, geometry.dishDiameter * 0.8]} />
          <meshStandardMaterial color="#edf2f7" metalness={0.5} roughness={0.3} />
        </mesh>
      ) : (
        <group position={[0, height / 2 + geometry.dishDiameter * 0.08, 0]} rotation={[0.5, 0.2, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <sphereGeometry args={[geometry.dishDiameter / 2, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#e7edf4" metalness={0.72} roughness={0.22} side={2} />
          </mesh>
          <mesh position={[0, 0.02, geometry.dishDiameter * 0.18]}>
            <boxGeometry args={[0.04, 0.04, 0.08]} />
            <meshStandardMaterial color="#9aa3b2" metalness={0.6} roughness={0.3} />
          </mesh>
        </group>
      )}
      {geometry.engine === 'ion' ? (
        <mesh position={[0, 0, depth / 2 + 0.08]}>
          <boxGeometry args={[0.28, 0.28, 0.06]} />
          <meshStandardMaterial color="#d5f0ff" emissive="#3d8ec4" emissiveIntensity={0.7} metalness={0.2} roughness={0.3} />
        </mesh>
      ) : (
        <mesh position={[0, 0, depth / 2 + 0.16]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[geometry.engine === 'hybrid' ? 0.13 : 0.18, 0.32, 24]} />
          <meshStandardMaterial color="#d5dbe3" metalness={0.86} roughness={0.22} />
        </mesh>
      )}
      <group ref={plume} position={[0, 0, depth / 2 + 0.42]} visible={false}>
        <mesh>
          <coneGeometry args={[geometry.engine === 'ion' ? 0.08 : 0.14, geometry.engine === 'ion' ? 0.9 : 0.55, 16]} />
          <meshStandardMaterial
            color={geometry.engine === 'ion' ? '#9fd0ff' : '#ffb15a'}
            emissive={geometry.engine === 'ion' ? '#7ec8ff' : '#ff7a3c'}
            emissiveIntensity={1.4}
            transparent
            opacity={0.75}
          />
        </mesh>
      </group>
      <group key={instrumentKey}>
        {markers.map((id, index) => (
          <Instrument key={`${id}-${index}`} id={id} index={index} total={markers.length} bodyY={height} />
        ))}
      </group>
    </group>
  )
}

export const SHOWCASE_CRAFT: SpacecraftSelection = {
  structure: 'struct-heavy',
  propulsion: 'prop-advanced',
  power: 'power-high-solar',
  communication: 'comm-high',
  thermal: 'thermal-advanced',
  storage: 'store-high',
}
