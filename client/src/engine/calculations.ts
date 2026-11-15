import {
  COMPONENT_CATEGORIES,
  getComponent,
  getInstrument,
  getMission,
  getObjective,
  getVehicle,
  instrumentsForObjective,
} from '../data/catalog'
import type {
  EngineeringIssue,
  MassBreakdown,
  Metrics,
  MissionConfig,
  SpacecraftSelection,
} from '../types'
import { BUS_POWER_W, DIFFICULTY, G0, clamp } from './constants'
import { computePhysics } from './physics'

/**
 * Educational engineering model.
 *
 * Mass is the sum of selected hardware, instruments, and propellant.
 * Propellant uses the Tsiolkovsky rocket equation:
 *   m_propellant = m_dry * (exp(deltaV / (Isp * g0)) - 1)
 * The difficulty reserve multiplies that load. Beginner carries more
 * margin and more mass. Expert carries almost none.
 *
 * Solar power is the 1 AU rating divided by distance_AU squared.
 * Radioisotope power ignores that factor.
 * Electric propulsion power is a cruise load. Chemical and advanced
 * propulsion power is a burn load, covered briefly by the battery.
 *
 * Link capacity = clamp((antenna link factor / comms distance) / 3.15).
 * It is an index so players can see cause and effect, not a flight link budget.
 *
 * Equilibrium temperature:
 *   22°C + max(-8, (thermal stress - thermal rating) * 160)
 */

export const MODEL_NOTES = {
  mass: 'Total mass = dry mass + propellant tank. Dry mass adds the frame, propulsion, power, communications, thermal hardware, battery, and every selected instrument.',
  propellant:
    'Propellant uses the Tsiolkovsky equation, m = m_dry × (e^(Δv / (Isp × g0)) − 1), then a difficulty reserve. g0 is 9.80665 m/s². Chemical systems spend that load on departure and insertion. Electric systems spend most of it during cruise.',
  power:
    'Cruise power subtracts the 75 W bus, communications, thermal control, battery overhead, instruments, and — for electric propulsion only — the thruster. Solar generation is the Earth rating divided by distance in AU squared.',
  link: 'The flight score still uses an educational link index: antenna factor divided by distance, then divided by 3.15 and clamped between 0 and 1. The engineering panel also runs a link budget: free-space loss, antenna gain, and a coded BPSK threshold of 5.5 dB Eb/N0 plus 1.5 dB implementation loss.',
  thermal:
    'The flight temperature starts at 22°C and moves by 160°C times the gap between destination thermal stress and the protection rating. Extra protection cannot push the bus more than 8°C below the baseline. A separate single-node Stefan-Boltzmann balance reports hot and cold cases from sunlight, electrical heat, radiator area, and heater power.',
  budget:
    'Remaining budget = difficulty-adjusted mission budget − component cost − instrument cost − launcher cost − operations. Operations are duration days × the daily rate.',
  score:
    'The score weights engineering 28%, science 26%, resource management 16%, reliability 18%, and budget efficiency 12%. A failed flight can still receive a partial score from the stages it cleared.',
}

function emptyMass(): MassBreakdown {
  return {
    structure: 0,
    propulsion: 0,
    power: 0,
    communication: 0,
    thermal: 0,
    storage: 0,
    payload: 0,
    propellant: 0,
  }
}

function issue(level: EngineeringIssue['level'], code: string, message: string, step: EngineeringIssue['step']): EngineeringIssue {
  return { level, code, message, step }
}

export function emptySpacecraft(): SpacecraftSelection {
  return {
    structure: null,
    propulsion: null,
    power: null,
    communication: null,
    thermal: null,
    storage: null,
  }
}

export function linkCapacity(linkFactor: number, commsAu: number) {
  const index = linkFactor / Math.max(commsAu, 0.1)
  return clamp(index / 3.15, 0, 1)
}

export function equilibriumTemperature(thermalStress: number, thermalRating: number, tempOffset = 0) {
  const gap = thermalStress - thermalRating
  return 22 + Math.max(-8, gap * 160) + tempOffset
}

