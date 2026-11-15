import { getEvent, EVENTS } from '../data/events'
import { getMission } from '../data/catalog'
import type {
  Difficulty,
  FlightResult,
  FlightState,
  LogEntry,
  MissionConfig,
  PendingEvent,
  RiskLevel,
  StageId,
  TelemetrySample,
} from '../types'
import { computeMetrics, equilibriumTemperature } from './calculations'
import { DIFFICULTY, SIM_SECONDS, clamp, hashSeed, mulberry32 } from './constants'
import type { Metrics } from '../types'

const RANK: Record<Difficulty, number> = { beginner: 0, intermediate: 1, expert: 2 }

const STAGE_COPY: Record<StageId, { title: string; summary: string; enter: string }> = {
  prelaunch: {
    title: 'Pre-launch checks',
    summary: 'Mass, power, thermal, and the link are checked against the design you locked in.',
    enter: 'Pre-launch checks are running against the locked spacecraft configuration.',
  },
  ignition: {
    title: 'Rocket ignition',
    summary: 'The fictional launcher commits to flight.',
    enter: 'Ignition. The launcher is committed.',
  },
  launch: {
    title: 'Launch',
    summary: 'The stack climbs out of the atmosphere.',
    enter: 'Liftoff. Altitude and speed are climbing.',
  },
  departure: {
    title: 'Earth departure',
    summary: 'The spacecraft spends the departure share of its propellant.',
    enter: 'Earth departure burn. Propellant use follows the propulsion profile you selected.',
  },
  cruise: {
    title: 'Cruise phase',
    summary: 'Power, heat, and radiation act on the spacecraft for the long coast.',
    enter: 'Cruise has started. Systems now live on the destination power and thermal balance.',
  },
  insertion: {
    title: 'Orbital insertion',
    summary: 'The remaining propellant has to finish the arrival burn.',
    enter: 'Orbital insertion. The spacecraft is spending its arrival propellant.',
  },
  approach: {
    title: 'Destination approach',
    summary: 'The spacecraft settles onto the science trajectory.',
    enter: 'Approach. The destination is close enough for the science sequence to take over.',
  },
  science: {
    title: 'Scientific operations',
    summary: 'Instruments collect data at a rate set by power, health, and objective fit.',
    enter: 'Scientific operations have started.',
  },
  transmission: {
    title: 'Data transmission',
    summary: 'The antenna either returns the recorder contents or it does not.',
    enter: 'Data transmission. The return is limited by the link index.',
  },
  complete: {
    title: 'Mission completion',
    summary: 'The flight record is closed and scored.',
    enter: 'The mission timeline is complete.',
  },
}

export interface FlightOptions {
  seed?: number
  forceEventIds?: string[]
}

function stamp(hours: number) {
  const day = Math.floor(hours / 24) + 1
  const hour = Math.floor(hours % 24)
  return `Day ${day}, ${String(hour).padStart(2, '0')}h`
}

function stageIndex(plan: FlightState['plan'], id: StageId) {
  return plan.findIndex((stage) => stage.id === id)
}

function stageFraction(flight: FlightState, id: StageId) {
  const index = stageIndex(flight.plan, id)
  if (index < 0) return 0
  if (flight.stageIndex > index) return 1
  if (flight.stageIndex < index) return 0
  const duration = flight.plan[index].durationHours
  if (duration <= 0) return 1
  return clamp(flight.stageElapsedHours / duration, 0, 1)
}

function fuelUsedKg(metrics: Metrics, flight: FlightState) {
  const nominal = metrics.nominalPropellantKg
  return (
    flight.modifiers.fuelLeakKg +
    nominal * metrics.departureFraction * stageFraction(flight, 'departure') +
    nominal * metrics.cruiseFraction * stageFraction(flight, 'cruise') +
    nominal * metrics.insertionFraction * stageFraction(flight, 'insertion')
  )
}

function cruiseDamage(metrics: Metrics, tempOffset: number) {
  const equilibrium = equilibriumTemperature(metrics.thermalStress, metrics.thermalRating, tempOffset)
  const overheat = Math.max(0, equilibrium - 50) * 1.15
  const radiation = Math.max(0, metrics.radiation - metrics.structuralRating) * 28
  const deficit =
    metrics.powerBalanceW < 0 && metrics.cruiseLoadW > 0
      ? Math.min(1, -metrics.powerBalanceW / metrics.cruiseLoadW) * 12
      : 0
  return { equilibrium, penalty: overheat + radiation + deficit }
}

