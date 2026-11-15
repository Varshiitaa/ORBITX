import { getComponent, getInstrument, getMission, getObjective, getVehicle } from '../data/catalog'
import type { AchievementDef, MissionConfig, MissionReport, ObjectiveResult, ScoreBreakdown } from '../types'
import { computeMetrics } from './calculations'
import { SCORE_WEIGHTS, clamp } from './constants'

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'perfect-engineer',
    name: 'Perfect Engineer',
    description: 'Finish a mission with an engineering score of at least 90.',
  },
  {
    id: 'budget-master',
    name: 'Budget Master',
    description: 'Succeed with a budget-efficiency score of at least 85.',
  },
  {
    id: 'scientific-explorer',
    name: 'Scientific Explorer',
    description: 'Bring back a science score of at least 88.',
  },
  {
    id: 'fuel-optimizer',
    name: 'Fuel Optimizer',
    description: 'Succeed after using at least 90% of the loaded propellant.',
  },
  {
    id: 'mission-survivor',
    name: 'Mission Survivor',
    description: 'Succeed with spacecraft health under 60, or after answering at least two anomalies.',
  },
  {
    id: 'deep-space',
    name: 'Deep Space',
    description: 'Complete a Jupiter or asteroid mission.',
  },
  {
    id: 'first-light',
    name: 'First Light',
    description: 'Complete any mission and return science data.',
  },
  {
    id: 'steady-hand',
    name: 'Steady Hand',
    description: 'Answer every anomaly with the lower-risk choice and still succeed.',
  },
]

function roundScore(value: number) {
  return Math.round(clamp(value, 0, 100))
}

export function decisionNotes(mission: MissionConfig) {
  const metrics = computeMetrics(mission)
  const destination = getMission(mission.destinationId)
  const propulsion = getComponent(mission.spacecraft.propulsion)
  const power = getComponent(mission.spacecraft.power)
  const communication = getComponent(mission.spacecraft.communication)
  const thermal = getComponent(mission.spacecraft.thermal)
  const structure = getComponent(mission.spacecraft.structure)
  const vehicle = getVehicle(mission.launchVehicleId)
  const instruments = mission.instrumentIds.map((id) => getInstrument(id)?.name).filter(Boolean)
  const notes = [
    `${structure?.name ?? 'No structure'} carries the bus. Its shielding rating is ${metrics.structuralRating.toFixed(2)} against a radiation environment of ${destination?.radiation.toFixed(2) ?? '—'}.`,
    `${propulsion?.name ?? 'No propulsion'} uses Isp ${metrics.isp || '—'} s. The rocket equation loads ${Math.round(metrics.nominalPropellantKg).toLocaleString('en-US')} kg of propellant before the difficulty reserve, and the tanks fly with ${Math.round(metrics.tankPropellantKg).toLocaleString('en-US')} kg.`,
    `${power?.name ?? 'No power system'} produces ${Math.round(metrics.powerGeneratedW)} W at the destination, where sunlight is ${Math.round(metrics.solarFraction * 100)}% of the Earth value. Cruise load is ${Math.round(metrics.cruiseLoadW)} W.`,
    `${communication?.name ?? 'No antenna'} has a link index of ${Math.round(metrics.commsCapacity * 100)}% at this range.`,
    `${thermal?.name ?? 'No thermal system'} settles near ${Math.round(metrics.equilibriumTempC)}°C in the destination environment.`,
    `${vehicle?.name ?? 'No launcher'} is rated for ${Math.round(metrics.payloadCapacityKg).toLocaleString('en-US')} kg. The stacked spacecraft is ${Math.round(metrics.totalMassKg).toLocaleString('en-US')} kg.`,
    instruments.length > 0
      ? `The payload is ${instruments.join(', ')}.`
      : 'No instruments were selected.',
  ]
  return notes
}

