import { useMemo } from 'react'
import { CanvasTexture } from 'three'

function paint(draw: (context: CanvasRenderingContext2D, width: number, height: number) => void) {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 256
  const context = canvas.getContext('2d')
  if (!context) return null
  draw(context, 512, 256)
  const texture = new CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

export function usePlanetTexture(kind: string) {
  return useMemo(() => {
    if (kind === 'earth') {
      return paint((context, width, height) => {
        context.fillStyle = '#1a4e86'
        context.fillRect(0, 0, width, height)
        context.fillStyle = '#2f6b45'
        const land = [
          [80, 90, 70],
          [180, 110, 90],
          [300, 80, 50],
          [360, 150, 80],
          [120, 170, 40],
        ]
        for (const [x, y, r] of land) {
          context.beginPath()
          context.ellipse(x, y, r, r * 0.55, 0.2, 0, Math.PI * 2)
          context.fill()
        }
        context.fillStyle = '#e7eef5'
        context.fillRect(0, 0, width, 22)
        context.fillRect(0, height - 24, width, 24)
      })
    }
    if (kind === 'moon') {
      return paint((context, width, height) => {
        context.fillStyle = '#b7b8bc'
        context.fillRect(0, 0, width, height)
        context.fillStyle = '#8d8f96'
        for (let index = 0; index < 18; index += 1) {
          context.beginPath()
          context.arc((index * 97) % width, (index * 53) % height, 6 + (index % 5) * 3, 0, Math.PI * 2)
          context.fill()
        }
      })
    }
    if (kind === 'mars') {
      return paint((context, width, height) => {
        const gradient = context.createLinearGradient(0, 0, 0, height)
        gradient.addColorStop(0, '#c46848')
        gradient.addColorStop(0.45, '#a84b32')
        gradient.addColorStop(1, '#d48962')
        context.fillStyle = gradient
        context.fillRect(0, 0, width, height)
        context.fillStyle = '#8d3b28'
        context.beginPath()
        context.ellipse(160, 120, 90, 36, 0.2, 0, Math.PI * 2)
        context.fill()
        context.fillStyle = '#e7d3c4'
        context.fillRect(0, 0, width, 14)
        context.fillRect(0, height - 16, width, 16)
      })
    }
    if (kind === 'venus') {
      return paint((context, width, height) => {
        context.fillStyle = '#e6d3a1'
        context.fillRect(0, 0, width, height)
        context.fillStyle = 'rgba(255,255,255,0.28)'
        for (let band = 0; band < 8; band += 1) context.fillRect(0, 20 + band * 28, width, 12)
      })
    }
    if (kind === 'jupiter') {
      return paint((context, width, height) => {
        const bands = ['#c9a27a', '#e7d3b4', '#b07a4a', '#f0e2c8', '#a86b42', '#d8c09a', '#8d5a38']
        bands.forEach((color, index) => {
          context.fillStyle = color
          context.fillRect(0, (height / bands.length) * index, width, height / bands.length + 1)
        })
        context.fillStyle = '#c45a42'
        context.beginPath()
        context.ellipse(width * 0.62, height * 0.58, 28, 16, 0.2, 0, Math.PI * 2)
        context.fill()
      })
    }
    if (kind === 'mercury') {
      return paint((context, width, height) => {
        context.fillStyle = '#8d8680'
        context.fillRect(0, 0, width, height)
        context.fillStyle = '#6e6863'
        for (let index = 0; index < 22; index += 1) {
          context.beginPath()
          context.arc((index * 83) % width, (index * 47) % height, 4 + (index % 4) * 2, 0, Math.PI * 2)
          context.fill()
        }
      })
    }
    if (kind === 'saturn') {
      return paint((context, width, height) => {
        const bands = ['#e6d3a4', '#c9ae78', '#f0e2c0', '#b89a68', '#efe0bc']
        bands.forEach((color, index) => {
          context.fillStyle = color
          context.fillRect(0, (height / bands.length) * index, width, height / bands.length + 1)
        })
      })
    }
    if (kind === 'uranus') {
      return paint((context, width, height) => {
        const gradient = context.createLinearGradient(0, 0, 0, height)
        gradient.addColorStop(0, '#b7d7d4')
        gradient.addColorStop(0.5, '#7fbfc4')
        gradient.addColorStop(1, '#d5ece8')
        context.fillStyle = gradient
        context.fillRect(0, 0, width, height)
      })
    }
    if (kind === 'neptune') {
      return paint((context, width, height) => {
        const gradient = context.createLinearGradient(0, 0, 0, height)
        gradient.addColorStop(0, '#355f9a')
        gradient.addColorStop(0.5, '#1d3f78')
        gradient.addColorStop(1, '#4d78b0')
        context.fillStyle = gradient
        context.fillRect(0, 0, width, height)
      })
    }
    if (kind === 'sun') {
      return paint((context, width, height) => {
        const gradient = context.createLinearGradient(0, 0, 0, height)
        gradient.addColorStop(0, '#f6d7a2')
        gradient.addColorStop(0.5, '#f0b15a')
        gradient.addColorStop(1, '#e28a3a')
        context.fillStyle = gradient
        context.fillRect(0, 0, width, height)
      })
    }
    return paint((context, width, height) => {
      context.fillStyle = '#9a8d7c'
      context.fillRect(0, 0, width, height)
      context.fillStyle = '#6d6256'
      context.fillRect(60, 80, 90, 40)
    })
  }, [kind])
}

export function Planet({
  kind,
  radius,
  position = [0, 0, 0],
}: {
  kind: string
  radius: number
  position?: [number, number, number]
}) {
  const texture = usePlanetTexture(kind)
  if (kind === 'sun') {
    return (
      <group position={position}>
        <mesh>
          <sphereGeometry args={[radius, 48, 32]} />
          <meshBasicMaterial map={texture ?? undefined} color="#f3c48a" />
        </mesh>
        <mesh scale={1.45}>
          <sphereGeometry args={[radius, 24, 16]} />
          <meshBasicMaterial color="#e39a55" transparent opacity={0.16} />
        </mesh>
      </group>
    )
  }
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[radius, 48, 32]} />
        <meshStandardMaterial map={texture ?? undefined} color="#ffffff" roughness={0.82} metalness={0.04} />
      </mesh>
      {kind === 'saturn' ? (
        <mesh rotation={[Math.PI / 2.35, 0.15, 0]}>
          <ringGeometry args={[radius * 1.4, radius * 2.2, 64]} />
          <meshBasicMaterial color="#e4d2a8" side={2} transparent opacity={0.8} />
        </mesh>
      ) : null}
      <mesh scale={1.06}>
        <sphereGeometry args={[radius, 32, 24]} />
        <meshBasicMaterial
          color={kind === 'earth' ? '#7eb6ff' : kind === 'mars' ? '#e39a78' : '#ffffff'}
          transparent
          opacity={kind === 'asteroid' ? 0 : 0.08}
          side={1}
        />
      </mesh>
    </group>
  )
}
