import type { ComponentCategory, DestinationId, Difficulty, ThrustClass } from '../types'

export interface MissionTemplate {
  id: DestinationId
  name: string
  destination: string
  summary: string
  narrative: string
  suggestedObjectiveIds: string[]
  recommendedDifficulty: Difficulty
  durationDays: number
  scientificImportance: string
  importanceNote: string
  distanceKm: number
  distanceLabel: string
  distanceAu: number
  commsAu: number
  deltaV: number
  thermalStress: number
  radiation: number
  baseBudgetUsd: number
  dailyOpsUsd: number
  constraints: string[]
  color: string
  visual: { orbit: number; size: number; period: number }
  cruiseVelocityKms: number
  orbitAltitudeKm: number
  orbitVelocityKms: number
}

export interface ObjectiveDef {
  id: string
  name: string
  description: string
  scienceValue: number
  relevantDestinations: DestinationId[]
}

export interface ComponentDef {
  id: string
  category: ComponentCategory
  name: string
  description: string
  costUsd: number
  massKg: number
  drawsW: number
  generatesW: number
  performance: number
  solar?: boolean
  isp?: number
  thrustClass?: ThrustClass
  departure?: number
  cruise?: number
  insertion?: number
  linkFactor?: number
  thermalRating?: number
  structuralRating?: number
  batteryWh?: number
}

export interface InstrumentDef {
  id: string
  name: string
  description: string
  costUsd: number
  massKg: number
  drawsW: number
  capability: number
  /** Average science product while the instrument is powered, bits per second. */
  dataRateBps: number
  /** Fraction of the orbit the instrument is producing data. */
  dutyCycle: number
  objectiveIds: string[]
}

export interface LaunchVehicleDef {
  id: string
  name: string
  description: string
  costUsd: number
  maxPayloadKg: number
  suitability: string
  note: string
}

export const COMPONENT_CATEGORIES: { id: ComponentCategory; label: string; prompt: string }[] = [
  { id: 'structure', label: 'Structure', prompt: 'The frame carries every other subsystem and provides the only radiation shielding in this model.' },
  { id: 'propulsion', label: 'Propulsion', prompt: 'Specific impulse sets the propellant load through the rocket equation. Thrust class changes when that propellant is burned.' },
  { id: 'power', label: 'Power', prompt: 'Solar output falls with the square of distance from the Sun. A radioisotope system does not.' },
  { id: 'communication', label: 'Communication', prompt: 'Antenna gain has to close the link at the destination, or the science data never comes home.' },
  { id: 'thermal', label: 'Thermal protection', prompt: 'The thermal rating is compared with the destination environment. A shortfall becomes heat during cruise.' },
  { id: 'storage', label: 'Storage', prompt: 'Batteries cover short burns and power dips. They do not replace a power source.' },
]

export const OBJECTIVES: ObjectiveDef[] = [
  {
    id: 'obj-water',
    name: 'Search for water',
    description: 'Look for ice, hydrated minerals, or subsurface signals that indicate water.',
    scienceValue: 90,
    relevantDestinations: ['lunar', 'mars', 'asteroid'],
  },
  {
    id: 'obj-atmosphere',
    name: 'Study planetary atmosphere',
    description: 'Measure composition, structure, and how the atmosphere changes.',
    scienceValue: 86,
    relevantDestinations: ['venus', 'mars', 'earth', 'jupiter'],
  },
  {
    id: 'obj-composition',
    name: 'Analyze surface composition',
    description: 'Identify minerals and surface materials from orbit or during a rendezvous.',
    scienceValue: 84,
    relevantDestinations: ['lunar', 'mars', 'venus', 'earth', 'jupiter', 'asteroid'],
  },
  {
    id: 'obj-geology',
    name: 'Observe geological structures',
    description: 'Map craters, faults, volcanoes, and other landforms.',
    scienceValue: 80,
    relevantDestinations: ['lunar', 'mars', 'earth', 'venus'],
  },
  {
    id: 'obj-magnetic',
    name: 'Measure magnetic fields',
    description: 'Record the magnetic environment around the destination.',
    scienceValue: 82,
    relevantDestinations: ['earth', 'jupiter'],
  },
  {
    id: 'obj-habitability',
    name: 'Search for signs of past habitability',
    description: 'Combine context, chemistry, and environment clues that bear on past habitability.',
    scienceValue: 94,
    relevantDestinations: ['mars', 'lunar'],
  },
  {
    id: 'obj-asteroid',
    name: 'Study asteroid composition',
    description: 'Characterize a small body’s material during approach and rendezvous.',
    scienceValue: 88,
    relevantDestinations: ['asteroid'],
  },
]

