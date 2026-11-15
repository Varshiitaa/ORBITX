import { getComponent, getInstrument, getMission, getVehicle } from '../data/catalog'
import type { DestinationId, EngineeringPhysics, MissionConfig } from '../types'
import { G0 } from './constants'

const SOLAR_CONSTANT = 1361
const K_BOLTZMANN = 1.380649e-23
const C_LIGHT = 299_792_458
const SIGMA = 5.670374419e-8
const CODED_EB_N0_DB = 5.5
const IMPLEMENTATION_LOSS_DB = 1.5
const BATTERY_DOD = 0.7
const HOUSEKEEPING_BPS = 2_500

const PLANET_RADIUS_KM: Record<DestinationId, number> = {
  earth: 6371,
  lunar: 1737.4,
  venus: 6051.8,
  mars: 3389.5,
  jupiter: 69911,
  asteroid: 12,
}

const CONTACT_FRACTION: Record<DestinationId, number> = {
  earth: 0.18,
  lunar: 0.25,
  venus: 0.14,
  mars: 0.1,
  asteroid: 0.07,
  jupiter: 0.05,
}

interface AntennaSpec {
  kind: 'patch' | 'dish'
  diameterM: number
  gainDbi: number
  txPowerW: number
  frequencyHz: number
  efficiency: number
}

const ANTENNAS: Record<string, AntennaSpec> = {
  'comm-low': { kind: 'patch', diameterM: 0.16, gainDbi: 6, txPowerW: 8, frequencyHz: 2.2e9, efficiency: 0.5 },
  'comm-medium': { kind: 'dish', diameterM: 1.1, gainDbi: 0, txPowerW: 25, frequencyHz: 8.4e9, efficiency: 0.58 },
  'comm-high': { kind: 'dish', diameterM: 2.6, gainDbi: 0, txPowerW: 70, frequencyHz: 8.4e9, efficiency: 0.62 },
}

interface ThermalSpec {
  radiatorAreaM2: number
  absorptivity: number
  emissivity: number
  heaterW: number
}

const THERMAL: Record<string, ThermalSpec> = {
  'thermal-basic': { radiatorAreaM2: 0.55, absorptivity: 0.28, emissivity: 0.8, heaterW: 140 },
  'thermal-advanced': { radiatorAreaM2: 1.7, absorptivity: 0.16, emissivity: 0.88, heaterW: 480 },
}

const BUS_OPTICS: Record<string, { surfaceM2: number; projectedM2: number; absorptivity: number; emissivity: number }> = {
  'struct-light': { surfaceM2: 1.6, projectedM2: 0.4, absorptivity: 0.45, emissivity: 0.12 },
  'struct-standard': { surfaceM2: 3.1, projectedM2: 0.85, absorptivity: 0.35, emissivity: 0.08 },
  'struct-heavy': { surfaceM2: 5.4, projectedM2: 1.4, absorptivity: 0.28, emissivity: 0.06 },
}

interface GroundSpec {
  name: string
  diameterM: number
  efficiency: number
  tsysK: number
  lossDb: number
}

function groundFor(destination: DestinationId): GroundSpec {
  if (destination === 'earth') return { name: '6 m ground station', diameterM: 6, efficiency: 0.55, tsysK: 150, lossDb: 2 }
  if (destination === 'lunar') return { name: '18 m station', diameterM: 18, efficiency: 0.6, tsysK: 70, lossDb: 1.4 }
  if (destination === 'jupiter' || destination === 'asteroid') {
    return { name: '70 m deep-space station', diameterM: 70, efficiency: 0.65, tsysK: 20, lossDb: 1.4 }
  }
  return { name: '34 m deep-space station', diameterM: 34, efficiency: 0.65, tsysK: 28, lossDb: 1.5 }
}

export function dishGainDbi(diameterM: number, frequencyHz: number, efficiency: number): number {
  if (diameterM <= 0 || frequencyHz <= 0 || efficiency <= 0) return 0
  const wavelength = C_LIGHT / frequencyHz
  return 10 * Math.log10(efficiency * (Math.PI * diameterM / wavelength) ** 2)
}

export function slantRangeKm(orbitRadiusKm: number, planetRadiusKm: number, minElevationDeg: number): number {
  const elevation = (minElevationDeg * Math.PI) / 180
  const central = Math.acos((planetRadiusKm / orbitRadiusKm) * Math.cos(elevation)) - elevation
  return Math.sqrt(
    planetRadiusKm ** 2 + orbitRadiusKm ** 2 - 2 * planetRadiusKm * orbitRadiusKm * Math.cos(central),
  )
}

/** Worst-case circular-orbit eclipse in a cylindrical umbra, beta = 0. */
export function eclipseFraction(orbitRadiusKm: number, planetRadiusKm: number): number {
  const ratio = planetRadiusKm / orbitRadiusKm
  if (ratio >= 1 || ratio <= 0) return 0
  return Math.asin(Math.min(1, ratio)) / Math.PI
}