export function buildReport(mission: MissionConfig): MissionReport | null {
  const flight = mission.flight
  if (!flight?.finished || !flight.result) return null
  const metrics = computeMetrics(mission)
  const destination = getMission(mission.destinationId)
  const result = flight.result
  const success = flight.outcome === 'success'

  const marginPct = metrics.payloadCapacityKg > 0 ? metrics.massMarginKg / metrics.payloadCapacityKg : 0
  let engineering = 28
  if (marginPct >= 0.08 && marginPct <= 0.32) engineering += 18
  else if (marginPct >= 0) engineering += 10
  if (metrics.powerBalanceW >= 40) engineering += 16
  else if (metrics.powerBalanceW >= 0) engineering += 10
  else engineering += 4
  if (metrics.thermalRating + 0.02 >= (destination?.thermalStress ?? 1)) engineering += 14
  else engineering += 4
  if (metrics.structuralRating + 0.02 >= (destination?.radiation ?? 1)) engineering += 10
  else engineering += 3
  const deep = destination?.id === 'jupiter' || destination?.id === 'asteroid'
  if (deep && metrics.thrustClass && metrics.thrustClass !== 'high') engineering += 8
  else if (!deep && metrics.thrustClass === 'high') engineering += 6
  else engineering += 4
  if (success) engineering += 6
  else engineering -= 18

  const science = result.dataReturned * 0.72 + metrics.scienceCoverage * 28 + (mission.objectiveIds.length >= 3 ? 4 : 0)

  let marginScore = 48
  if (marginPct >= 0.08 && marginPct <= 0.32) marginScore = 100
  else if (marginPct >= 0) marginScore = 72
  let powerScore = 36
  if (metrics.powerBalanceW >= 40 && metrics.powerGeneratedW > 0 && metrics.powerBalanceW <= metrics.powerGeneratedW * 0.55) powerScore = 100
  else if (metrics.powerBalanceW >= 0) powerScore = 76
  const usedFraction = result.fuelCapacityKg > 0 ? (result.fuelCapacityKg - result.fuelRemainingKg) / result.fuelCapacityKg : 0
  const fuelScore = success ? clamp(usedFraction * 100, 0, 100) : clamp(usedFraction * 55, 0, 100)
  const resources = marginScore * 0.34 + powerScore * 0.33 + fuelScore * 0.33

  const highRisk = flight.resolutions.filter((item) => item.risk === 'high').length
  let reliability = result.health * 0.62 + (success ? 32 : flight.stagesCleared * 3) - highRisk * 6

  const ratio = metrics.budgetUsd > 0 ? metrics.remainingBudgetUsd / metrics.budgetUsd : 0
  let budget = 58
  if (ratio >= 0.05 && ratio <= 0.32) budget = 100
  else if (ratio > 0.32 && ratio <= 0.5) budget = 84
  else if (ratio > 0.5) budget = 68
  else if (ratio >= 0) budget = 70
  if (!success) budget = Math.min(budget, 60)

  const breakdown: ScoreBreakdown = {
    engineering: roundScore(engineering),
    science: roundScore(science),
    resources: roundScore(resources),
    reliability: roundScore(reliability),
    budget: roundScore(budget),
    total: 0,
    weights: { ...SCORE_WEIGHTS },
    notes: {
      engineering:
        marginPct >= 0.08 && marginPct <= 0.32
          ? 'Mass margin, power, thermal protection, and shielding line up with this destination.'
          : 'One or more of mass margin, power, heat, or shielding is away from the comfortable band.',
      science: `The recorder returned ${result.dataReturned.toFixed(1)} of the science units this payload could collect.`,
      resources: `Propellant used was ${Math.round(usedFraction * 100)}% of the loaded tank. Power balance was ${Math.round(metrics.powerBalanceW)} W.`,
      reliability: success
        ? `The spacecraft finished with health at ${Math.round(result.health)}.`
        : `The flight ended early, with ${flight.stagesCleared} stages cleared.`,
      budget: !success
        ? 'The flight ended before a finished mission could be judged on cost.'
        : ratio >= 0.05 && ratio <= 0.32
          ? 'The budget was used with a real contingency still on the table.'
          : ratio > 0.32 && ratio <= 0.5
            ? 'The mission closed with a comfortable reserve still unspent.'
            : ratio > 0.5
              ? 'A large share of the budget was never turned into capability.'
              : 'Less than 5% of the budget remains.',
    },
  }
  breakdown.total = roundScore(
    breakdown.engineering * SCORE_WEIGHTS.engineering +
      breakdown.science * SCORE_WEIGHTS.science +
      breakdown.resources * SCORE_WEIGHTS.resources +
      breakdown.reliability * SCORE_WEIGHTS.reliability +
      breakdown.budget * SCORE_WEIGHTS.budget,
  )

  const objectives: ObjectiveResult[] = mission.objectiveIds.map((id) => {
    const objective = getObjective(id)
    const covered = metrics.coveredObjectiveIds.includes(id)
    let status: ObjectiveResult['status'] = 'missed'
    let note = 'The objective was not met.'
    if (covered && result.dataReturned >= 55 && success) {
      status = 'completed'
      note = 'Instruments that support this objective flew, and a solid data set came back.'
    } else if (covered && result.dataReturned >= 12) {
      status = 'partial'
      note = 'Some supporting data came back, short of a full return.'
    } else if (!covered) {
      note = 'No selected instrument supports this objective.'
    } else {
      note = 'The supporting instruments flew, but the data did not make it home.'
    }
    return { id, name: objective?.name ?? id, status, note }
  })

  const problems = [...flight.launchWarnings]
  if (flight.failureReason) problems.push(flight.failureReason)
  for (const resolution of flight.resolutions.filter((item) => item.risk === 'high')) {
    problems.push(`${resolution.title}: ${resolution.outcome}`)
  }
  if (result.temperatureC > 50) problems.push(`Cruise temperatures reached about ${Math.round(result.temperatureC)}°C.`)
  if (metrics.powerBalanceW < 0) problems.push('The spacecraft flew with a negative cruise power balance.')

  const fuelEfficiency = Math.round(clamp(usedFraction * 100, 0, 100))
  const achievements = evaluateAchievements(mission, breakdown, fuelEfficiency)

  let outcome = 'Partial success'
  if (!success) outcome = 'Mission failure'
  else if (breakdown.total >= 88) outcome = 'Full success'
  else if (breakdown.total >= 72) outcome = 'Success'

  const successPct = success
    ? roundScore(breakdown.science * 0.55 + breakdown.reliability * 0.45)
    : Math.round((flight.stagesCleared / flight.plan.length) * 42)

  return {
    generatedAt: new Date().toISOString(),
    outcome,
    successPct,
    failed: !success,
    failureReason: flight.failureReason,
    score: breakdown,
    objectives,
    budgetSpentUsd: metrics.totalCostUsd,
    remainingBudgetUsd: metrics.remainingBudgetUsd,
    totalBudgetUsd: metrics.budgetUsd,
    health: result.health,
    fuelRemainingKg: result.fuelRemainingKg,
    fuelCapacityKg: result.fuelCapacityKg,
    fuelEfficiency,
    powerGeneratedW: metrics.powerGeneratedW,
    powerConsumedW: metrics.cruiseLoadW,
    powerBalanceW: metrics.powerBalanceW,
    commsCapacity: metrics.commsCapacity,
    dataCollected: result.dataCollected,
    dataReturned: result.dataReturned,
    temperatureC: result.temperatureC,
    problems: problems.length > 0 ? problems : ['No significant problems were recorded.'],
    decisions: decisionNotes(mission),
    events: flight.resolutions,
    achievements,
    stagesCleared: flight.stagesCleared,
    stageCount: flight.plan.length,
  }
}

export function evaluateAchievements(mission: MissionConfig, score: ScoreBreakdown, fuelEfficiency: number) {
  const flight = mission.flight
  const success = flight?.outcome === 'success'
  const unlocked: string[] = []
  if (!flight?.finished) return unlocked
  if (success && score.engineering >= 90) unlocked.push('perfect-engineer')
  if (success && score.budget >= 85) unlocked.push('budget-master')
  if (success && score.science >= 88) unlocked.push('scientific-explorer')
  if (success && fuelEfficiency >= 90) unlocked.push('fuel-optimizer')
  if (success && ((flight.result?.health ?? 100) < 60 || flight.resolutions.length >= 2)) unlocked.push('mission-survivor')
  if (success && (mission.destinationId === 'jupiter' || mission.destinationId === 'asteroid')) unlocked.push('deep-space')
  if (success && (flight.result?.dataReturned ?? 0) >= 12) unlocked.push('first-light')
  if (success && flight.resolutions.length > 0 && flight.resolutions.every((item) => item.risk === 'low')) unlocked.push('steady-hand')
  return unlocked
}