function dataTarget(metrics: Metrics, flight: FlightState, health: number, battery: number) {
  let powerFactor = 0.65
  if (metrics.powerBalanceW >= 50) powerFactor = 1
  else if (metrics.powerBalanceW >= 0) powerFactor = 0.9
  else powerFactor = clamp(metrics.powerGeneratedW / Math.max(metrics.cruiseLoadW, 1), 0.2, 0.65)
  const equilibrium = equilibriumTemperature(metrics.thermalStress, metrics.thermalRating, flight.modifiers.tempOffset)
  const thermalFactor = equilibrium <= 50 ? 1 : equilibrium <= 80 ? 0.7 : 0.4
  const healthFactor = clamp(health / 100, 0, 1)
  const batteryFactor = battery < 12 ? 0.6 : 1
  const fitFactor = 0.72 + 0.28 * metrics.destinationFit
  const quality = 0.86 + (metrics.instrumentCapability / 100) * 0.14
  return (
    100 *
    metrics.scienceCoverage *
    powerFactor *
    thermalFactor *
    healthFactor *
    batteryFactor *
    fitFactor *
    quality *
    flight.modifiers.scienceMultiplier
  )
}

export function deriveTelemetry(flight: FlightState, mission: MissionConfig): TelemetrySample {
  const metrics = computeMetrics(mission)
  const destination = getMission(mission.destinationId)
  const progress = stageFraction(flight, flight.plan[flight.stageIndex]?.id ?? 'prelaunch')
  const stageId = flight.plan[flight.stageIndex]?.id ?? 'complete'
  const { equilibrium } = cruiseDamage(metrics, flight.modifiers.tempOffset)
  const cruise = stageFraction(flight, 'cruise')
  const launchPenalty = stageFraction(flight, 'launch') === 1 && metrics.payloadCapacityKg > 0 && metrics.massMarginKg / metrics.payloadCapacityKg < 0.05 ? 4 : 0
  const health = clamp(100 + flight.modifiers.healthOffset - cruiseDamage(metrics, flight.modifiers.tempOffset).penalty * cruise - launchPenalty, 0, 100)

  let battery = 96 + flight.modifiers.batteryOffset
  if (metrics.powerBalanceW < 0 && metrics.cruiseLoadW > 0) {
    const fraction = Math.min(1, -metrics.powerBalanceW / metrics.cruiseLoadW)
    battery -= fraction * 80 * Math.max(cruise, stageFraction(flight, 'science'))
  }
  battery = clamp(battery, 0, 100)

  const fuelKg = metrics.tankPropellantKg - fuelUsedKg(metrics, flight)
  const totalHours = flight.plan.reduce((sum, stage) => sum + stage.durationHours, 0)
  const elapsed =
    flight.plan.slice(0, flight.stageIndex).reduce((sum, stage) => sum + stage.durationHours, 0) + flight.stageElapsedHours
  const progressPct = totalHours > 0 ? clamp((elapsed / totalHours) * 100, 0, 100) : 0

  let altitudeKm = 0
  let velocityKms = 0
  if (destination) {
    const distance = destination.distanceKm
    const orbitAlt = destination.orbitAltitudeKm
    const cruiseVel = destination.cruiseVelocityKms
    const orbitVel = destination.orbitVelocityKms
    if (stageId === 'prelaunch') {
      altitudeKm = 0
      velocityKms = 0
    } else if (stageId === 'ignition') {
      altitudeKm = 0
      velocityKms = 0.05 * progress
    } else if (stageId === 'launch') {
      altitudeKm = lerp(0, destination.id === 'earth' ? orbitAlt : 180, progress)
      velocityKms = lerp(0.1, 7.8, progress)
    } else if (stageId === 'departure') {
      altitudeKm = lerp(180, destination.id === 'earth' ? orbitAlt : Math.min(distance, 40_000), progress)
      velocityKms = lerp(7.8, Math.max(cruiseVel, 3), progress)
    } else if (stageId === 'cruise') {
      altitudeKm = destination.id === 'earth' ? orbitAlt : lerp(distance, Math.max(orbitAlt * 8, 800), progress)
      velocityKms = cruiseVel
    } else if (stageId === 'insertion') {
      const startAlt = destination.id === 'earth' ? orbitAlt : Math.max(orbitAlt * 8, 800)
      altitudeKm = lerp(startAlt, orbitAlt, progress)
      velocityKms = lerp(cruiseVel, orbitVel, progress)
    } else {
      altitudeKm = orbitAlt
      velocityKms = orbitVel
    }
  }

  const travel =
    stageId === 'prelaunch' || stageId === 'ignition' || stageId === 'launch'
      ? 0
      : stageId === 'departure'
        ? 0.12 * progress
        : stageId === 'cruise'
          ? 0.12 + 0.88 * progress
          : 1
  const ripple = Math.sin(flight.totalElapsedHours / 19 + flight.seed) * 0.7
  const signalPct = clamp(lerp(96, metrics.commsCapacity * 100, travel) + flight.modifiers.signalOffset + ripple, 0, 100)
  const signalBase = clamp(lerp(96, metrics.commsCapacity * 100, travel) + flight.modifiers.signalOffset, 0, 100)
  const scienceProgress = stageFraction(flight, 'science')
  const transmitProgress = Math.max(stageFraction(flight, 'transmission'), stageFraction(flight, 'complete') === 0 && stageIndex(flight.plan, 'complete') < flight.stageIndex ? 1 : stageFraction(flight, 'complete'))
  const collected = dataTarget(metrics, flight, health, battery) * scienceProgress
  const returned = collected * (travel >= 1 ? signalBase / 100 : 0) * Math.max(transmitProgress, stageId === 'complete' ? 1 : 0)

  return {
    hours: flight.totalElapsedHours,
    altitudeKm,
    velocityKms,
    fuelKg,
    batteryPct: battery,
    temperatureC: equilibrium + ripple,
    signalPct,
    health,
    progressPct,
    dataCollected: collected,
    dataReturned: returned,
  }
}