export const COMPONENTS: ComponentDef[] = [
  {
    id: 'struct-light',
    category: 'structure',
    name: 'Lightweight frame',
    description: 'A minimal primary structure. It saves mass and money, and it blocks less radiation.',
    costUsd: 6_500_000,
    massKg: 145,
    drawsW: 0,
    generatesW: 0,
    performance: 64,
    structuralRating: 0.42,
  },
  {
    id: 'struct-standard',
    category: 'structure',
    name: 'Standard frame',
    description: 'A balanced bus structure with modest shielding, sized for inner-planet missions.',
    costUsd: 12_000_000,
    massKg: 255,
    drawsW: 0,
    generatesW: 0,
    performance: 80,
    structuralRating: 0.7,
  },
  {
    id: 'struct-heavy',
    category: 'structure',
    name: 'Heavy-duty frame',
    description: 'Thicker panels and more shielding. This is the structure that stands up to the Jupiter environment in this model.',
    costUsd: 19_000_000,
    massKg: 420,
    drawsW: 0,
    generatesW: 0,
    performance: 94,
    structuralRating: 0.93,
  },
  {
    id: 'prop-chemical',
    category: 'propulsion',
    name: 'Chemical propulsion',
    description: 'A high-thrust bipropellant system. Burns are short. Most of the propellant is used leaving Earth and braking at the destination.',
    costUsd: 24_000_000,
    massKg: 300,
    drawsW: 55,
    generatesW: 0,
    performance: 78,
    isp: 318,
    thrustClass: 'high',
    departure: 0.62,
    cruise: 0,
    insertion: 0.38,
  },
  {
    id: 'prop-electric',
    category: 'propulsion',
    name: 'Electric propulsion',
    description: 'A high-specific-impulse ion system. It saves propellant, but it must draw hundreds of watts for most of the cruise.',
    costUsd: 36_000_000,
    massKg: 150,
    drawsW: 430,
    generatesW: 0,
    performance: 88,
    isp: 3100,
    thrustClass: 'low',
    departure: 0.18,
    cruise: 0.7,
    insertion: 0.12,
  },
  {
    id: 'prop-advanced',
    category: 'propulsion',
    name: 'Advanced propulsion',
    description: 'A fictional high-performance hybrid used for this simulation. It sits between chemical and electric: less propellant than chemical, less power than a full ion cruise.',
    costUsd: 54_000_000,
    massKg: 220,
    drawsW: 180,
    generatesW: 0,
    performance: 96,
    isp: 1450,
    thrustClass: 'medium',
    departure: 0.46,
    cruise: 0.26,
    insertion: 0.28,
  },
  {
    id: 'power-basic-solar',
    category: 'power',
    name: 'Basic solar panels',
    description: 'A straightforward array. Output is quoted at Earth and scaled by sunlight at the destination.',
    costUsd: 8_000_000,
    massKg: 48,
    drawsW: 0,
    generatesW: 820,
    performance: 60,
    solar: true,
  },
  {
    id: 'power-high-solar',
    category: 'power',
    name: 'High-efficiency solar panels',
    description: 'A larger, more efficient array. Still uselessly dim at Jupiter, but strong at Mars and inward.',
    costUsd: 17_000_000,
    massKg: 42,
    drawsW: 0,
    generatesW: 1800,
    performance: 86,
    solar: true,
  },
  {
    id: 'power-rtg',
    category: 'power',
    name: 'Radioisotope power system',
    description: 'A steady thermal-electric source. Distance from the Sun does not change its output in this model.',
    costUsd: 42_000_000,
    massKg: 58,
    drawsW: 0,
    generatesW: 440,
    performance: 91,
    solar: false,
  },
  {
    id: 'comm-low',
    category: 'communication',
    name: 'Low-gain antenna',
    description: 'A wide beam that is easy to point. It is enough near Earth and the Moon, and weak on a deep-space link.',
    costUsd: 2_000_000,
    massKg: 4,
    drawsW: 12,
    generatesW: 0,
    performance: 42,
    linkFactor: 1.35,
  },
  {
    id: 'comm-medium',
    category: 'communication',
    name: 'Medium-gain antenna',
    description: 'A compromise antenna. It closes a Mars-class link and struggles at Jupiter.',
    costUsd: 8_000_000,
    massKg: 14,
    drawsW: 28,
    generatesW: 0,
    performance: 72,
    linkFactor: 4.8,
  },
  {
    id: 'comm-high',
    category: 'communication',
    name: 'High-gain antenna',
    description: 'A narrow, steerable dish. This is the antenna that can return a Jupiter data set in this model.',
    costUsd: 19_000_000,
    massKg: 30,
    drawsW: 60,
    generatesW: 0,
    performance: 93,
    linkFactor: 13.5,
  },
  {
    id: 'thermal-basic',
    category: 'thermal',
    name: 'Basic insulation',
    description: 'Multilayer insulation and simple heaters. Adequate for mild environments, thin at Venus.',
    costUsd: 3_200_000,
    massKg: 18,
    drawsW: 12,
    generatesW: 0,
    performance: 50,
    thermalRating: 0.45,
  },
  {
    id: 'thermal-advanced',
    category: 'thermal',
    name: 'Advanced thermal protection',
    description: 'High-temperature insulation, radiators, and a more capable control loop.',
    costUsd: 12_000_000,
    massKg: 44,
    drawsW: 32,
    generatesW: 0,
    performance: 91,
    thermalRating: 0.92,
  },
  {
    id: 'store-standard',
    category: 'storage',
    name: 'Standard battery',
    description: 'Enough stored energy to ride through a short chemical burn and ordinary dips.',
    costUsd: 3_500_000,
    massKg: 26,
    drawsW: 6,
    generatesW: 0,
    performance: 58,
    batteryWh: 1500,
  },
  {
    id: 'store-high',
    category: 'storage',
    name: 'High-capacity battery',
    description: 'A heavier battery for longer eclipses and tighter power margins.',
    costUsd: 9_500_000,
    massKg: 52,
    drawsW: 9,
    generatesW: 0,
    performance: 88,
    batteryWh: 4600,
  },
]

