import type { Difficulty } from '../types'

/**
 * Educational two-body insertion model.
 * State is polar: radius, radial speed, tangential speed.
 * Gravity is mu/r^2. Thrust is tangential. This is not a flight-certified propagator.
 */

export interface OrbitBody {
  id: 'earth' | 'moon' | 'mars'
  name: string
  radiusKm: number
  muKm: number
}

export interface OrbitChallenge {
  difficulty: Difficulty
  body: OrbitBody
  targetAltitudeKm: number
  altitudeToleranceKm: number
  speedToleranceKmS: number
  radialToleranceKmS: number
  eccentricityLimit: number
  fuelKg: number
  fuelKgPerSecond: number
  thrustKmS2: number
  coastSeconds: number
  maxBurnSeconds: number
  timeBudgetS: number
  speedDeficitKmS: number
  showTargetSpeed: boolean
}

export type OrbitStatus = 'flying' | 'orbit' | 'crash' | 'escape' | 'fuel'

export interface OrbitCraft {
  radiusKm: number
  radialKmS: number
  tangentialKmS: number
  angleRad: number
  fuelKg: number
  elapsedS: number
  minRadiusKm: number
  status: OrbitStatus
  note: string
  altitudeErrorKm: number
  speedErrorKmS: number
  eccentricity: number
}

export interface OrbitScore {
  total: number
  accuracy: number
  fuel: number
  time: number
  safety: number
  won: boolean
}

const EARTH: OrbitBody = { id: 'earth', name: 'Earth', radiusKm: 6371, muKm: 398600.4418 }
const MARS: OrbitBody = { id: 'mars', name: 'Mars', radiusKm: 3389.5, muKm: 42828.37 }
const MOON: OrbitBody = { id: 'moon', name: 'Moon', radiusKm: 1737.4, muKm: 4902.8 }

export function orbitChallenge(difficulty: Difficulty): OrbitChallenge {
  if (difficulty === 'beginner') {
    return {
      difficulty,
      body: EARTH,
      targetAltitudeKm: 400,
      altitudeToleranceKm: 50,
      speedToleranceKmS: 0.06,
      radialToleranceKmS: 0.035,
      eccentricityLimit: 0.035,
      fuelKg: 80,
      fuelKgPerSecond: 0.8,
      thrustKmS2: 0.04,
      coastSeconds: 25,
      maxBurnSeconds: 90,
      timeBudgetS: 500,
      speedDeficitKmS: 0.2,
      showTargetSpeed: true,
    }
  }
  if (difficulty === 'intermediate') {
    return {
      difficulty,
      body: MARS,
      targetAltitudeKm: 400,
      altitudeToleranceKm: 35,
      speedToleranceKmS: 0.045,
      radialToleranceKmS: 0.025,
      eccentricityLimit: 0.028,
      fuelKg: 48,
      fuelKgPerSecond: 0.75,
      thrustKmS2: 0.03,
      coastSeconds: 30,
      maxBurnSeconds: 70,
      timeBudgetS: 420,
      speedDeficitKmS: 0.28,
      showTargetSpeed: true,
    }
  }
  return {
    difficulty,
    body: MOON,
    targetAltitudeKm: 100,
    altitudeToleranceKm: 18,
    speedToleranceKmS: 0.02,
    radialToleranceKmS: 0.015,
    eccentricityLimit: 0.02,
    fuelKg: 22,
    fuelKgPerSecond: 1.1,
    thrustKmS2: 0.012,
    coastSeconds: 20,
    maxBurnSeconds: 40,
    timeBudgetS: 320,
    speedDeficitKmS: 0.16,
    showTargetSpeed: false,
  }
}

export function targetRadiusKm(challenge: OrbitChallenge) {
  return challenge.body.radiusKm + challenge.targetAltitudeKm
}

export function circularSpeedKmS(challenge: OrbitChallenge) {
  return Math.sqrt(challenge.body.muKm / targetRadiusKm(challenge))
}

