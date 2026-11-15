import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import type { HorizonsSample } from '../../services/horizons'
import { visualPosition } from '../../space/scale'
import { Planet } from './planets'

const VISUAL_RADIUS: Record<string, number> = {
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

export function EphemerisScene({ samples }: { samples: HorizonsSample[] }) {
  return (
    <Canvas camera={{ position: [0, 4.2, 9.5], fov: 42 }} dpr={[1, 1.5]}>
      <color attach="background" args={['#07090f']} />
      <ambientLight intensity={0.22} />
      <pointLight position={[0, 0.2, 0]} intensity={40} distance={40} color="#ffd7ae" />
      <Planet kind="sun" radius={0.34} />
      {samples.map((sample) => (
        <Planet key={sample.body} kind={sample.body} radius={VISUAL_RADIUS[sample.body] ?? 0.12} position={visualPosition(sample.positionKm)} />
      ))}
      <OrbitControls enablePan={false} minDistance={2} maxDistance={28} />
    </Canvas>
  )
}
