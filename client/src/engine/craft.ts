import type { SpacecraftSelection } from '../types'

export type EngineVisual = 'bell' | 'ion' | 'hybrid'

export interface CraftGeometry {
  body: [number, number, number]
  bodyColor: string
  panelLength: number
  panelWidth: number
  panelCount: number
  panelAreaM2: number
  rtg: boolean
  dishDiameter: number
  patch: boolean
  engine: EngineVisual
  instrumentIds: string[]
  spanM: number
}

const SOLAR_W_PER_M2 = 1361 * 0.29 * 0.8

export function craftGeometry(selection: SpacecraftSelection, instrumentIds: string[] = []): CraftGeometry {
  const heavy = selection.structure === 'struct-heavy'
  const light = selection.structure === 'struct-light'
  const body: [number, number, number] = heavy ? [1.35, 0.95, 1.2] : light ? [0.72, 0.5, 0.68] : [1.05, 0.74, 0.92]
  const bodyColor = selection.thermal === 'thermal-advanced' ? '#d7c49a' : '#d5dbe3'
  const rtg = selection.power === 'power-rtg'
  const earthWatts = selection.power === 'power-high-solar' ? 1800 : selection.power === 'power-basic-solar' ? 820 : 0
  const panelAreaM2 = earthWatts > 0 ? earthWatts / SOLAR_W_PER_M2 : 0
  const panelCount = panelAreaM2 > 0 ? 2 : 0
  const wingArea = panelCount > 0 ? panelAreaM2 / panelCount : 0
  const aspect = 3.4
  const panelWidth = wingArea > 0 ? Math.sqrt(wingArea / aspect) : 0
  const panelLength = panelWidth * aspect
  const dishDiameter =
    selection.communication === 'comm-high' ? 2.6 : selection.communication === 'comm-medium' ? 1.1 : 0.16
  const patch = selection.communication !== 'comm-high' && selection.communication !== 'comm-medium'
  const engine: EngineVisual =
    selection.propulsion === 'prop-electric' ? 'ion' : selection.propulsion === 'prop-advanced' ? 'hybrid' : 'bell'
  const spanM = body[0] + panelLength * Math.min(panelCount, 2)

  return {
    body,
    bodyColor,
    panelLength,
    panelWidth,
    panelCount,
    panelAreaM2,
    rtg,
    dishDiameter,
    patch,
    engine,
    instrumentIds: instrumentIds.filter(Boolean),
    spanM: Math.max(spanM, dishDiameter, body[1]),
  }
}
