import { describe, expect, it } from 'vitest'
import { visualPosition } from './scale'

const AU = 149_597_870.7

describe('visual solar-system scale', () => {
  it('keeps the Sun at the origin', () => {
    expect(visualPosition({ x: 0, y: 0, z: 0 })).toEqual([0, 0, 0])
  })

  it('places 1 AU on the ecliptic +X axis at 2.4 scene units', () => {
    const [x, y, z] = visualPosition({ x: AU, y: 0, z: 0 })
    expect(x).toBeCloseTo(2.4, 5)
    expect(y).toBeCloseTo(0, 5)
    expect(z).toBeCloseTo(0, 5)
  })

  it('maps ecliptic +Y to Three.js -Z and compresses an outer orbit', () => {
    const [x, y, z] = visualPosition({ x: 0, y: 30 * AU, z: 0 })
    expect(x).toBeCloseTo(0, 5)
    expect(y).toBeCloseTo(0, 5)
    expect(z).toBeCloseTo(-Math.pow(30, 0.55) * 2.4, 4)
    expect(Math.abs(z)).toBeLessThan(30 * 2.4)
  })
})
