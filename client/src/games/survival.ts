import type { Difficulty } from '../types'

export interface SurvivalResources {
  health: number
  fuelKg: number
  batteryPct: number
  powerMarginW: number
  data: number
  temperatureC: number
  linkPct: number
}

export interface SurvivalOption {
  id: string
  label: string
  detail: string
  quality: 'best' | 'mixed' | 'poor'
  delta: Partial<SurvivalResources>
}

export interface SurvivalEvent {
  id: string
  title: string
  problem: string
  options: SurvivalOption[]
}

export interface SurvivalState {
  resources: SurvivalResources
  eventIndex: number
  status: 'playing' | 'won' | 'lost'
  log: { eventId: string; optionId: string; consequence: string }[]
  qualityPoints: number
  qualityPossible: number
}

export interface SurvivalScore {
  total: number
  response: number
  health: number
  resources: number
  science: number
  won: boolean
}

const EVENTS: SurvivalEvent[] = [
  {
    id: 'solar-storm',
    title: 'Solar storm detected',
    problem: 'Particle flux is climbing. Unshielded operations will dose the avionics and the battery.',
    options: [
      { id: 'safe', label: 'Activate safe mode', detail: 'Park the instruments and ride the storm on heaters and the receiver.', quality: 'best', delta: { health: -4, data: -8, batteryPct: -2, temperatureC: -3 } },
      { id: 'shed', label: 'Reduce power consumption', detail: 'Drop the high-draw instrument and keep a short contact.', quality: 'mixed', delta: { health: -10, data: -4, batteryPct: -8, powerMarginW: -15 } },
      { id: 'continue', label: 'Continue scientific operations', detail: 'Keep the full observing plan through the peak.', quality: 'poor', delta: { health: -34, data: 6, batteryPct: -30, temperatureC: 12 } },
    ],
  },
  {
    id: 'battery',
    title: 'Battery degradation',
    problem: 'Charge acceptance has fallen. A full science load will walk the state of charge down.',
    options: [
      { id: 'shed', label: 'Shed instrument load', detail: 'Run only the lowest-power investigation until the battery recovers.', quality: 'best', delta: { batteryPct: 8, data: -6, powerMarginW: 10, health: -2 } },
      { id: 'cycle', label: 'Cycle the battery', detail: 'A controlled discharge and recharge, with instruments paused.', quality: 'mixed', delta: { batteryPct: -4, data: -3, health: -6 } },
      { id: 'full', label: 'Keep full operations', detail: 'Continue the science plan and let the battery absorb the deficit.', quality: 'poor', delta: { batteryPct: -36, data: 4, health: -16, powerMarginW: -30 } },
    ],
  },
  {
    id: 'comms',
    title: 'Communication failure',
    problem: 'The high-rate link will not lock. The carrier is there. The data rate is not.',
    options: [
      { id: 'low', label: 'Drop to the safe rate', detail: 'Send housekeeping and a thin science stream.', quality: 'best', delta: { linkPct: -8, data: -5, health: -1, powerMarginW: 8 } },
      { id: 'retry', label: 'Retry the high-rate pass', detail: 'Spend the contact trying to recover the original rate.', quality: 'mixed', delta: { linkPct: -18, data: -8, batteryPct: -6, health: -4 } },
      { id: 'boost', label: 'Raise transmitter power', detail: 'Force the link with a hotter transmitter.', quality: 'poor', delta: { linkPct: 4, batteryPct: -30, powerMarginW: -70, health: -14, temperatureC: 10 } },
    ],
  },
  {
    id: 'leak',
    title: 'Fuel leakage',
    problem: 'Tank pressure is falling faster than the planned burns explain.',
    options: [
      { id: 'isolate', label: 'Isolate the leaking line', detail: 'Close the suspect valve and keep the rest of the propellant.', quality: 'best', delta: { fuelKg: -40, health: -3, data: -2 } },
      { id: 'burn', label: 'Use the leak as a small thrust', detail: 'Point the leak and accept a messy delta-v.', quality: 'mixed', delta: { fuelKg: -90, health: -8, data: 0 } },
      { id: 'ignore', label: 'Continue the timeline', detail: 'Leave the valve open and hope the rate slows.', quality: 'poor', delta: { fuelKg: -220, health: -14 } },
    ],
  },
  {
    id: 'thermal',
    title: 'Thermal overheating',
    problem: 'The radiator is not rejecting the load. The node temperature is climbing.',
    options: [
      { id: 'shed', label: 'Power down nonessential loads', detail: 'Cut instrument heat and open the survival heaters only.', quality: 'best', delta: { temperatureC: -18, powerMarginW: 25, data: -7, health: -2 } },
      { id: 'roll', label: 'Roll to a new sun angle', detail: 'Change the projected area without stopping science.', quality: 'mixed', delta: { temperatureC: -8, data: -2, health: -6, linkPct: -6 } },
      { id: 'push', label: 'Keep the full load', detail: 'Finish the observation and let the node run hot.', quality: 'poor', delta: { temperatureC: 28, health: -22, data: 5, batteryPct: -8 } },
    ],
  },
  {
    id: 'instrument',
    title: 'Instrument malfunction',
    problem: 'The primary instrument is drawing current and returning noise.',
    options: [
      { id: 'off', label: 'Switch it off', detail: 'Protect the bus and keep the other data already stored.', quality: 'best', delta: { data: -6, powerMarginW: 20, health: -1 } },
      { id: 'reset', label: 'Reset and retry once', detail: 'A single recovery attempt, then accept the result.', quality: 'mixed', delta: { data: -2, batteryPct: -8, health: -7, powerMarginW: -10 } },
      { id: 'force', label: 'Force another observing run', detail: 'Override the fault and take the current draw.', quality: 'poor', delta: { data: 3, health: -18, batteryPct: -16, powerMarginW: -35, temperatureC: 7 } },
    ],
  },
]

