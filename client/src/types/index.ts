export type Difficulty = 'beginner' | 'intermediate' | 'expert'

export type MissionStatus = 'draft' | 'running' | 'paused' | 'completed' | 'failed'

export type DestinationId = 'lunar' | 'mars' | 'venus' | 'earth' | 'jupiter' | 'asteroid'

export type ComponentCategory =
  | 'structure'
  | 'propulsion'
  | 'power'
  | 'communication'
  | 'thermal'
  | 'storage'

export type ThrustClass = 'high' | 'medium' | 'low'

export type IssueStep =
  | 'mission'
  | 'objectives'
  | 'spacecraft'
  | 'instruments'
  | 'launch'
  | 'resources'

export type StageId =
  | 'prelaunch'
  | 'ignition'
  | 'launch'
  | 'departure'
  | 'cruise'
  | 'insertion'
  | 'approach'
  | 'science'
  | 'transmission'
  | 'complete'

export type RiskLevel = 'low' | 'medium' | 'high'

export interface SpacecraftSelection {
  structure: string | null
  propulsion: string | null
  power: string | null
  communication: string | null
  thermal: string | null
  storage: string | null
}

export interface EngineeringIssue {
  level: 'error' | 'warning'
  code: string
  message: string
  step: IssueStep
}

export interface CostBreakdown {
  components: number
  instruments: number
  launch: number
  operations: number
}

export interface MassBreakdown {
  structure: number
  propulsion: number
  power: number
  communication: number
  thermal: number
  storage: number
  payload: number
  propellant: number
}

export interface EngineeringPhysics {
  solarFluxWm2: number
  powerGeneratedW: number
  powerConsumptionW: number
  batteryCapacityWh: number
  batteryRequiredWh: number
  eclipseHours: number
  batterySufficient: boolean
  propellantRequiredKg: number
  propellantTankKg: number
  deltaVMs: number
  ispS: number
  launchCapacityKg: number
  launchMassKg: number
  launchCompatible: boolean
  linkRangeKm: number
  linkMaxBps: number
  linkRequiredBps: number
  linkMarginDb: number
  linkCapable: boolean
  linkGround: string
  linkGainDbi: number
  thermalHotC: number
  thermalColdC: number
  heaterRequiredW: number
  heaterAvailableW: number
  thermalSafe: boolean
  summary: string[]
}

export interface Metrics {
  ready: boolean
  issues: EngineeringIssue[]
  budgetUsd: number
  totalCostUsd: number
  remainingBudgetUsd: number
  costs: CostBreakdown
  dryMassKg: number
  payloadMassKg: number
  nominalPropellantKg: number
  tankPropellantKg: number
  totalMassKg: number
  payloadCapacityKg: number
  massMarginKg: number
  mass: MassBreakdown
  powerGeneratedW: number
  cruiseLoadW: number
  burnLoadW: number
  powerBalanceW: number
  solarFraction: number
  batteryWh: number
  commsCapacity: number
  thermalRating: number
  thermalStress: number
  radiation: number
  structuralRating: number
  equilibriumTempC: number
  isp: number
  thrustClass: ThrustClass | null
  departureFraction: number
  cruiseFraction: number
  insertionFraction: number
  scienceCoverage: number
  destinationFit: number
  coveredObjectiveIds: string[]
  instrumentCapability: number
  deltaV: number
  physics: EngineeringPhysics
}

export interface TelemetrySample {
  hours: number
  altitudeKm: number
  velocityKms: number
  fuelKg: number
  batteryPct: number
  temperatureC: number
  signalPct: number
  health: number
  progressPct: number
  dataCollected: number
  dataReturned: number
}

export interface FlightPlanStage {
  id: StageId
  title: string
  summary: string
  durationHours: number
}

export interface FlightModifiers {
  fuelLeakKg: number
  healthOffset: number
  batteryOffset: number
  tempOffset: number
  signalOffset: number
  scienceMultiplier: number
}

export interface LogEntry {
  id: string
  hours: number
  stamp: string
  message: string
  tone: 'info' | 'good' | 'warn' | 'bad'
}

export interface ScheduledEvent {
  eventId: string
  threshold: number
  fired: boolean
}

export interface PendingEventOption {
  id: string
  label: string
  detail: string
  risk: RiskLevel
}

export interface PendingEvent {
  eventId: string
  title: string
  description: string
  options: PendingEventOption[]
}

export interface EventResolution {
  eventId: string
  optionId: string
  title: string
  choice: string
  outcome: string
  risk: RiskLevel
}

export interface FlightResult {
  dataCollected: number
  dataReturned: number
  fuelRemainingKg: number
  fuelCapacityKg: number
  health: number
  temperatureC: number
  batteryPct: number
  signalPct: number
}

export interface FlightState {
  seed: number
  speed: 1 | 2 | 4
  stageIndex: number
  stageElapsedHours: number
  totalElapsedHours: number
  plan: FlightPlanStage[]
  modifiers: FlightModifiers
  scheduled: ScheduledEvent[]
  pending: PendingEvent | null
  resolutions: EventResolution[]
  log: LogEntry[]
  samples: TelemetrySample[]
  nextSampleHours: number
  sampleIntervalHours: number
  hoursPerRealSecond: number
  finished: boolean
  outcome: 'success' | 'failure' | null
  failureReason: string | null
  stagesCleared: number
  logSeq: number
  launchWarnings: string[]
  telemetry: TelemetrySample
  result: FlightResult | null
}

export interface ObjectiveResult {
  id: string
  name: string
  status: 'completed' | 'partial' | 'missed'
  note: string
}

export interface ScoreNotes {
  engineering: string
  science: string
  resources: string
  reliability: string
  budget: string
}

export interface ScoreBreakdown {
  engineering: number
  science: number
  resources: number
  reliability: number
  budget: number
  total: number
  weights: {
    engineering: number
    science: number
    resources: number
    reliability: number
    budget: number
  }
  notes: ScoreNotes
}

export interface MissionReport {
  generatedAt: string
  outcome: string
  successPct: number
  failed: boolean
  failureReason: string | null
  score: ScoreBreakdown
  objectives: ObjectiveResult[]
  budgetSpentUsd: number
  remainingBudgetUsd: number
  totalBudgetUsd: number
  health: number
  fuelRemainingKg: number
  fuelCapacityKg: number
  fuelEfficiency: number
  powerGeneratedW: number
  powerConsumedW: number
  powerBalanceW: number
  commsCapacity: number
  dataCollected: number
  dataReturned: number
  temperatureC: number
  problems: string[]
  decisions: string[]
  events: EventResolution[]
  achievements: string[]
  stagesCleared: number
  stageCount: number
}

export interface MissionConfig {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  status: MissionStatus
  difficulty: Difficulty
  destinationId: DestinationId | null
  objectiveIds: string[]
  spacecraft: SpacecraftSelection
  instrumentIds: string[]
  launchVehicleId: string | null
  flight: FlightState | null
  report: MissionReport | null
}

export interface AchievementDef {
  id: string
  name: string
  description: string
}