function lerp(from: number, to: number, t: number) {
  return from + (to - from) * clamp(t, 0, 1)
}

function appendLog(flight: FlightState, tone: LogEntry['tone'], message: string): FlightState {
  const entry: LogEntry = {
    id: `log-${flight.logSeq + 1}`,
    hours: flight.totalElapsedHours,
    stamp: stamp(flight.totalElapsedHours),
    message,
    tone,
  }
  return {
    ...flight,
    logSeq: flight.logSeq + 1,
    log: [...flight.log, entry].slice(-80),
  }
}

function withTelemetry(flight: FlightState, mission: MissionConfig, pushSample: boolean): FlightState {
  const telemetry = deriveTelemetry(flight, mission)
  let samples = flight.samples
  let nextSampleHours = flight.nextSampleHours
  if (pushSample && flight.totalElapsedHours >= nextSampleHours) {
    samples = [...samples, telemetry].slice(-120)
    nextSampleHours += flight.sampleIntervalHours
  }
  return { ...flight, telemetry, samples, nextSampleHours }
}

function finish(flight: FlightState, mission: MissionConfig, outcome: 'success' | 'failure', reason: string | null, tone: LogEntry['tone'], message: string): FlightState {
  let next = appendLog(flight, tone, message)
  next = {
    ...next,
    finished: true,
    outcome,
    failureReason: reason,
    pending: null,
    stagesCleared: outcome === 'success' ? next.plan.length : next.stageIndex,
  }
  next = withTelemetry(next, mission, true)
  const telemetry = next.telemetry
  const metrics = computeMetrics(mission)
  const result: FlightResult = {
    dataCollected: telemetry.dataCollected,
    dataReturned: telemetry.dataReturned,
    fuelRemainingKg: Math.max(0, telemetry.fuelKg),
    fuelCapacityKg: metrics.tankPropellantKg,
    health: telemetry.health,
    temperatureC: telemetry.temperatureC,
    batteryPct: telemetry.batteryPct,
    signalPct: telemetry.signalPct,
  }
  return { ...next, result }
}