export const INSTRUMENTS: InstrumentDef[] = [
  {
    id: 'inst-camera',
    name: 'High-resolution camera',
    description: 'Maps landforms and provides the context images other measurements need.',
    costUsd: 5_200_000,
    massKg: 13,
    drawsW: 30,
    capability: 80,
    dataRateBps: 1_500_000,
    dutyCycle: 0.12,
    objectiveIds: ['obj-geology', 'obj-habitability'],
  },
  {
    id: 'inst-ir',
    name: 'Infrared spectrometer',
    description: 'Reads atmospheric and surface composition from infrared spectra.',
    costUsd: 9_800_000,
    massKg: 19,
    drawsW: 46,
    capability: 88,
    dataRateBps: 48_000,
    dutyCycle: 0.3,
    objectiveIds: ['obj-atmosphere', 'obj-composition', 'obj-habitability'],
  },
  {
    id: 'inst-radar',
    name: 'Radar system',
    description: 'Looks through darkness and, in this model, is one of the tools that can search for buried ice.',
    costUsd: 14_500_000,
    massKg: 34,
    drawsW: 105,
    capability: 91,
    dataRateBps: 250_000,
    dutyCycle: 0.08,
    objectiveIds: ['obj-water', 'obj-geology'],
  },
  {
    id: 'inst-mag',
    name: 'Magnetometer',
    description: 'A light instrument that measures the magnetic field along the trajectory.',
    costUsd: 3_400_000,
    massKg: 4.5,
    drawsW: 8,
    capability: 84,
    dataRateBps: 6_000,
    dutyCycle: 0.85,
    objectiveIds: ['obj-magnetic'],
  },
  {
    id: 'inst-atmo',
    name: 'Atmospheric sensor',
    description: 'Samples density, temperature, and composition where the spacecraft can reach the atmosphere.',
    costUsd: 7_200_000,
    massKg: 10,
    drawsW: 22,
    capability: 86,
    dataRateBps: 16_000,
    dutyCycle: 0.4,
    objectiveIds: ['obj-atmosphere', 'obj-habitability'],
  },
  {
    id: 'inst-thermal',
    name: 'Thermal imaging system',
    description: 'Maps surface temperature and helps separate materials that look alike in visible light.',
    costUsd: 8_400_000,
    massKg: 15,
    drawsW: 34,
    capability: 77,
    dataRateBps: 80_000,
    dutyCycle: 0.2,
    objectiveIds: ['obj-geology', 'obj-composition'],
  },
  {
    id: 'inst-soil',
    name: 'Soil analyzer',
    description: 'A close-range composition package aimed at regolith, ice, and asteroid material.',
    costUsd: 13_000_000,
    massKg: 23,
    drawsW: 56,
    capability: 93,
    dataRateBps: 12_000,
    dutyCycle: 0.15,
    objectiveIds: ['obj-water', 'obj-composition', 'obj-habitability', 'obj-asteroid'],
  },
]

