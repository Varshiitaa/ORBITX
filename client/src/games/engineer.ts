import { computeMetrics, emptySpacecraft } from '../engine/calculations'
import { clamp } from '../engine/constants'
import type { DestinationId, Difficulty, MissionConfig, SpacecraftSelection } from '../types'

export interface EngineerBrief {
  difficulty: Difficulty
  destinationId: DestinationId
  objectiveIds: string[]
  title: string
  requirement: string
}

export const ENGINEER_BRIEFS: Record<Difficulty, EngineerBrief> = {
  beginner: {
    difficulty: 'beginner',
    destinationId: 'earth',
    objectiveIds: ['obj-geology'],
    title: 'Earth mapping orbiter',
    requirement: 'Close a geology mission in Earth orbit. Every bus slot, one supporting instrument, and a launcher that can lift the wet mass.',
  },
  intermediate: {
    difficulty: 'intermediate',
    destinationId: 'mars',
    objectiveIds: ['obj-geology', 'obj-habitability'],
    title: 'Mars reconnaissance orbiter',
    requirement: 'Fly geology and habitability at Mars. Power, link, thermal, mass, and budget all have to close together.',
  },
  expert: {
    difficulty: 'expert',
    destinationId: 'jupiter',
    objectiveIds: ['obj-magnetic'],
    title: 'Jupiter fields probe',
    requirement: 'A magnetic-field mission at Jupiter. Sunlight is too weak for a small solar array, and the expert budget is tight.',
  },
}

export interface EngineerScore {
  total: number
  compatibility: number
  budget: number
  mass: number
  power: number
  science: number
  won: boolean
}

export function engineerMission(input: {
  difficulty: Difficulty
  spacecraft: SpacecraftSelection
  instrumentIds: string[]
  launchVehicleId: string | null
}): MissionConfig {
  const brief = ENGINEER_BRIEFS[input.difficulty]
  const now = '2026-01-01T00:00:00.000Z'
  return {
    id: 'engineer-game',
    name: brief.title,
    createdAt: now,
    updatedAt: now,
    status: 'draft',
    difficulty: input.difficulty,
    destinationId: brief.destinationId,
    objectiveIds: brief.objectiveIds,
    spacecraft: input.spacecraft,
    instrumentIds: input.instrumentIds,
    launchVehicleId: input.launchVehicleId,
    flight: null,
    report: null,
  }
}

export function scoreEngineer(mission: MissionConfig): EngineerScore & { errors: number } {
  const metrics = computeMetrics(mission)
  const errors = metrics.issues.filter((issue) => issue.level === 'error').length
  const compatibility = errors === 0 ? 100 : Math.max(0, 100 - errors * 16)
  const budget = metrics.budgetUsd > 0 ? clamp(metrics.remainingBudgetUsd / metrics.budgetUsd, 0, 1) * 100 : 0
  const mass = metrics.physics.launchCompatible ? clamp(metrics.massMarginKg / Math.max(metrics.payloadCapacityKg, 1), 0, 1) * 100 : 0
  const power = metrics.powerBalanceW >= 0 ? Math.min(100, 50 + metrics.powerBalanceW / 25) : 0
  const science = clamp(metrics.instrumentCapability, 0, 100)
  const won = metrics.ready
  const blended = compatibility * 0.3 + budget * 0.2 + mass * 0.2 + power * 0.15 + science * 0.15
  const total = Math.round(won ? blended : Math.min(58, blended * 0.62))
  return {
    total,
    compatibility: Math.round(compatibility),
    budget: Math.round(budget),
    mass: Math.round(mass),
    power: Math.round(power),
    science: Math.round(science),
    won,
    errors,
  }
}

export function blankEngineerCraft(): SpacecraftSelection {
  return emptySpacecraft()
}