export function conicPoint(periapsisKm: number, apoapsisKm: number, trueAnomalyRad: number): {
  xKm: number
  yKm: number
  radiusKm: number
} {
  const eccentricity = (apoapsisKm - periapsisKm) / (apoapsisKm + periapsisKm)
  const semiMajor = (periapsisKm + apoapsisKm) / 2
  const radiusKm = (semiMajor * (1 - eccentricity ** 2)) / (1 + eccentricity * Math.cos(trueAnomalyRad))
  return {
    radiusKm,
    xKm: radiusKm * Math.cos(trueAnomalyRad),
    yKm: radiusKm * Math.sin(trueAnomalyRad),
  }
}

export function orbitPeriodHours(muKm3S2: number, radiusKm: number): number {
  return (2 * Math.PI * Math.sqrt(radiusKm ** 3 / muKm3S2)) / 3600
}

function eclipseHoursFor(destination: DestinationId, altitudeKm: number): number {
  if (destination === 'asteroid') return 0
  const radius = PLANET_RADIUS_KM[destination]
  const orbit = radius + Math.max(altitudeKm, 1)
  const mu =
    destination === 'lunar'
      ? 4902.8
      : destination === 'mars'
        ? 42828.37
        : destination === 'venus'
          ? 324859
          : destination === 'jupiter'
            ? 1.26686534e8
            : 398600.4418
  return eclipseFraction(orbit, radius) * orbitPeriodHours(mu, orbit)
}

function linkRangeKm(destination: DestinationId, distanceKm: number, altitudeKm: number): number {
  if (destination === 'earth') return slantRangeKm(PLANET_RADIUS_KM.earth + altitudeKm, PLANET_RADIUS_KM.earth, 5)
  return distanceKm
}

function emptyPhysics(): EngineeringPhysics {
  return {
    solarFluxWm2: 0,
    powerGeneratedW: 0,
    powerConsumptionW: 0,
    batteryCapacityWh: 0,
    batteryRequiredWh: 0,
    eclipseHours: 0,
    batterySufficient: false,
    propellantRequiredKg: 0,
    propellantTankKg: 0,
    deltaVMs: 0,
    ispS: 0,
    launchCapacityKg: 0,
    launchMassKg: 0,
    launchCompatible: false,
    linkRangeKm: 0,
    linkMaxBps: 0,
    linkRequiredBps: 0,
    linkMarginDb: -99,
    linkCapable: false,
    linkGround: 'No ground station',
    linkGainDbi: 0,
    thermalHotC: 0,
    thermalColdC: 0,
    heaterRequiredW: 0,
    heaterAvailableW: 0,
    thermalSafe: false,
    summary: ['Choose a destination and a spacecraft to run the engineering model.'],
  }
}

function temperatureC(absorbedW: number, areaEps: number): number {
  const kelvin = (Math.max(absorbedW, 0) / (SIGMA * Math.max(areaEps, 1e-4))) ** 0.25
  return kelvin - 273.15
}

