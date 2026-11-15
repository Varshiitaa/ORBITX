import { describe, expect, it } from 'vitest'
import { buildReport } from './scoring'
import { simulateMission } from './simulation'
import { computeMetrics, emptySpacecraft } from './calculations'
import type { DestinationId, Difficulty, MissionConfig, SpacecraftSelection } from '../types'

function mission(options: {
  destinationId: DestinationId
  difficulty: Difficulty
  objectiveIds: string[]
  spacecraft: SpacecraftSelection
  instrumentIds: string[]
  launchVehicleId: string
}): MissionConfig {
  return {
    id: 'test-mission',
    name: 'Test mission',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    status: 'draft',
    flight: null,
    report: null,
    ...options,
  }
}

const lunarCraft: SpacecraftSelection = {
  structure: 'struct-standard',
  propulsion: 'prop-chemical',
  power: 'power-basic-solar',
  communication: 'comm-medium',
  thermal: 'thermal-basic',
  storage: 'store-standard',
}

describe('engineering model', () => {
  it('keeps the budget identity exact', () => {
    const config = mission({
      destinationId: 'lunar',
      difficulty: 'beginner',
      objectiveIds: ['obj-water', 'obj-geology', 'obj-composition'],
      spacecraft: lunarCraft,
      instrumentIds: ['inst-radar', 'inst-ir'],
      launchVehicleId: 'lv-explorer',
    })
    const metrics = computeMetrics(config)
    expect(metrics.totalCostUsd).toBe(
      metrics.costs.components + metrics.costs.instruments + metrics.costs.launch + metrics.costs.operations,
    )
    expect(metrics.remainingBudgetUsd).toBe(metrics.budgetUsd - metrics.totalCostUsd)
    expect(metrics.totalMassKg).toBeCloseTo(metrics.dryMassKg + metrics.tankPropellantKg, 6)
    expect(metrics.ready).toBe(true)
  })

  it('rejects a launcher that cannot lift the spacecraft', () => {
    const metrics = computeMetrics(
      mission({
        destinationId: 'lunar',
        difficulty: 'beginner',
        objectiveIds: ['obj-water', 'obj-geology', 'obj-composition'],
        spacecraft: lunarCraft,
        instrumentIds: ['inst-radar', 'inst-ir'],
        launchVehicleId: 'lv-light',
      }),
    )
    expect(metrics.ready).toBe(false)
    expect(metrics.issues.some((item) => item.code === 'mass')).toBe(true)
  })

  it('rejects an all-chemical Jupiter stack and a solar-powered one', () => {
    const chemical = computeMetrics(
      mission({
        destinationId: 'jupiter',
        difficulty: 'expert',
        objectiveIds: ['obj-atmosphere', 'obj-magnetic', 'obj-composition'],
        spacecraft: {
          structure: 'struct-heavy',
          propulsion: 'prop-chemical',
          power: 'power-rtg',
          communication: 'comm-high',
          thermal: 'thermal-advanced',
          storage: 'store-high',
        },
        instrumentIds: ['inst-atmo', 'inst-mag', 'inst-ir'],
        launchVehicleId: 'lv-deep',
      }),
    )
    expect(chemical.ready).toBe(false)
    expect(chemical.totalMassKg).toBeGreaterThan(chemical.payloadCapacityKg)

    const solar = computeMetrics(
      mission({
        destinationId: 'jupiter',
        difficulty: 'expert',
        objectiveIds: ['obj-atmosphere', 'obj-magnetic', 'obj-composition'],
        spacecraft: {
          structure: 'struct-heavy',
          propulsion: 'prop-advanced',
          power: 'power-basic-solar',
          communication: 'comm-high',
          thermal: 'thermal-advanced',
          storage: 'store-high',
        },
        instrumentIds: ['inst-atmo', 'inst-mag', 'inst-ir'],
        launchVehicleId: 'lv-explorer',
      }),
    )
    expect(solar.ready).toBe(false)
    expect(solar.powerGeneratedW).toBeLessThan(75)
  })

  it('accepts a coherent expert Jupiter design', () => {
    const metrics = computeMetrics(
      mission({
        destinationId: 'jupiter',
        difficulty: 'expert',
        objectiveIds: ['obj-atmosphere', 'obj-magnetic', 'obj-composition'],
        spacecraft: {
          structure: 'struct-heavy',
          propulsion: 'prop-advanced',
          power: 'power-rtg',
          communication: 'comm-high',
          thermal: 'thermal-advanced',
          storage: 'store-high',
        },
        instrumentIds: ['inst-atmo', 'inst-mag', 'inst-ir'],
        launchVehicleId: 'lv-explorer',
      }),
    )
    expect(metrics.issues.filter((item) => item.level === 'error').map((item) => item.message)).toEqual([])
    expect(metrics.ready).toBe(true)
    expect(metrics.powerBalanceW).toBeGreaterThan(0)
    expect(metrics.commsCapacity).toBeGreaterThan(0.6)
  })

  it('makes Mars chemical and electric designs use different launchers', () => {
    const shared = {
      destinationId: 'mars' as const,
      difficulty: 'intermediate' as const,
      objectiveIds: ['obj-water', 'obj-habitability', 'obj-geology', 'obj-atmosphere'],
      instrumentIds: ['inst-radar', 'inst-ir'],
    }
    const chemical = computeMetrics(
      mission({
        ...shared,
        spacecraft: {
          structure: 'struct-standard',
          propulsion: 'prop-chemical',
          power: 'power-high-solar',
          communication: 'comm-medium',
          thermal: 'thermal-basic',
          storage: 'store-standard',
        },
        launchVehicleId: 'lv-explorer',
      }),
    )
    const chemicalHeavy = computeMetrics(
      mission({
        ...shared,
        spacecraft: chemical ? {
          structure: 'struct-standard',
          propulsion: 'prop-chemical',
          power: 'power-high-solar',
          communication: 'comm-medium',
          thermal: 'thermal-basic',
          storage: 'store-standard',
        } : emptySpacecraft(),
        launchVehicleId: 'lv-heavy',
      }),
    )
    const electric = computeMetrics(
      mission({
        ...shared,
        spacecraft: {
          structure: 'struct-standard',
          propulsion: 'prop-electric',
          power: 'power-high-solar',
          communication: 'comm-medium',
          thermal: 'thermal-basic',
          storage: 'store-standard',
        },
        launchVehicleId: 'lv-light',
      }),
    )
    expect(chemical.ready).toBe(false)
    expect(chemicalHeavy.ready).toBe(true)
    expect(electric.ready).toBe(true)
    expect(electric.totalMassKg).toBeLessThan(chemicalHeavy.totalMassKg)
  })
})