export function createApproach(challenge: OrbitChallenge): OrbitCraft {
  const radiusKm = targetRadiusKm(challenge)
  return {
    radiusKm,
    radialKmS: -0.012,
    tangentialKmS: circularSpeedKmS(challenge) - challenge.speedDeficitKmS,
    angleRad: -0.6,
    fuelKg: challenge.fuelKg,
    elapsedS: 0,
    minRadiusKm: radiusKm,
    status: 'flying',
    note: 'Speed is below circular. A prograde burn raises it. Too much, and the path becomes an escape hyperbola.',
    altitudeErrorKm: 0,
    speedErrorKmS: challenge.speedDeficitKmS,
    eccentricity: 0,
  }
}

function elements(radiusKm: number, radialKmS: number, tangentialKmS: number, mu: number) {
  const speed = Math.hypot(radialKmS, tangentialKmS)
  const energy = (speed * speed) / 2 - mu / radiusKm
  const angular = radiusKm * tangentialKmS
  const eccentricity = Math.sqrt(Math.max(0, 1 + (2 * energy * angular * angular) / (mu * mu)))
  return { speed, energy, eccentricity }
}

export function applyControl(
  craft: OrbitCraft,
  challenge: OrbitChallenge,
  control: { direction: -1 | 0 | 1; burnSeconds: number },
): OrbitCraft {
  if (craft.status !== 'flying') return craft
  const mu = challenge.body.muKm
  const requested = control.direction === 0 ? 0 : Math.max(0, Math.min(challenge.maxBurnSeconds, control.burnSeconds))
  const affordable = challenge.fuelKgPerSecond > 0 ? Math.min(requested, craft.fuelKg / challenge.fuelKgPerSecond) : 0
  if (requested > 0 && affordable <= 1e-6) {
    return { ...craft, status: 'fuel', note: 'The tanks are empty before the orbit is circular.' }
  }
  let radiusKm = craft.radiusKm
  let radialKmS = craft.radialKmS
  let tangentialKmS = craft.tangentialKmS
  let angleRad = craft.angleRad
  let minRadiusKm = craft.minRadiusKm
  let elapsedS = craft.elapsedS
  const total = affordable + challenge.coastSeconds
  const dt = 0.25
  for (let t = 0; t < total - 1e-9; t += dt) {
    const step = Math.min(dt, total - t)
    const burning = t < affordable - 1e-9
    const ar = (tangentialKmS * tangentialKmS) / radiusKm - mu / (radiusKm * radiusKm)
    const at = -(radialKmS * tangentialKmS) / radiusKm + (burning ? control.direction * challenge.thrustKmS2 : 0)
    radialKmS += ar * step
    tangentialKmS += at * step
    radiusKm += radialKmS * step
    angleRad += (tangentialKmS / Math.max(radiusKm, 1)) * step
    elapsedS += step
    minRadiusKm = Math.min(minRadiusKm, radiusKm)
    if (radiusKm <= challenge.body.radiusKm) {
      return {
        ...craft,
        radiusKm: challenge.body.radiusKm,
        radialKmS,
        tangentialKmS,
        angleRad,
        fuelKg: Math.max(0, craft.fuelKg - affordable * challenge.fuelKgPerSecond),
        elapsedS,
        minRadiusKm,
        status: 'crash',
        note: 'Periapsis is inside the planet. The spacecraft is lost.',
        altitudeErrorKm: challenge.targetAltitudeKm,
        speedErrorKmS: Math.abs(Math.hypot(radialKmS, tangentialKmS) - circularSpeedKmS(challenge)),
        eccentricity: 1,
      }
    }
    const energy = elements(radiusKm, radialKmS, tangentialKmS, mu).energy
    if (energy >= 0 && radiusKm > targetRadiusKm(challenge) * 0.98) {
      return {
        ...craft,
        radiusKm,
        radialKmS,
        tangentialKmS,
        angleRad,
        fuelKg: Math.max(0, craft.fuelKg - affordable * challenge.fuelKgPerSecond),
        elapsedS,
        minRadiusKm,
        status: 'escape',
        note: 'Specific energy is no longer negative. This is an escape trajectory, not a capture.',
        altitudeErrorKm: Math.abs(radiusKm - targetRadiusKm(challenge)),
        speedErrorKmS: Math.abs(Math.hypot(radialKmS, tangentialKmS) - circularSpeedKmS(challenge)),
        eccentricity: elements(radiusKm, radialKmS, tangentialKmS, mu).eccentricity,
      }
    }
  }
  const fuelKg = Math.max(0, craft.fuelKg - affordable * challenge.fuelKgPerSecond)
  const current = elements(radiusKm, radialKmS, tangentialKmS, mu)
  const altitudeErrorKm = Math.abs(radiusKm - targetRadiusKm(challenge))
  const speedErrorKmS = Math.abs(current.speed - circularSpeedKmS(challenge))
  const captured =
    altitudeErrorKm <= challenge.altitudeToleranceKm &&
    speedErrorKmS <= challenge.speedToleranceKmS &&
    Math.abs(radialKmS) <= challenge.radialToleranceKmS &&
    current.eccentricity <= challenge.eccentricityLimit
  if (captured) {
    return {
      ...craft,
      radiusKm,
      radialKmS,
      tangentialKmS,
      angleRad,
      fuelKg,
      elapsedS,
      minRadiusKm,
      status: 'orbit',
      note: 'Altitude and speed are inside the target band. The orbit is closed.',
      altitudeErrorKm,
      speedErrorKmS,
      eccentricity: current.eccentricity,
    }
  }
  if (fuelKg <= 1e-6) {
    return {
      ...craft,
      radiusKm,
      radialKmS,
      tangentialKmS,
      angleRad,
      fuelKg,
      elapsedS,
      minRadiusKm,
      status: 'fuel',
      note: 'Fuel is gone and the orbit is still outside the target band.',
      altitudeErrorKm,
      speedErrorKmS,
      eccentricity: current.eccentricity,
    }
  }
  const slow = current.speed < circularSpeedKmS(challenge)
  return {
    ...craft,
    radiusKm,
    radialKmS,
    tangentialKmS,
    angleRad,
    fuelKg,
    elapsedS,
    minRadiusKm,
    status: 'flying',
    note: slow
      ? 'Still short of circular speed. Another prograde burn can close the gap.'
      : 'Faster than the target circle. A short retrograde burn, or less thrust next time, brings it back.',
    altitudeErrorKm,
    speedErrorKmS,
    eccentricity: current.eccentricity,
  }
}

