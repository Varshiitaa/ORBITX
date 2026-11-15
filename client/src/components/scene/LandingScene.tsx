import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import { CanvasTexture, type Group } from 'three'
import { MISSIONS } from '../../data/catalog'
import { SHOWCASE_CRAFT, SpacecraftModel } from './SpacecraftModel'

function surfaceTexture(color: string, banded: boolean) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 128
  const context = canvas.getContext('2d')
  if (!context) return null
  context.fillStyle = color
  context.fillRect(0, 0, 256, 128)
  if (banded) {
    for (let band = 0; band < 8; band += 1) {
      context.fillStyle = band % 2 === 0 ? 'rgba(80, 48, 24, 0.18)' : 'rgba(255, 236, 210, 0.14)'
      context.fillRect(0, band * 16, 256, 7)
    }
  } else {
    context.fillStyle = 'rgba(255,255,255,0.08)'
    context.beginPath()
    context.arc(70, 46, 18, 0, Math.PI * 2)
    context.arc(160, 80, 28, 0, Math.PI * 2)
    context.fill()
  }
  const texture = new CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

function OrbitingPlanet({ color, orbit, size, period, phase, banded }: { color: string; orbit: number; size: number; period: number; phase: number; banded: boolean }) {
  const ref = useRef<Group>(null)
  const texture = useMemo(() => surfaceTexture(color, banded), [color, banded])
  useFrame(({ clock }) => {
    if (!ref.current) return
    const angle = clock.elapsedTime / period + phase
    ref.current.position.x = Math.cos(angle) * orbit
    ref.current.position.z = Math.sin(angle) * orbit * 0.62
  })
  return (
    <group ref={ref}>
      <mesh>
        <sphereGeometry args={[size, 32, 32]} />
        <meshStandardMaterial map={texture ?? undefined} color={color} roughness={0.82} metalness={0.04} />
      </mesh>
    </group>
  )
}

function SolarSystem() {
  const spin = useRef<Group>(null)
  useFrame((_, delta) => {
    if (spin.current) spin.current.rotation.y += delta * 0.03
  })
  return (
    <group ref={spin} scale={0.72} position={[-0.4, 0.1, -1.4]}>
      <mesh>
        <sphereGeometry args={[0.42, 32, 32]} />
        <meshStandardMaterial color="#f0c48a" emissive="#c47a3a" emissiveIntensity={0.55} roughness={0.6} />
      </mesh>
      <pointLight position={[0, 0, 0]} intensity={18} distance={18} color="#ffd7ae" />
      {MISSIONS.map((mission, index) => (
        <OrbitingPlanet
          key={mission.id}
          color={mission.color}
          orbit={1.05 + index * 0.72}
          size={mission.id === 'jupiter' ? 0.28 : mission.id === 'asteroid' ? 0.07 : 0.12 + (index % 3) * 0.03}
          period={26 + index * 7}
          phase={index * 0.9}
          banded={mission.id === 'jupiter'}
        />
      ))}
    </group>
  )
}

function DriftCraft() {
  const ref = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.position.y = Math.sin(clock.elapsedTime * 0.45) * 0.12
  })
  return (
    <group ref={ref} position={[0.05, -0.08, 3.15]} scale={0.66}>
      <SpacecraftModel selection={SHOWCASE_CRAFT} />
    </group>
  )
}

export function LandingScene() {
  return (
    <Canvas camera={{ position: [0.2, 0.8, 7.4], fov: 42 }} dpr={[1, 1.5]}>
      <color attach="background" args={['#07090f']} />
      <Stars radius={70} depth={30} count={1800} factor={2.4} fade speed={0.2} />
      <ambientLight intensity={0.28} />
      <directionalLight position={[4, 2, 3]} intensity={1.1} />
      <SolarSystem />
      <DriftCraft />
    </Canvas>
  )
}