function shuffled<T>(items: T[], random: () => number) {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1))
    const current = copy[index]
    copy[index] = copy[swap]
    copy[swap] = current
  }
  return copy
}

function chooseEvents(mission: MissionConfig, seed: number, forceEventIds?: string[]) {
  if (forceEventIds && forceEventIds.length > 0) {
    return forceEventIds.filter((id) => getEvent(id)).map((eventId, index) => ({
      eventId,
      threshold: (index + 1) / (forceEventIds.length + 1),
      fired: false,
    }))
  }
  const destination = getMission(mission.destinationId)
  const rank = RANK[mission.difficulty]
  const count = DIFFICULTY[mission.difficulty].events
  const eligible = (event: (typeof EVENTS)[number]) => RANK[event.minDifficulty] <= rank
  let pool = EVENTS.filter((event) => eligible(event) && (!event.destinations || (destination && event.destinations.includes(destination.id))))
  if (pool.length < count) pool = EVENTS.filter(eligible)
  const random = mulberry32(seed)
  const picked = shuffled(pool, random).slice(0, Math.min(count, pool.length))
  return picked.map((event, index) => ({
    eventId: event.id,
    threshold: (index + 1) / (picked.length + 1),
    fired: false,
  }))
}

const ASCENT_REAL_SECONDS = { prelaunch: 3, ignition: 2.5, launch: 8 } as const

export function missionHoursFor(flight: FlightState, realSeconds: number): number {
  const stage = flight.plan[flight.stageIndex]
  const paced = stage && stage.id in ASCENT_REAL_SECONDS ? ASCENT_REAL_SECONDS[stage.id as keyof typeof ASCENT_REAL_SECONDS] : 0
  if (stage && paced > 0) return realSeconds * (stage.durationHours / paced) * flight.speed
  const ascentHours = flight.plan.reduce((sum, item) => sum + (item.id in ASCENT_REAL_SECONDS ? item.durationHours : 0), 0)
  const totalHours = flight.plan.reduce((sum, item) => sum + item.durationHours, 0)
  const laterReal = Math.max(30, SIM_SECONDS - 3 - 2.5 - 8)
  return realSeconds * ((totalHours - ascentHours) / laterReal) * flight.speed
}

export function buildPlan(durationDays: number) {
  const days = durationDays
  return (Object.keys(STAGE_COPY) as StageId[]).map((id) => {
    const copy = STAGE_COPY[id]
    const durationHours =
      id === 'prelaunch'
        ? 4
        : id === 'ignition'
          ? 0.2
          : id === 'launch'
            ? 0.35
            : id === 'departure'
              ? 8
              : id === 'cruise'
                ? days * 24 * 0.62
                : id === 'insertion'
                  ? 4
                  : id === 'approach'
                    ? 16
                    : id === 'science'
                      ? Math.max(18, days * 24 * 0.2)
                      : id === 'transmission'
                        ? 10
                        : 1
    return { id, title: copy.title, summary: copy.summary, durationHours }
  })
}

export function createFlight(mission: MissionConfig, options: FlightOptions = {}): FlightState {
  const destination = getMission(mission.destinationId)
  const metrics = computeMetrics(mission)
  const seed = options.seed ?? hashSeed(`${mission.id}:${Date.now()}`)
  const plan = buildPlan(destination?.durationDays ?? 30)
  const totalHours = plan.reduce((sum, stage) => sum + stage.durationHours, 0)
  const sampleIntervalHours = Math.max(totalHours / 80, 0.5)
  const blank: FlightState = {
    seed,
    speed: 1,
    stageIndex: 0,
    stageElapsedHours: 0,
    totalElapsedHours: 0,
    plan,
    modifiers: {
      fuelLeakKg: 0,
      healthOffset: 0,
      batteryOffset: 0,
      tempOffset: 0,
      signalOffset: 0,
      scienceMultiplier: 1,
    },
    scheduled: chooseEvents(mission, seed, options.forceEventIds),
    pending: null,
    resolutions: [],
    log: [],
    samples: [],
    nextSampleHours: 0,
    sampleIntervalHours,
    hoursPerRealSecond: totalHours / SIM_SECONDS,
    finished: false,
    outcome: null,
    failureReason: null,
    stagesCleared: 0,
    logSeq: 0,
    launchWarnings: metrics.issues.filter((item) => item.level === 'warning').map((item) => item.message),
    telemetry: {
      hours: 0,
      altitudeKm: 0,
      velocityKms: 0,
      fuelKg: metrics.tankPropellantKg,
      batteryPct: 100,
      temperatureC: metrics.equilibriumTempC,
      signalPct: 96,
      health: 100,
      progressPct: 0,
      dataCollected: 0,
      dataReturned: 0,
    },
    result: null,
  }
  let flight = appendLog(blank, 'info', STAGE_COPY.prelaunch.enter)
  flight = appendLog(
    flight,
    'info',
    `Propellant load ${Math.round(metrics.tankPropellantKg).toLocaleString('en-US')} kg. Cruise power balance ${Math.round(metrics.powerBalanceW)} W.`,
  )
  return withTelemetry(flight, mission, true)
}