function startResources(difficulty: Difficulty): SurvivalResources {
  if (difficulty === 'beginner') {
    return { health: 100, fuelKg: 420, batteryPct: 78, powerMarginW: 160, data: 48, temperatureC: 18, linkPct: 82 }
  }
  if (difficulty === 'intermediate') {
    return { health: 92, fuelKg: 300, batteryPct: 64, powerMarginW: 90, data: 36, temperatureC: 24, linkPct: 70 }
  }
  return { health: 84, fuelKg: 210, batteryPct: 52, powerMarginW: 40, data: 28, temperatureC: 30, linkPct: 58 }
}

export function survivalEvents(difficulty: Difficulty): SurvivalEvent[] {
  if (difficulty === 'beginner') return EVENTS.slice(0, 3)
  if (difficulty === 'intermediate') return EVENTS.slice(0, 5)
  return EVENTS
}

function scale(difficulty: Difficulty, value: number) {
  if (value >= 0) return value
  if (difficulty === 'expert') return value * 1.15
  if (difficulty === 'intermediate') return value * 1.05
  return value
}

export function createSurvival(difficulty: Difficulty): SurvivalState {
  return {
    resources: startResources(difficulty),
    eventIndex: 0,
    status: 'playing',
    log: [],
    qualityPoints: 0,
    qualityPossible: 0,
  }
}

function clampResource(resources: SurvivalResources): SurvivalResources {
  return {
    health: Math.max(0, Math.min(100, resources.health)),
    fuelKg: Math.max(0, resources.fuelKg),
    batteryPct: Math.max(0, Math.min(100, resources.batteryPct)),
    powerMarginW: resources.powerMarginW,
    data: Math.max(0, resources.data),
    temperatureC: resources.temperatureC,
    linkPct: Math.max(0, Math.min(100, resources.linkPct)),
  }
}

function failed(resources: SurvivalResources) {
  return resources.health <= 0 || resources.fuelKg <= 0 || resources.batteryPct <= 0 || resources.powerMarginW < -60
}

export function chooseResponse(state: SurvivalState, difficulty: Difficulty, optionId: string): SurvivalState {
  if (state.status !== 'playing') return state
  const events = survivalEvents(difficulty)
  const event = events[state.eventIndex]
  if (!event) return state
  const option = event.options.find((item) => item.id === optionId) ?? event.options[0]
  const nextResources = { ...state.resources }
  for (const [key, value] of Object.entries(option.delta) as [keyof SurvivalResources, number][]) {
    nextResources[key] = (nextResources[key] as number) + scale(difficulty, value)
  }
  if (nextResources.temperatureC > 50) nextResources.health -= (nextResources.temperatureC - 50) * 0.4
  const resources = clampResource(nextResources)
  const qualityPoints = state.qualityPoints + (option.quality === 'best' ? 1 : option.quality === 'mixed' ? 0.55 : 0.15)
  const qualityPossible = state.qualityPossible + 1
  const consequence =
    option.quality === 'best'
      ? `${option.label} holds the bus together. ${event.title.toLowerCase()} is contained.`
      : option.quality === 'mixed'
        ? `${option.label} limits the damage, and it spends some of the margin.`
        : `${option.label} keeps the plan, and the spacecraft pays for it in health or reserves.`
  const log = [...state.log, { eventId: event.id, optionId: option.id, consequence }]
  if (failed(resources)) {
    return { resources, eventIndex: state.eventIndex + 1, status: 'lost', log, qualityPoints, qualityPossible }
  }
  const done = state.eventIndex + 1 >= events.length
  return {
    resources,
    eventIndex: state.eventIndex + 1,
    status: done ? 'won' : 'playing',
    log,
    qualityPoints,
    qualityPossible,
  }
}

export function scoreSurvival(state: SurvivalState): SurvivalScore {
  const won = state.status === 'won'
  const response = state.qualityPossible > 0 ? (state.qualityPoints / state.qualityPossible) * 100 : 0
  const health = state.resources.health
  const resources = Math.max(0, Math.min(100, state.resources.batteryPct * 0.45 + Math.min(state.resources.fuelKg / 4, 40) + (state.resources.powerMarginW > 0 ? 15 : 0)))
  const science = Math.max(0, Math.min(100, state.resources.data * 2))
  const blended = response * 0.35 + health * 0.25 + resources * 0.2 + science * 0.2
  const total = Math.round(won ? blended : Math.min(42, blended * 0.5))
  return { total, response: Math.round(response), health: Math.round(health), resources: Math.round(resources), science: Math.round(science), won }
}

export function currentEvent(state: SurvivalState, difficulty: Difficulty) {
  return survivalEvents(difficulty)[state.eventIndex] ?? null
}