export const LAUNCH_VEHICLES: LaunchVehicleDef[] = [
  {
    id: 'lv-light',
    name: 'ORBIT-X Light',
    description: 'Fictional small launcher for this simulation. It is aimed at modest Earth-orbit and very lean escape missions.',
    costUsd: 26_000_000,
    maxPayloadKg: 900,
    suitability: 'Earth orbit and carefully mass-constrained escape trajectories.',
    note: 'Fictional vehicle. Not a real NASA rocket.',
  },
  {
    id: 'lv-explorer',
    name: 'ORBIT-X Explorer',
    description: 'Fictional medium launcher. The workhorse for lunar missions and for deep-space spacecraft that do not carry a chemical propellant load.',
    costUsd: 62_000_000,
    maxPayloadKg: 2300,
    suitability: 'Lunar missions and higher-Isp deep-space stacks.',
    note: 'Fictional vehicle. Not a real NASA rocket.',
  },
  {
    id: 'lv-heavy',
    name: 'ORBIT-X Heavy',
    description: 'Fictional heavy launcher for spacecraft whose chemical propellant dominates the mass budget.',
    costUsd: 125_000_000,
    maxPayloadKg: 4600,
    suitability: 'Mars-class chemical missions and heavier buses.',
    note: 'Fictional vehicle. Not a real NASA rocket.',
  },
  {
    id: 'lv-deep',
    name: 'ORBIT-X Deep Space',
    description: 'Fictional high-energy launcher with an educational upper-stage allowance. Even this vehicle cannot lift an all-chemical Jupiter stack in the model.',
    costUsd: 210_000_000,
    maxPayloadKg: 7600,
    suitability: 'The heaviest stacks this simulation will fly.',
    note: 'Fictional vehicle. Not a real NASA rocket.',
  },
]