describe('simulation', () => {
  const lunar = mission({
    destinationId: 'lunar',
    difficulty: 'beginner',
    objectiveIds: ['obj-water', 'obj-geology', 'obj-composition'],
    spacecraft: lunarCraft,
    instrumentIds: ['inst-radar', 'inst-ir'],
    launchVehicleId: 'lv-explorer',
  })

  it('flies a sound lunar mission to a scored success', () => {
    const flight = simulateMission(lunar, { seed: 11, policy: 'safe' })
    expect(flight.finished).toBe(true)
    expect(flight.outcome).toBe('success')
    expect(flight.result?.dataReturned).toBeGreaterThan(40)
    const report = buildReport({ ...lunar, flight, status: 'completed' })
    expect(report).not.toBeNull()
    expect(report?.failed).toBe(false)
    expect(report?.score.total).toBeGreaterThanOrEqual(70)
    expect(report?.objectives.every((item) => item.status !== 'missed')).toBe(true)
    const reserve = report!.remainingBudgetUsd / report!.totalBudgetUsd
    if (reserve > 0.32 && reserve <= 0.5) {
      expect(report?.score.notes.budget).toBe('The mission closed with a comfortable reserve still unspent.')
    }
  })

  it('is deterministic for the same seed and choices', () => {
    const first = simulateMission(lunar, { seed: 99, policy: 'safe' })
    const second = simulateMission(lunar, { seed: 99, policy: 'safe' })
    expect(first.outcome).toBe(second.outcome)
    expect(first.result?.dataReturned).toBe(second.result?.dataReturned)
    expect(first.resolutions.map((item) => item.optionId)).toEqual(second.resolutions.map((item) => item.optionId))
  })

  it('lets a fuel leak stop an expert insertion and spare a beginner', () => {
    const expert = mission({
      destinationId: 'lunar',
      difficulty: 'expert',
      objectiveIds: ['obj-water', 'obj-geology', 'obj-composition'],
      spacecraft: {
        structure: 'struct-light',
        propulsion: 'prop-chemical',
        power: 'power-basic-solar',
        communication: 'comm-low',
        thermal: 'thermal-advanced',
        storage: 'store-standard',
      },
      instrumentIds: ['inst-soil', 'inst-camera'],
      launchVehicleId: 'lv-explorer',
    })
    const beginner = { ...lunar, difficulty: 'beginner' as const }
    expect(computeMetrics(expert).ready).toBe(true)
    const expertFlight = simulateMission(expert, { seed: 3, policy: 'risky', forceEventIds: ['fuel-leak'] })
    const beginnerFlight = simulateMission(beginner, { seed: 3, policy: 'risky', forceEventIds: ['fuel-leak'] })
    expect(expertFlight.outcome).toBe('failure')
    expect(expertFlight.failureReason).toMatch(/propellant/i)
    expect(beginnerFlight.outcome).toBe('success')
  })

  it('overheats a poorly protected Venus spacecraft and not a protected one', () => {
    const objectives = ['obj-atmosphere', 'obj-composition']
    const instruments = ['inst-atmo', 'inst-ir']
    const basic = mission({
      destinationId: 'venus',
      difficulty: 'beginner',
      objectiveIds: objectives,
      spacecraft: {
        structure: 'struct-light',
        propulsion: 'prop-chemical',
        power: 'power-basic-solar',
        communication: 'comm-medium',
        thermal: 'thermal-basic',
        storage: 'store-standard',
      },
      instrumentIds: instruments,
      launchVehicleId: 'lv-explorer',
    })
    const protectedCraft = mission({
      destinationId: 'venus',
      difficulty: 'beginner',
      objectiveIds: objectives,
      spacecraft: { ...basic.spacecraft, thermal: 'thermal-advanced' },
      instrumentIds: instruments,
      launchVehicleId: 'lv-explorer',
    })
    expect(computeMetrics(basic).ready).toBe(true)
    const hot = simulateMission(basic, { seed: 5, policy: 'safe', forceEventIds: ['solar-storm'] })
    const cool = simulateMission(protectedCraft, { seed: 5, policy: 'safe', forceEventIds: ['solar-storm'] })
    expect(hot.outcome).toBe('success')
    expect(cool.outcome).toBe('success')
    expect(hot.result?.temperatureC).toBeGreaterThan(70)
    expect(cool.result?.health).toBeGreaterThan(hot.result?.health ?? 0)
  })

  it('loses the Jupiter data set when the antenna cannot close the link', () => {
    const weak = mission({
      destinationId: 'jupiter',
      difficulty: 'beginner',
      objectiveIds: ['obj-atmosphere', 'obj-magnetic', 'obj-composition'],
      spacecraft: {
        structure: 'struct-heavy',
        propulsion: 'prop-advanced',
        power: 'power-rtg',
        communication: 'comm-low',
        thermal: 'thermal-advanced',
        storage: 'store-standard',
      },
      instrumentIds: ['inst-atmo', 'inst-mag', 'inst-ir'],
      launchVehicleId: 'lv-explorer',
    })
    expect(computeMetrics(weak).ready).toBe(true)
    const flight = simulateMission(weak, { seed: 8, policy: 'safe' })
    expect(flight.outcome).toBe('failure')
    expect(flight.failureReason).toMatch(/communications/i)
  })
})
