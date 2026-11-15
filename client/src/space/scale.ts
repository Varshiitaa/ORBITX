const AU_KM = 149_597_870.7

/** Artistic placement. Direction is the ecliptic vector. Distance is compressed so Mercury and Neptune can share one view. */
export function visualPosition(positionKm: { x: number; y: number; z: number }): [number, number, number] {
  const range = Math.hypot(positionKm.x, positionKm.y, positionKm.z)
  if (range < 1) return [0, 0, 0]
  const compressed = Math.pow(range / AU_KM, 0.55) * 2.4
  const scale = compressed / range
  return [positionKm.x * scale, positionKm.z * scale, -positionKm.y * scale]
}

export const VISUAL_SCALE_NOTE =
  'Rendered distances use r = (range / 1 AU) ^ 0.55 × 2.4. Planet sizes and the slow spin are chosen so the bodies stay readable. Neither is a physical radius or a sidereal day.'