export function computeMetrics(mission: MissionConfig): Metrics {
  const destination = getMission(mission.destinationId)
  const vehicle = getVehicle(mission.launchVehicleId)
  const difficulty = DIFFICULTY[mission.difficulty]
  const issues: EngineeringIssue[] = []
  const mass = emptyMass()

  if (!destination) {
    issues.push(issue('error', 'mission', 'Choose a destination before this mission can be checked.', 'mission'))
  }
  if (mission.objectiveIds.length === 0) {
    issues.push(issue('error', 'objectives', 'Choose at least one scientific objective.', 'objectives'))
  }

  for (const category of COMPONENT_CATEGORIES) {
    if (!mission.spacecraft[category.id]) {
      issues.push(
        issue('error', `missing-${category.id}`, `Select a ${category.label.toLowerCase()} option.`, 'spacecraft'),
      )
    }
  }

  const structure = getComponent(mission.spacecraft.structure)
  const propulsion = getComponent(mission.spacecraft.propulsion)
  const power = getComponent(mission.spacecraft.power)
  const communication = getComponent(mission.spacecraft.communication)
  const thermal = getComponent(mission.spacecraft.thermal)
  const storage = getComponent(mission.spacecraft.storage)

  mass.structure = structure?.massKg ?? 0
  mass.propulsion = propulsion?.massKg ?? 0
  mass.power = power?.massKg ?? 0
  mass.communication = communication?.massKg ?? 0
  mass.thermal = thermal?.massKg ?? 0
  mass.storage = storage?.massKg ?? 0

  const instruments = mission.instrumentIds.map((id) => getInstrument(id)).filter((item) => item !== null)
  if (mission.instrumentIds.length === 0) {
    issues.push(issue('error', 'instruments', 'Select at least one scientific instrument.', 'instruments'))
  }
  mass.payload = instruments.reduce((sum, instrument) => sum + instrument.massKg, 0)

  const dryMassKg =
    mass.structure + mass.propulsion + mass.power + mass.communication + mass.thermal + mass.storage + mass.payload

  let nominalPropellantKg = 0
  let isp = 0
  let departureFraction = 0
  let cruiseFraction = 0
  let insertionFraction = 0
  const deltaV = destination?.deltaV ?? 0

  if (propulsion?.isp && destination) {
    isp = propulsion.isp
    const exhaust = propulsion.isp * G0
    nominalPropellantKg = dryMassKg * (Math.exp(deltaV / exhaust) - 1)
    departureFraction = propulsion.departure ?? 0
    cruiseFraction = propulsion.cruise ?? 0
    insertionFraction = propulsion.insertion ?? 0
  }

  const tankPropellantKg = nominalPropellantKg * difficulty.propellant
  mass.propellant = tankPropellantKg
  const totalMassKg = dryMassKg + tankPropellantKg
  const payloadCapacityKg = vehicle?.maxPayloadKg ?? 0
  const massMarginKg = payloadCapacityKg - totalMassKg

  if (!vehicle) {
    issues.push(issue('error', 'launcher', 'Select a launch vehicle.', 'launch'))
  } else if (totalMassKg > payloadCapacityKg) {
    issues.push(
      issue(
        'error',
        'mass',
        `${vehicle.name} can lift ${Math.round(payloadCapacityKg).toLocaleString('en-US')} kg. This spacecraft is ${Math.round(totalMassKg - payloadCapacityKg).toLocaleString('en-US')} kg over that limit.`,
        'launch',
      ),
    )
  } else if (payloadCapacityKg > 0 && massMarginKg / payloadCapacityKg < 0.08) {
    issues.push(
      issue(
        'warning',
        'mass-margin',
        `Mass margin is ${Math.round((massMarginKg / payloadCapacityKg) * 100)}%. A margin under 8% leaves little room for the propellant reserve.`,
        'launch',
      ),
    )
  }

  const solarFraction = destination ? 1 / Math.max(destination.distanceAu, 0.4) ** 2 : 1
  const powerGeneratedW = power ? (power.solar ? power.generatesW * solarFraction : power.generatesW) : 0

  let cruiseLoadW = BUS_POWER_W
  let burnExtraW = 0
  if (communication) cruiseLoadW += communication.drawsW
  if (thermal) cruiseLoadW += thermal.drawsW
  if (storage) cruiseLoadW += storage.drawsW
  if (propulsion) {
    if (propulsion.thrustClass === 'low') cruiseLoadW += propulsion.drawsW
    else burnExtraW += propulsion.drawsW
  }
  for (const instrument of instruments) cruiseLoadW += instrument.drawsW
  const burnLoadW = cruiseLoadW + burnExtraW
  const powerBalanceW = powerGeneratedW - cruiseLoadW

  if (!power) {
    issues.push(issue('error', 'power-missing', 'Select a power system.', 'spacecraft'))
  } else if (powerGeneratedW < BUS_POWER_W) {
    issues.push(
      issue(
        'error',
        'power-bus',
        `The power system produces ${Math.round(powerGeneratedW)} W at the destination. The spacecraft bus alone needs ${BUS_POWER_W} W.`,
        'resources',
      ),
    )
  } else if (propulsion?.thrustClass === 'low' && powerBalanceW < 0) {
    issues.push(
      issue(
        'error',
        'power-electric',
        `Electric propulsion needs ${Math.round(cruiseLoadW)} W during cruise. This design produces ${Math.round(powerGeneratedW)} W at the destination.`,
        'resources',
      ),
    )
  } else if (powerBalanceW < 0) {
    issues.push(
      issue(
        'warning',
        'power-balance',
        `Cruise power is short by ${Math.round(-powerBalanceW)} W. Scientific operations and the battery will be derated.`,
        'resources',
      ),
    )
  } else if (powerBalanceW < 40) {
    issues.push(
      issue(
        'warning',
        'power-margin',
        `Cruise power margin is only ${Math.round(powerBalanceW)} W. An anomaly that adds load can cut into the science return.`,
        'resources',
      ),
    )
  }

  if (power && storage && burnExtraW > 0) {
    const burnHours = 0.35
    const deficitW = Math.max(0, burnLoadW - powerGeneratedW)
    const burnWh = deficitW * burnHours
    if (burnWh > (storage.batteryWh ?? 0) * 0.85) {
      issues.push(
        issue(
          'warning',
          'burn-battery',
          'The battery may not cover the propulsion burn if the arrays are already fully loaded.',
          'resources',
        ),
      )
    }
  }

  const commsCapacity =
    communication && destination ? linkCapacity(communication.linkFactor ?? 0, destination.commsAu) : 0
  if (destination && communication && commsCapacity < 0.45) {
    issues.push(
      issue(
        'warning',
        'comms',
        `The link index at ${destination.destination} is ${Math.round(commsCapacity * 100)}%. A large share of the science data will not come back.`,
        'resources',
      ),
    )
  }

  const thermalRating = thermal?.thermalRating ?? 0
  const structuralRating = structure?.structuralRating ?? 0
  const equilibriumTempC = destination ? equilibriumTemperature(destination.thermalStress, thermalRating) : 22

  if (destination && thermal) {
    const thin = thermalRating + 0.05 < destination.thermalStress
    if (mission.difficulty === 'expert' && thermalRating < destination.thermalStress) {
      issues.push(
        issue(
          'error',
          'thermal',
          `Expert difficulty requires thermal protection rated for ${destination.destination}. The current choice runs to about ${Math.round(equilibriumTempC)}°C in this model.`,
          'spacecraft',
        ),
      )
    } else if (thin) {
      issues.push(
        issue(
          'warning',
          'thermal',
          `Thermal margin is thin. The cruise equilibrium is about ${Math.round(equilibriumTempC)}°C, and temperatures above 50°C reduce spacecraft health.`,
          'spacecraft',
        ),
      )
    }
  }

  if (destination && structure) {
    if (mission.difficulty === 'expert' && structuralRating < destination.radiation) {
      issues.push(
        issue(
          'error',
          'radiation',
          `Expert difficulty requires a structure that can face the radiation environment at ${destination.destination}.`,
          'spacecraft',
        ),
      )
    } else if (structuralRating + 0.05 < destination.radiation) {
      issues.push(
        issue(
          'warning',
          'radiation',
          'The structure provides less shielding than this radiation environment calls for. Health will fall during cruise.',
          'spacecraft',
        ),
      )
    }
  }

  const coveredObjectiveIds = mission.objectiveIds.filter((objectiveId) =>
    instruments.some((instrument) => instrument.objectiveIds.includes(objectiveId)),
  )
  for (const objectiveId of mission.objectiveIds) {
    if (coveredObjectiveIds.includes(objectiveId)) continue
    const objective = getObjective(objectiveId)
    const options = instrumentsForObjective(objectiveId).map((instrument) => instrument.name)
    issues.push(
      issue(
        'error',
        `objective-${objectiveId}`,
        `${objective?.name ?? 'An objective'} needs one of these instruments: ${options.join(', ')}.`,
        'instruments',
      ),
    )
  }

  let mismatched = 0
  if (destination) {
    for (const objectiveId of mission.objectiveIds) {
      const objective = getObjective(objectiveId)
      if (objective && !objective.relevantDestinations.includes(destination.id)) {
        mismatched += 1
        issues.push(
          issue(
            'warning',
            `fit-${objectiveId}`,
            `${objective.name} is a weak match for ${destination.destination}. The science return from that objective is reduced.`,
            'objectives',
          ),
        )
      }
    }
  }

  const componentCost = [structure, propulsion, power, communication, thermal, storage].reduce(
    (sum, component) => sum + (component?.costUsd ?? 0),
    0,
  )
  const instrumentCost = instruments.reduce((sum, instrument) => sum + instrument.costUsd, 0)
  const launchCost = vehicle?.costUsd ?? 0
  const opsCost = destination ? destination.dailyOpsUsd * destination.durationDays : 0
  const budgetUsd = destination ? destination.baseBudgetUsd * difficulty.budget : 0
  const totalCostUsd = componentCost + instrumentCost + launchCost + opsCost
  const remainingBudgetUsd = budgetUsd - totalCostUsd

  if (destination && remainingBudgetUsd < 0) {
    issues.push(
      issue(
        'error',
        'budget',
        `This design is over budget by ${Math.abs(Math.round(remainingBudgetUsd)).toLocaleString('en-US')} dollars.`,
        'resources',
      ),
    )
  } else if (destination && budgetUsd > 0 && remainingBudgetUsd / budgetUsd < 0.05) {
    issues.push(
      issue(
        'warning',
        'contingency',
        'Less than 5% of the budget remains. An already-priced design can fly, but there is almost no contingency.',
        'resources',
      ),
    )
  }

  const physics = computePhysics(mission, {
    cruiseLoadW,
    powerGeneratedW,
    solarFraction,
    nominalPropellantKg,
    tankPropellantKg,
    totalMassKg,
    isp,
  })

  if (destination && communication && !physics.linkCapable) {
    issues.push(
      issue(
        'warning',
        'link-budget',
        `Link margin is ${physics.linkMarginDb.toFixed(1)} dB at ${(physics.linkRequiredBps / 1000).toFixed(1)} kb/s over ${Math.round(physics.linkRangeKm).toLocaleString('en-US')} km. The antenna supports ${(physics.linkMaxBps / 1000).toFixed(1)} kb/s into ${physics.linkGround}.`,
        'resources',
      ),
    )
  } else if (destination && communication && physics.linkMarginDb < 3) {
    issues.push(
      issue(
        'warning',
        'link-margin',
        `Link margin is only ${physics.linkMarginDb.toFixed(1)} dB. The coded link closes, with little room for pointing loss.`,
        'resources',
      ),
    )
  }

  if (destination && storage && !physics.batterySufficient) {
    issues.push(
      issue(
        'warning',
        'battery-eclipse',
        `A worst-case eclipse lasts ${physics.eclipseHours.toFixed(2)} h and needs ${Math.round(physics.batteryRequiredWh).toLocaleString('en-US')} Wh at 70% depth of discharge. The battery stores ${Math.round(physics.batteryCapacityWh).toLocaleString('en-US')} Wh.`,
        'resources',
      ),
    )
  }

  if (destination && thermal && !physics.thermalSafe) {
    issues.push(
      issue(
        'warning',
        'thermal-node',
        `Single-node balance: hot case ${physics.thermalHotC.toFixed(0)}°C, cold case ${physics.thermalColdC.toFixed(0)}°C. Heater demand is ${Math.round(physics.heaterRequiredW)} W and the system provides ${Math.round(physics.heaterAvailableW)} W.`,
        'spacecraft',
      ),
    )
  }

  const instrumentCapability =
    instruments.length > 0
      ? instruments.reduce((sum, instrument) => sum + instrument.capability, 0) / instruments.length
      : 0

  const scienceCoverage = mission.objectiveIds.length > 0 ? coveredObjectiveIds.length / mission.objectiveIds.length : 0
  const destinationFit =
    mission.objectiveIds.length > 0 ? (mission.objectiveIds.length - mismatched) / mission.objectiveIds.length : 0

  return {
    ready: issues.every((item) => item.level !== 'error'),
    issues,
    budgetUsd,
    totalCostUsd,
    remainingBudgetUsd,
    costs: {
      components: componentCost,
      instruments: instrumentCost,
      launch: launchCost,
      operations: opsCost,
    },
    dryMassKg,
    payloadMassKg: mass.payload,
    nominalPropellantKg,
    tankPropellantKg,
    totalMassKg,
    payloadCapacityKg,
    massMarginKg,
    mass,
    powerGeneratedW,
    cruiseLoadW,
    burnLoadW,
    powerBalanceW,
    solarFraction,
    batteryWh: storage?.batteryWh ?? 0,
    commsCapacity,
    thermalRating,
    thermalStress: destination?.thermalStress ?? 0,
    radiation: destination?.radiation ?? 0,
    structuralRating,
    equilibriumTempC,
    isp,
    thrustClass: propulsion?.thrustClass ?? null,
    departureFraction,
    cruiseFraction,
    insertionFraction,
    scienceCoverage,
    destinationFit,
    coveredObjectiveIds,
    instrumentCapability,
    deltaV,
    physics,
  }
}