function armEvent(flight: FlightState): FlightState {
  const nextEvent = flight.scheduled.find((event) => !event.fired)
  if (!nextEvent) return flight
  const definition = getEvent(nextEvent.eventId)
  if (!definition) return flight
  const pending: PendingEvent = {
    eventId: definition.id,
    title: definition.title,
    description: definition.description,
    options: definition.options.map((option) => ({
      id: option.id,
      label: option.label,
      detail: option.detail,
      risk: option.risk,
    })),
  }
  let next = appendLog(flight, 'warn', `${definition.title}. The simulation is holding for a decision.`)
  next = {
    ...next,
    pending,
    scheduled: next.scheduled.map((event) => (event.eventId === definition.id && !event.fired ? { ...event, fired: true } : event)),
  }
  return next
}

function enterStage(flight: FlightState, mission: MissionConfig): FlightState {
  const stage = flight.plan[flight.stageIndex]
  if (!stage) return flight
  let next = appendLog(flight, 'info', STAGE_COPY[stage.id].enter)
  const metrics = computeMetrics(mission)
  if (stage.id === 'insertion') {
    const remaining = metrics.tankPropellantKg - fuelUsedKg(metrics, next)
    const need = metrics.nominalPropellantKg * metrics.insertionFraction
    if (remaining < need - 0.25) {
      return finish(
        next,
        mission,
        'failure',
        'Remaining propellant cannot complete orbital insertion.',
        'bad',
        `Insertion failed. ${Math.max(0, Math.round(remaining)).toLocaleString('en-US')} kg remains and the burn needs ${Math.round(need).toLocaleString('en-US')} kg.`,
      )
    }
  }
  return next
}

function completeStage(flight: FlightState, mission: MissionConfig): FlightState {
  const stage = flight.plan[flight.stageIndex]
  if (!stage) return finish(flight, mission, 'success', null, 'good', 'Mission complete.')
  if (stage.id === 'transmission') {
    const preview = deriveTelemetry({ ...flight, stageElapsedHours: stage.durationHours }, mission)
    if (preview.dataReturned < 10) {
      return finish(
        flight,
        mission,
        'failure',
        'The communications link could not return the science data.',
        'bad',
        `Transmission failed. Only ${preview.dataReturned.toFixed(1)} science units came back.`,
      )
    }
    flight = appendLog(flight, 'good', `Data return complete. ${preview.dataReturned.toFixed(1)} science units received.`)
  }
  if (stage.id === 'complete') {
    return finish(flight, mission, 'success', null, 'good', 'Mission complete. The flight record is ready to score.')
  }
  const nextIndex = flight.stageIndex + 1
  let moved: FlightState = { ...flight, stageIndex: nextIndex, stageElapsedHours: 0 }
  if (stage.id === 'departure') {
    const metrics = computeMetrics(mission)
    const remaining = metrics.tankPropellantKg - fuelUsedKg(metrics, moved)
    moved = appendLog(moved, 'info', `Departure burn complete. ${Math.round(remaining).toLocaleString('en-US')} kg of propellant remains.`)
  }
  if (stage.id === 'insertion') {
    moved = appendLog(moved, 'good', 'Orbital insertion complete.')
  }
  return enterStage(moved, mission)
}