export function computePhysics(
  mission: MissionConfig,
  loads: {
    cruiseLoadW: number
    powerGeneratedW: number
    solarFraction: number
    nominalPropellantKg: number
    tankPropellantKg: number
    totalMassKg: number
    isp: number
  },
): EngineeringPhysics {
  const destination = getMission(mission.destinationId)
  if (!destination) return emptyPhysics()

  const communication = getComponent(mission.spacecraft.communication)
  const thermal = getComponent(mission.spacecraft.thermal)
  const storage = getComponent(mission.spacecraft.storage)
  const structure = getComponent(mission.spacecraft.structure)
  const vehicle = getVehicle(mission.launchVehicleId)
  const antenna = communication ? ANTENNAS[communication.id] : null
  const thermalSpec = thermal ? THERMAL[thermal.id] : null
  const bus = structure ? BUS_OPTICS[structure.id] : BUS_OPTICS['struct-standard']
  const instruments = mission.instrumentIds.map((id) => getInstrument(id)).filter((item) => item !== null)

  const solarFluxWm2 = SOLAR_CONSTANT * loads.solarFraction
  const eclipseHours = eclipseHoursFor(destination.id, destination.orbitAltitudeKm)
  const batteryCapacityWh = storage?.batteryWh ?? 0
  const batteryRequiredWh = eclipseHours > 0 ? (loads.cruiseLoadW * eclipseHours) / BATTERY_DOD : 0
  const batterySufficient = batteryCapacityWh + 1e-6 >= batteryRequiredWh

  const launchCapacityKg = vehicle?.maxPayloadKg ?? 0
  const launchCompatible = launchCapacityKg > 0 && loads.totalMassKg <= launchCapacityKg

  const productionBps =
    HOUSEKEEPING_BPS + instruments.reduce((sum, instrument) => sum + instrument.dataRateBps * instrument.dutyCycle, 0)
  const linkRequiredBps = productionBps / CONTACT_FRACTION[destination.id]
  const rangeKm = linkRangeKm(destination.id, destination.distanceKm, destination.orbitAltitudeKm)
  const ground = groundFor(destination.id)
  let linkMaxBps = 0
  let linkMarginDb = -99
  let linkGainDbi = 0
  let fsplDb = 0
  if (antenna && antenna.txPowerW > 0 && rangeKm > 0) {
    const wavelength = C_LIGHT / antenna.frequencyHz
    linkGainDbi =
      antenna.kind === 'dish' ? dishGainDbi(antenna.diameterM, antenna.frequencyHz, antenna.efficiency) : antenna.gainDbi
    const rxGain = dishGainDbi(ground.diameterM, antenna.frequencyHz, ground.efficiency)
    fsplDb = 20 * Math.log10((4 * Math.PI * rangeKm * 1000) / wavelength)
    const receivedDbw = 10 * Math.log10(antenna.txPowerW) + linkGainDbi + rxGain - fsplDb - ground.lossDb
    const noiseDbwPerHz = 10 * Math.log10(K_BOLTZMANN * ground.tsysK)
    const available = receivedDbw - noiseDbwPerHz - CODED_EB_N0_DB - IMPLEMENTATION_LOSS_DB
    linkMaxBps = available > -50 ? 10 ** (available / 10) : 0
    if (!Number.isFinite(linkMaxBps) || linkMaxBps < 0) linkMaxBps = 0
    const ebNo = receivedDbw - noiseDbwPerHz - 10 * Math.log10(Math.max(linkRequiredBps, 1))
    linkMarginDb = ebNo - CODED_EB_N0_DB - IMPLEMENTATION_LOSS_DB
  }
  const linkCapable = Boolean(antenna) && linkMarginDb >= 0

  const radiator = thermalSpec ?? { radiatorAreaM2: 0.4, absorptivity: 0.4, emissivity: 0.7, heaterW: 0 }
  const areaEps = radiator.radiatorAreaM2 * radiator.emissivity + bus.surfaceM2 * bus.emissivity
  const solarAbsorbed =
    solarFluxWm2 *
    (radiator.radiatorAreaM2 * radiator.absorptivity * 0.34 + bus.projectedM2 * bus.absorptivity * 0.25)
  const hotC = temperatureC(solarAbsorbed + loads.cruiseLoadW * 0.8, areaEps)
  const floorC = -20
  const floorK = floorC + 273.15
  const heatForFloor = SIGMA * areaEps * floorK ** 4
  const coldHave = Math.max(loads.cruiseLoadW * 0.35 * 0.8, 0)
  const heaterRequiredW = Math.max(0, (heatForFloor - coldHave) / 0.8)
  const heaterApplied = Math.min(heaterRequiredW, radiator.heaterW)
  const coldC = temperatureC(coldHave + heaterApplied * 0.8, areaEps)
  const thermalSafe = Boolean(thermalSpec) && hotC <= 50 && coldC >= floorC && heaterRequiredW <= radiator.heaterW + 1e-6

  const summary = [
    `Solar flux at ${destination.distanceAu} AU is ${solarFluxWm2.toFixed(0)} W/m². Generation uses the catalog Earth rating scaled by that factor.`,
    `Propellant uses m = m_dry (exp(Δv / (Isp g0)) − 1) with Δv ${destination.deltaV} m/s, Isp ${loads.isp || 0} s, and g0 ${G0}. The tank then applies the difficulty reserve.`,
    `The battery must cover a ${eclipseHours.toFixed(2)} h worst-case eclipse at the cruise load, divided by a ${BATTERY_DOD} depth of discharge.`,
    antenna
      ? `Link: ${linkGainDbi.toFixed(1)} dBi, free-space loss ${fsplDb.toFixed(1)} dB over ${Math.round(rangeKm).toLocaleString('en-US')} km into ${ground.name}. Coded BPSK needs 5.5 dB Eb/N0 plus 1.5 dB implementation loss. The required rate is average data divided by the contact fraction ${CONTACT_FRACTION[destination.id]}.`
      : 'Select an antenna to run the link budget.',
    `Thermal balance is a single node: σ εA T⁴ equals absorbed sunlight plus electrical heat. Limits are 50°C hot and ${floorC}°C cold.`,
    `Launch compatibility compares wet mass ${loads.totalMassKg.toFixed(0)} kg with ${vehicle?.name ?? 'no launcher'} capacity ${launchCapacityKg.toFixed(0)} kg.`,
  ]

  return {
    solarFluxWm2,
    powerGeneratedW: loads.powerGeneratedW,
    powerConsumptionW: loads.cruiseLoadW,
    batteryCapacityWh,
    batteryRequiredWh,
    eclipseHours,
    batterySufficient,
    propellantRequiredKg: loads.nominalPropellantKg,
    propellantTankKg: loads.tankPropellantKg,
    deltaVMs: destination.deltaV,
    ispS: loads.isp,
    launchCapacityKg,
    launchMassKg: loads.totalMassKg,
    launchCompatible,
    linkRangeKm: rangeKm,
    linkMaxBps,
    linkRequiredBps,
    linkMarginDb,
    linkCapable,
    linkGround: ground.name,
    linkGainDbi,
    thermalHotC: hotC,
    thermalColdC: coldC,
    heaterRequiredW,
    heaterAvailableW: radiator.heaterW,
    thermalSafe,
    summary,
  }
}
