import { describe, expect, it } from 'vitest'
import { craftGeometry } from './craft'
import { computeMetrics } from './calculations'
import { conicPoint, eclipseFraction } from './physics'
import { createFlight, missionHoursFor } from './simulation'
import type { DestinationId, Difficulty, MissionConfig, SpacecraftSelection } from '../types'

function mission(options: {
  destinationId: DestinationId
  difficulty?: Difficulty
  spacecraft: SpacecraftSelection
  instrumentIds: string[]
  launchVehicleId: string
  objectiveIds?: string[]
}): MissionConfig {
  return {
    id: 'physics-test',
    name: 'Physics test',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    status: 'draft',
    difficulty: options.difficulty ?? 'intermediate',
    destinationId: options.destinationId,
    objectiveIds: options.objectiveIds ?? ['obj-composition'],
    spacecraft: options.spacecraft,
    instrumentIds: options.instrumentIds,
    launchVehicleId: options.launchVehicleId,
    flight: null,
    report: null,
  }
}

const bus: SpacecraftSelection = {
  structure: 'struct-standard',
  propulsion: 'prop-chemical',
  power: 'power-high-solar',
  communication: 'comm-medium',
  thermal: 'thermal-basic',
  storage: 'store-standard',
}

describe('engineering physics', () => {
  it('places a transfer ellipse on its periapsis and apoapsis', () => {
    const start = conicPoint(6771, 384400, 0)
    const end = conicPoint(6771, 384400, Math.PI)
    expect(start.radiusKm).toBeCloseTo(6771, 3)
    expect(end.radiusKm).toBeCloseTo(384400, 3)
  })

  it('sizes a low Earth eclipse from the cylindrical umbra', () => {
    const fraction = eclipseFraction(6371 + 550, 6371)
    expect(fraction).toBeGreaterThan(0.3)
    expect(fraction).toBeLessThan(0.45)
  })

  it('drops sunlight and link rate as the destination gets farther', () => {
    const earth = computeMetrics(
      mission({
        destinationId: 'earth',
        spacecraft: { ...bus, communication: 'comm-low', power: 'power-basic-solar' },
        instrumentIds: ['inst-camera'],
        launchVehicleId: 'lv-light',
        objectiveIds: ['obj-geology'],
      }),
    )
    const mars = computeMetrics(
      mission({
        destinationId: 'mars',
        spacecraft: { ...bus, power: 'power-basic-solar', communication: 'comm-low' },
        instrumentIds: ['inst-ir'],
        launchVehicleId: 'lv-heavy',
        objectiveIds: ['obj-composition'],
      }),
    )
    const jupiterLow = computeMetrics(
      mission({
        destinationId: 'jupiter',
        spacecraft: { ...bus, communication: 'comm-low', power: 'power-rtg', structure: 'struct-heavy', thermal: 'thermal-advanced', storage: 'store-high', propulsion: 'prop-advanced' },
        instrumentIds: ['inst-mag'],
        launchVehicleId: 'lv-explorer',
        objectiveIds: ['obj-magnetic'],
      }),
    )
    const jupiterHigh = computeMetrics(
      mission({
        ...{
          destinationId: 'jupiter' as const,
          spacecraft: { ...jupiterLow ? bus : bus, communication: 'comm-high', power: 'power-rtg', structure: 'struct-heavy', thermal: 'thermal-advanced', storage: 'store-high', propulsion: 'prop-advanced' },
          instrumentIds: ['inst-mag'],
          launchVehicleId: 'lv-explorer',
          objectiveIds: ['obj-magnetic'],
        },
      }),
    )
    expect(mars.physics.solarFluxWm2).toBeLessThan(earth.physics.solarFluxWm2 * 0.5)
    expect(mars.powerGeneratedW / earth.powerGeneratedW).toBeLessThan(0.7)
    expect(earth.physics.linkMaxBps).toBeGreaterThan(jupiterLow.physics.linkMaxBps * 1000)
    expect(jupiterHigh.physics.linkMarginDb).toBeGreaterThan(jupiterLow.physics.linkMarginDb)
    expect(jupiterHigh.physics.linkCapable).toBe(true)
    expect(jupiterLow.physics.linkCapable).toBe(false)
  })

  it('updates mass, propellant, power, battery, link, and thermal when an instrument is added', () => {
    const baseConfig = mission({
      destinationId: 'lunar',
      difficulty: 'beginner',
      spacecraft: { ...bus, power: 'power-basic-solar', communication: 'comm-low' },
      instrumentIds: ['inst-camera'],
      launchVehicleId: 'lv-explorer',
      objectiveIds: ['obj-geology'],
    })
    const base = computeMetrics(baseConfig)
    const next = computeMetrics({ ...baseConfig, instrumentIds: ['inst-camera', 'inst-radar'] })
    expect(next.payloadMassKg).toBeGreaterThan(base.payloadMassKg)
    expect(next.totalMassKg).toBeGreaterThan(base.totalMassKg)
    expect(next.costs.instruments).toBeGreaterThan(base.costs.instruments)
    expect(next.remainingBudgetUsd).toBeLessThan(base.remainingBudgetUsd)
    expect(next.nominalPropellantKg).toBeGreaterThan(base.nominalPropellantKg)
    expect(next.physics.powerConsumptionW).toBeGreaterThan(base.physics.powerConsumptionW)
    expect(next.physics.batteryRequiredWh).toBeGreaterThan(base.physics.batteryRequiredWh)
    expect(next.physics.linkRequiredBps).toBeGreaterThan(base.physics.linkRequiredBps)
    expect(next.physics.thermalHotC).toBeGreaterThan(base.physics.thermalHotC)
    expect(next.totalMassKg).toBeCloseTo(next.dryMassKg + next.tankPropellantKg, 6)
  })

  it('builds the spacecraft shape from the selected power, antenna, and engine', () => {
    const basic = craftGeometry({ ...bus, power: 'power-basic-solar' })
    const high = craftGeometry({ ...bus, power: 'power-high-solar' })
    const rtg = craftGeometry({ ...bus, power: 'power-rtg' })
    const dish = craftGeometry({ ...bus, communication: 'comm-high' }, ['inst-radar', 'inst-mag'])
    expect(high.panelLength).toBeGreaterThan(basic.panelLength)
    expect(high.panelAreaM2).toBeGreaterThan(basic.panelAreaM2)
    expect(rtg.panelCount).toBe(0)
    expect(rtg.rtg).toBe(true)
    expect(dish.dishDiameter).toBeGreaterThan(basic.dishDiameter)
    expect(dish.engine).toBe('bell')
    expect(craftGeometry({ ...bus, propulsion: 'prop-electric' }).engine).toBe('ion')
    expect(dish.instrumentIds).toEqual(['inst-radar', 'inst-mag'])
  })

  it('runs hotter with basic Venus insulation than with the advanced radiator', () => {
    const shared = {
      destinationId: 'venus' as const,
      spacecraft: { ...bus, thermal: 'thermal-basic' as const },
      instrumentIds: ['inst-atmo'],
      launchVehicleId: 'lv-heavy',
      objectiveIds: ['obj-atmosphere'],
    }
    const basic = computeMetrics(mission(shared))
    const advanced = computeMetrics(mission({ ...shared, spacecraft: { ...shared.spacecraft, thermal: 'thermal-advanced' } }))
    expect(basic.physics.thermalSafe).toBe(false)
    expect(advanced.physics.thermalHotC).toBeLessThan(basic.physics.thermalHotC)
    expect(advanced.physics.thermalSafe).toBe(true)
    expect(basic.physics.launchCompatible).toBe(basic.totalMassKg <= basic.payloadCapacityKg)
  })

  it('keeps the launch sequence on screen long enough to watch', () => {
    const flight = createFlight(
      mission({
        destinationId: 'mars',
        spacecraft: bus,
        instrumentIds: ['inst-camera'],
        launchVehicleId: 'lv-heavy',
      }),
    )
    const prelaunch = flight.plan[0]
    expect(prelaunch?.id).toBe('prelaunch')
    expect(missionHoursFor(flight, 3)).toBeCloseTo(prelaunch?.durationHours ?? 0, 5)
    const launch = { ...flight, stageIndex: flight.plan.findIndex((stage) => stage.id === 'launch') }
    const launchStage = launch.plan[launch.stageIndex]
    expect(missionHoursFor(launch, 8)).toBeCloseTo(launchStage?.durationHours ?? 0, 5)
    const cruise = { ...flight, stageIndex: flight.plan.findIndex((stage) => stage.id === 'cruise') }
    const cruiseHours = missionHoursFor(cruise, 76.5)
    const ascentHours = flight.plan.filter((stage) => stage.id === 'prelaunch' || stage.id === 'ignition' || stage.id === 'launch').reduce((sum, stage) => sum + stage.durationHours, 0)
    const total = flight.plan.reduce((sum, stage) => sum + stage.durationHours, 0)
    expect(cruiseHours).toBeCloseTo(total - ascentHours, 4)
  })
})