export const MISSIONS: MissionTemplate[] = [
  {
    id: 'lunar',
    name: 'Lunar Exploration',
    destination: 'The Moon',
    summary: 'Leave Earth, insert into lunar orbit, and map a world we can still be surprised by.',
    narrative:
      'A short cruise and a demanding pair of burns. Sunlight is essentially the same as at Earth, the communications range is kind, and the thermal environment still swings hard between sun and shadow.',
    suggestedObjectiveIds: ['obj-water', 'obj-geology', 'obj-composition'],
    recommendedDifficulty: 'beginner',
    durationDays: 21,
    scientificImportance: 'High',
    importanceNote: 'Water ice and surface history still shape plans for longer stays on the Moon.',
    distanceKm: 384_400,
    distanceLabel: '384,400 km from Earth',
    distanceAu: 1,
    commsAu: 0.22,
    deltaV: 3000,
    thermalStress: 0.6,
    radiation: 0.3,
    baseBudgetUsd: 190_000_000,
    dailyOpsUsd: 140_000,
    constraints: [
      'Translunar injection and lunar orbit insertion dominate the delta-v.',
      'A low-gain antenna can close this link. It will not close a Jupiter link.',
      'Basic insulation runs warm. Expert difficulty expects a real thermal margin.',
    ],
    color: '#c5c8ce',
    visual: { orbit: 1.7, size: 0.16, period: 18 },
    cruiseVelocityKms: 1.05,
    orbitAltitudeKm: 100,
    orbitVelocityKms: 1.63,
  },
  {
    id: 'earth',
    name: 'Earth Observation',
    destination: 'Earth orbit',
    summary: 'A low Earth orbit observatory. The rocket problem is modest. The science is not.',
    narrative:
      'This mission never really leaves home. Delta-v covers orbit raising and station-keeping. Power and communications are forgiving, which makes it the cleanest place to learn the budget.',
    suggestedObjectiveIds: ['obj-atmosphere', 'obj-geology', 'obj-magnetic'],
    recommendedDifficulty: 'beginner',
    durationDays: 160,
    scientificImportance: 'High',
    importanceNote: 'Earth orbit is where atmosphere, land, and the magnetic field can be watched continuously.',
    distanceKm: 550,
    distanceLabel: '550 km low Earth orbit',
    distanceAu: 1,
    commsAu: 0.12,
    deltaV: 380,
    thermalStress: 0.32,
    radiation: 0.2,
    baseBudgetUsd: 145_000_000,
    dailyOpsUsd: 45_000,
    constraints: [
      'Delta-v is orbit raising and station-keeping, not an interplanetary transfer.',
      'The light launcher can lift a modest observatory.',
      'A long operations bill still has to fit in the budget.',
    ],
    color: '#6ea8ff',
    visual: { orbit: 2.35, size: 0.22, period: 24 },
    cruiseVelocityKms: 7.6,
    orbitAltitudeKm: 550,
    orbitVelocityKms: 7.6,
  },
  {
    id: 'venus',
    name: 'Venus Atmospheric Study',
    destination: 'Venus',
    summary: 'A bright, nearby world with an atmosphere that punishes unprepared hardware.',
    narrative:
      'Solar power is abundant inside Earth’s orbit. Heat is the constraint that decides the mission. The spacecraft has to fly the cruise and the science phase without cooking the bus.',
    suggestedObjectiveIds: ['obj-atmosphere', 'obj-composition'],
    recommendedDifficulty: 'intermediate',
    durationDays: 140,
    scientificImportance: 'Very high',
    importanceNote: 'Venus is the clearest comparison for runaway greenhouse climates.',
    distanceKm: 41_000_000,
    distanceLabel: 'About 41 million km at a favorable geometry',
    distanceAu: 0.72,
    commsAu: 0.72,
    deltaV: 3480,
    thermalStress: 0.9,
    radiation: 0.22,
    baseBudgetUsd: 280_000_000,
    dailyOpsUsd: 70_000,
    constraints: [
      'Thermal stress is the highest in the catalog.',
      'Basic insulation will overheat. Expert difficulty will not accept it.',
      'Sunlight is stronger than at Earth, so arrays are not the scarce resource.',
    ],
    color: '#e6d3a3',
    visual: { orbit: 3.15, size: 0.24, period: 32 },
    cruiseVelocityKms: 35,
    orbitAltitudeKm: 400,
    orbitVelocityKms: 7.2,
  },
  {
    id: 'mars',
    name: 'Mars Exploration',
    destination: 'Mars',
    summary: 'A classic interplanetary flight: months of cruise, a capture burn, and a crowded science plan.',
    narrative:
      'Mars sits far enough from the Sun that solar arrays lose more than half their Earth output. A chemical spacecraft also carries a propellant load that outgrows the medium launcher.',
    suggestedObjectiveIds: ['obj-water', 'obj-habitability', 'obj-geology', 'obj-atmosphere'],
    recommendedDifficulty: 'intermediate',
    durationDays: 260,
    scientificImportance: 'Very high',
    importanceNote: 'Water, climate, and the question of past habitability meet on one planet.',
    distanceKm: 225_000_000,
    distanceLabel: 'About 225 million km, a representative transfer',
    distanceAu: 1.52,
    commsAu: 1.52,
    deltaV: 4100,
    thermalStress: 0.48,
    radiation: 0.36,
    baseBudgetUsd: 360_000_000,
    dailyOpsUsd: 80_000,
    constraints: [
      'Sunlight is about 43% of the Earth value.',
      'Chemical propulsion usually needs the heavy launcher.',
      'Electric propulsion saves mass and spends power instead.',
    ],
    color: '#d06a45',
    visual: { orbit: 4.15, size: 0.2, period: 42 },
    cruiseVelocityKms: 24,
    orbitAltitudeKm: 400,
    orbitVelocityKms: 3.4,
  },
  {
    id: 'asteroid',
    name: 'Asteroid Exploration',
    destination: 'Main-belt asteroid',
    summary: 'Rendezvous with a small body. There is no thick atmosphere to hide a weak design.',
    narrative:
      'The delta-v for a main-belt rendezvous is high, the Sun is dim, and the radio link is long. The workable designs sit between a chemical propellant mountain and an ion drive the arrays cannot feed.',
    suggestedObjectiveIds: ['obj-asteroid', 'obj-composition', 'obj-water'],
    recommendedDifficulty: 'expert',
    durationDays: 380,
    scientificImportance: 'High',
    importanceNote: 'Asteroids preserve material from the early solar system and the inventory of water in small bodies.',
    distanceKm: 340_000_000,
    distanceLabel: 'About 340 million km, inner main belt',
    distanceAu: 2.4,
    commsAu: 2.4,
    deltaV: 5050,
    thermalStress: 0.4,
    radiation: 0.34,
    baseBudgetUsd: 300_000_000,
    dailyOpsUsd: 70_000,
    constraints: [
      'Sunlight is about 17% of the Earth value.',
      'A chemical propellant load pushes the spacecraft onto a heavy launcher.',
      'A low-gain antenna will not return a solid data set from this range.',
    ],
    color: '#b7aa9a',
    visual: { orbit: 5.15, size: 0.1, period: 50 },
    cruiseVelocityKms: 22,
    orbitAltitudeKm: 25,
    orbitVelocityKms: 0.2,
  },
  {
    id: 'jupiter',
    name: 'Jupiter Exploration',
    destination: 'Jupiter',
    summary: 'The far mission. Distance, sunlight, radiation, and delta-v all get worse together.',
    narrative:
      'At Jupiter a solar array produces only a few percent of its Earth output. An all-chemical propellant load outgrows every launcher in the catalog. The flight is long enough for several things to go wrong.',
    suggestedObjectiveIds: ['obj-atmosphere', 'obj-magnetic', 'obj-composition'],
    recommendedDifficulty: 'expert',
    durationDays: 640,
    scientificImportance: 'Highest',
    importanceNote: 'Jupiter’s atmosphere, magnetic field, and moons anchor the outer solar system.',
    distanceKm: 778_500_000,
    distanceLabel: 'About 779 million km',
    distanceAu: 5.2,
    commsAu: 5.2,
    deltaV: 6800,
    thermalStress: 0.55,
    radiation: 0.9,
    baseBudgetUsd: 440_000_000,
    dailyOpsUsd: 100_000,
    constraints: [
      'Sunlight is about 4% of the Earth value.',
      'Chemical propulsion does not fit the heaviest fictional launcher.',
      'Expert difficulty requires a heavy structure for the radiation environment.',
      'A high-gain antenna is what makes the data return credible.',
    ],
    color: '#d2b48c',
    visual: { orbit: 6.45, size: 0.48, period: 64 },
    cruiseVelocityKms: 13,
    orbitAltitudeKm: 5000,
    orbitVelocityKms: 17,
  },
]

const missionMap = new Map(MISSIONS.map((mission) => [mission.id, mission]))
const objectiveMap = new Map(OBJECTIVES.map((objective) => [objective.id, objective]))
const componentMap = new Map(COMPONENTS.map((component) => [component.id, component]))
const instrumentMap = new Map(INSTRUMENTS.map((instrument) => [instrument.id, instrument]))
const vehicleMap = new Map(LAUNCH_VEHICLES.map((vehicle) => [vehicle.id, vehicle]))

export function getMission(id: DestinationId | null) {
  if (!id) return null
  return missionMap.get(id) ?? null
}

export function getObjective(id: string) {
  return objectiveMap.get(id) ?? null
}

export function getComponent(id: string | null) {
  if (!id) return null
  return componentMap.get(id) ?? null
}

export function getInstrument(id: string) {
  return instrumentMap.get(id) ?? null
}

export function getVehicle(id: string | null) {
  if (!id) return null
  return vehicleMap.get(id) ?? null
}

export function instrumentsForObjective(objectiveId: string) {
  return INSTRUMENTS.filter((instrument) => instrument.objectiveIds.includes(objectiveId))
}

export function componentsByCategory(category: ComponentCategory) {
  return COMPONENTS.filter((component) => component.category === category)
}