export function scoreOrbit(craft: OrbitCraft, challenge: OrbitChallenge): OrbitScore {
  const won = craft.status === 'orbit'
  const accuracy = won
    ? Math.max(0, 100 - (craft.altitudeErrorKm / challenge.altitudeToleranceKm) * 35 - (craft.speedErrorKmS / challenge.speedToleranceKmS) * 35)
    : Math.max(0, 40 - craft.altitudeErrorKm / 20)
  const fuel = Math.max(0, Math.min(100, (craft.fuelKg / challenge.fuelKg) * 100))
  const time = Math.max(0, Math.min(100, (1 - craft.elapsedS / challenge.timeBudgetS) * 100))
  const clearance = (craft.minRadiusKm - challenge.body.radiusKm) / Math.max(challenge.targetAltitudeKm, 1)
  const safety = craft.status === 'crash' ? 0 : craft.status === 'escape' ? 12 : Math.max(0, Math.min(100, clearance * 100))
  const blended = accuracy * 0.4 + fuel * 0.25 + time * 0.15 + safety * 0.2
  const total = Math.round(won ? blended : Math.min(45, blended * 0.55))
  return { total, accuracy: Math.round(accuracy), fuel: Math.round(fuel), time: Math.round(time), safety: Math.round(safety), won }
}