function applyHours(flight: FlightState, mission: MissionConfig, hours: number): FlightState {
  let next: FlightState = {
    ...flight,
    stageElapsedHours: flight.stageElapsedHours + hours,
    totalElapsedHours: flight.totalElapsedHours + hours,
  }
  next = withTelemetry(next, mission, true)
  if (next.telemetry.health <= 0) {
    return finish(next, mission, 'failure', 'Spacecraft health reached zero.', 'bad', 'Spacecraft health reached zero. The mission is over.')
  }
  if (next.telemetry.fuelKg < -0.2) {
    return finish(next, mission, 'failure', 'The propellant tanks are empty.', 'bad', 'Propellant was depleted before the trajectory was finished.')
  }
  return next
}

export function advanceFlight(flight: FlightState, mission: MissionConfig, deltaHours: number): FlightState {
  if (flight.finished || flight.pending || deltaHours <= 0) return flight
  let next = flight
  let left = deltaHours
  let spins = 0
  while (left > 1e-6 && !next.finished && !next.pending && spins < 40) {
    spins += 1
    const stage = next.plan[next.stageIndex]
    if (!stage) break
    const room = Math.max(0, stage.durationHours - next.stageElapsedHours)
    let step = Math.min(left, room)
    let hitEvent = false
    if (stage.id === 'cruise') {
      const upcoming = next.scheduled.find((event) => !event.fired)
      if (upcoming) {
        const at = upcoming.threshold * stage.durationHours
        if (next.stageElapsedHours < at && next.stageElapsedHours + step >= at - 1e-4) {
          step = Math.max(0, at - next.stageElapsedHours)
          hitEvent = true
        }
      }
    }
    if (step > 0) {
      next = applyHours(next, mission, step)
      left -= step
    }
    if (next.finished) break
    if (hitEvent) {
      next = armEvent(next)
      break
    }
    if (next.stageElapsedHours >= stage.durationHours - 1e-6) {
      next = completeStage(next, mission)
    } else if (step <= 0) {
      break
    }
  }
  return next
}

export function resolveFlightEvent(flight: FlightState, mission: MissionConfig, optionId: string): FlightState {
  if (!flight.pending) return flight
  const definition = getEvent(flight.pending.eventId)
  const option = definition?.options.find((item) => item.id === optionId)
  if (!definition || !option) return flight
  const metrics = computeMetrics(mission)
  const leak = (option.fuelLeakFraction ?? 0) * metrics.tankPropellantKg
  let next: FlightState = {
    ...flight,
    pending: null,
    modifiers: {
      fuelLeakKg: flight.modifiers.fuelLeakKg + leak,
      healthOffset: flight.modifiers.healthOffset + (option.healthOffset ?? 0),
      batteryOffset: flight.modifiers.batteryOffset + (option.batteryOffset ?? 0),
      tempOffset: flight.modifiers.tempOffset + (option.tempOffset ?? 0),
      signalOffset: flight.modifiers.signalOffset + (option.signalOffset ?? 0),
      scienceMultiplier: flight.modifiers.scienceMultiplier * (option.scienceMultiplier ?? 1),
    },
    resolutions: [
      ...flight.resolutions,
      {
        eventId: definition.id,
        optionId: option.id,
        title: definition.title,
        choice: option.label,
        outcome: option.outcome,
        risk: option.risk as RiskLevel,
      },
    ],
  }
  next = appendLog(next, option.risk === 'high' ? 'warn' : 'good', option.outcome)
  return withTelemetry(next, mission, false)
}

export function simulateMission(
  mission: MissionConfig,
  options: FlightOptions & { policy?: 'safe' | 'risky' } = {},
) {
  let flight = createFlight(mission, options)
  let guard = 0
  while (!flight.finished && guard < 20000) {
    guard += 1
    if (flight.pending) {
      const preferred = options.policy === 'risky' ? 'high' : 'low'
      const option = flight.pending.options.find((item) => item.risk === preferred) ?? flight.pending.options[0]
      flight = resolveFlightEvent(flight, mission, option.id)
    } else {
      flight = advanceFlight(flight, mission, 24)
    }
  }
  return flight
}
