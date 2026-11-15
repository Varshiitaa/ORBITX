import { useEffect, useRef } from 'react'

type Star = { x: number; y: number; z: number; r: number; hue: string }

export function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return
    let frame = 0
    const stars: Star[] = Array.from({ length: 180 }, () => ({
      x: Math.random(),
      y: Math.random(),
      z: Math.random(),
      r: Math.random() * 1.4 + 0.3,
      hue: Math.random() > 0.72 ? '#00f0ff' : Math.random() > 0.55 ? '#34d399' : '#dbe7ff',
    }))

    const draw = (time: number) => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      context.clearRect(0, 0, canvas.width, canvas.height)
      for (const star of stars) {
        const drift = (star.y + time * 0.000012 * (0.35 + star.z)) % 1
        const twinkle = 0.35 + Math.abs(Math.sin(time * 0.0012 + star.x * 12)) * 0.65
        context.globalAlpha = twinkle * (0.35 + star.z * 0.65)
        context.fillStyle = star.hue
        context.beginPath()
        context.arc(star.x * canvas.width, drift * canvas.height, star.r, 0, Math.PI * 2)
        context.fill()
      }
      context.globalAlpha = 1
      frame = window.requestAnimationFrame(draw)
    }
    frame = window.requestAnimationFrame(draw)
    return () => window.cancelAnimationFrame(frame)
  }, [])

  return <canvas ref={ref} className="pointer-events-none fixed inset-0 -z-10 h-full w-full" aria-hidden="true" />
}
