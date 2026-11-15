import type { DestinationId, Difficulty, RiskLevel } from '../types'

export interface EventOption {
  id: string
  label: string
  detail: string
  risk: RiskLevel
  outcome: string
  fuelLeakFraction?: number
  healthOffset?: number
  batteryOffset?: number
  tempOffset?: number
  signalOffset?: number
  scienceMultiplier?: number
}

export interface GameEvent {
  id: string
  title: string
  description: string
  destinations?: DestinationId[]
  minDifficulty: Difficulty
  options: EventOption[]
}

export const EVENTS: GameEvent[] = [
  {
    id: 'solar-storm',
    title: 'Solar storm',
    description:
      'A solar storm is raising the radiation dose and disturbing the power system. The bus is still alive. How you spend the next hours will show up in the health and science totals.',
    minDifficulty: 'beginner',
    options: [
      {
        id: 'safe-mode',
        label: 'Enter safe mode',
        detail: 'Power down the instruments, hold attitude, and ride the storm out.',
        risk: 'low',
        outcome: 'The spacecraft weathered the storm in safe mode. Science time was lost, and the systems stayed intact.',
        healthOffset: 2,
        batteryOffset: -4,
        scienceMultiplier: 0.93,
        signalOffset: -4,
      },
      {
        id: 'continue-science',
        label: 'Continue scientific operations',
        detail: 'Keep the instruments running through the elevated radiation.',
        risk: 'high',
        outcome: 'The instruments kept collecting data while the storm degraded the bus.',
        healthOffset: -16,
        tempOffset: 8,
        scienceMultiplier: 1.04,
      },
      {
        id: 'reduce-power',
        label: 'Reduce power consumption',
        detail: 'Shed the high-draw instruments and keep communications at a lower rate.',
        risk: 'medium',
        outcome: 'Load shedding protected the battery and cost a slice of the science return.',
        healthOffset: -3,
        batteryOffset: 6,
        scienceMultiplier: 0.96,
      },
    ],
  },
  {
    id: 'comms-drop',
    title: 'Communication disruption',
    description:
      'The link margin has collapsed. Ground stations still have the carrier some of the time. You can wait, spend power to punch through, or abandon this pass.',
    minDifficulty: 'beginner',
    options: [
      {
        id: 'retransmit',
        label: 'Wait and retransmit',
        detail: 'Hold the data recorder and try the next pass.',
        risk: 'low',
        outcome: 'The next pass recovered the link. A little science time was spent waiting.',
        signalOffset: -3,
        scienceMultiplier: 0.97,
      },
      {
        id: 'boost',
        label: 'Boost the transmitter',
        detail: 'Raise transmitter power immediately and accept the battery hit.',
        risk: 'medium',
        outcome: 'The boosted pass rebuilt the link and pulled the battery down.',
        signalOffset: 8,
        batteryOffset: -12,
        healthOffset: -2,
      },
      {
        id: 'skip-pass',
        label: 'Skip this pass',
        detail: 'Drop the data queued for this contact.',
        risk: 'high',
        outcome: 'The recorder was purged to protect the schedule. That data is gone.',
        signalOffset: -14,
        scienceMultiplier: 0.9,
        batteryOffset: 4,
      },
    ],
  },
  {
    id: 'battery-wear',
    title: 'Battery degradation',
    description:
      'The battery is accepting less charge than it did at launch. A full science load will push it further. Shedding load gives it a chance to recover.',
    minDifficulty: 'beginner',
    options: [
      {
        id: 'shed-load',
        label: 'Shed instrument load',
        detail: 'Run only the lowest-power investigation until the battery recovers.',
        risk: 'low',
        outcome: 'The battery recovered. One investigation ran shorter than planned.',
        batteryOffset: 10,
        healthOffset: 2,
        scienceMultiplier: 0.92,
      },
      {
        id: 'full-ops',
        label: 'Keep full operations',
        detail: 'Continue the science plan and let the battery absorb the deficit.',
        risk: 'high',
        outcome: 'Operations continued and the battery came out of the event in worse shape.',
        batteryOffset: -16,
        healthOffset: -8,
      },
      {
        id: 'cycle',
        label: 'Cycle the battery',
        detail: 'A controlled discharge and recharge, with instruments paused briefly.',
        risk: 'medium',
        outcome: 'The cycle stabilized the battery without a large science loss.',
        batteryOffset: 4,
        healthOffset: -1,
        scienceMultiplier: 0.98,
      },
    ],
  },
  {
    id: 'fuel-leak',
    title: 'Fuel leakage',
    description:
      'Pressure is falling in one propellant tank. Isolating it costs a little propellant. Ignoring it costs more, and orbital insertion may no longer be possible.',
    minDifficulty: 'intermediate',
    options: [
      {
        id: 'isolate',
        label: 'Isolate the tank',
        detail: 'Close the leaking section and continue on the remaining propellant.',
        risk: 'low',
        outcome: 'The leak was isolated. A small amount of propellant was lost and the burn plan still closes.',
        fuelLeakFraction: 0.025,
        healthOffset: -2,
      },
      {
        id: 'ignore-leak',
        label: 'Continue without repair',
        detail: 'Keep the nominal timeline and accept the higher leak rate.',
        risk: 'high',
        outcome: 'The leak continued. Insertion now depends on whatever propellant is left.',
        fuelLeakFraction: 0.1,
        healthOffset: -6,
      },
      {
        id: 'vent',
        label: 'Vent and rebalance',
        detail: 'Vent the damaged section, rebalance the remaining load, and trim the science plan.',
        risk: 'medium',
        outcome: 'The system was rebalanced. More propellant was lost than a clean isolation, and less than an open leak.',
        fuelLeakFraction: 0.045,
        healthOffset: -1,
        scienceMultiplier: 0.96,
      },
    ],
  },
  {
    id: 'thermal-spike',
    title: 'Temperature spike',
    description:
      'Temperatures on the bus are climbing faster than the cruise prediction. You can turn the spacecraft, spend power on cooling, or leave the timeline alone.',
    destinations: ['lunar', 'venus'],
    minDifficulty: 'beginner',
    options: [
      {
        id: 'shade',
        label: 'Rotate into a safer attitude',
        detail: 'Break the science pointing and put the insulated face toward the heat.',
        risk: 'low',
        outcome: 'The attitude change brought the temperature back down and paused part of the observation.',
        tempOffset: -26,
        scienceMultiplier: 0.94,
        signalOffset: -4,
      },
      {
        id: 'ignore-heat',
        label: 'Continue the timeline',
        detail: 'Keep the instruments pointed and hope the thermal system catches up.',
        risk: 'high',
        outcome: 'The timeline held. The bus ran hot, and the thermal damage is now in the health total.',
        tempOffset: 24,
        healthOffset: -14,
      },
      {
        id: 'cool',
        label: 'Increase cooling',
        detail: 'Run the thermal loop harder and accept the power cost.',
        risk: 'medium',
        outcome: 'Extra cooling stabilized the temperature and discharged the battery.',
        tempOffset: -16,
        batteryOffset: -10,
        healthOffset: -2,
      },
    ],
  },
  {
    id: 'instrument-fault',
    title: 'Instrument malfunction',
    description:
      'One instrument has stopped returning coherent data. A reboot may recover it. Shutting it down protects the bus and gives up that measurement.',
    minDifficulty: 'intermediate',
    options: [
      {
        id: 'reboot',
        label: 'Reboot the instrument',
        detail: 'Power-cycle it and repeat the last calibration.',
        risk: 'medium',
        outcome: 'The reboot recovered the instrument after a gap in the data set.',
        scienceMultiplier: 0.95,
        batteryOffset: -6,
        healthOffset: -1,
      },
      {
        id: 'shutdown',
        label: 'Shut the instrument down',
        detail: 'Leave it off for the rest of the science phase.',
        risk: 'low',
        outcome: 'The fault was contained. The rest of the payload kept working with a smaller data set.',
        scienceMultiplier: 0.86,
        batteryOffset: 5,
        healthOffset: 3,
      },
      {
        id: 'push-cal',
        label: 'Push a new calibration',
        detail: 'Keep it powered and try to force a valid calibration.',
        risk: 'high',
        outcome: 'The aggressive calibration stressed the instrument and the bus.',
        scienceMultiplier: 0.97,
        healthOffset: -10,
        batteryOffset: -8,
      },
    ],
  },
  {
    id: 'radiation-surge',
    title: 'Radiation surge',
    description:
      'The spacecraft has entered a harder radiation region than the cruise average. Safe mode limits the dose. Staying in science mode does not.',
    destinations: ['jupiter'],
    minDifficulty: 'intermediate',
    options: [
      {
        id: 'rad-safe',
        label: 'Enter safe mode',
        detail: 'Park the instruments and keep only the bus alive until the flux drops.',
        risk: 'low',
        outcome: 'Safe mode limited the dose. The science phase is shorter.',
        healthOffset: 4,
        scienceMultiplier: 0.9,
      },
      {
        id: 'rad-continue',
        label: 'Continue scientific operations',
        detail: 'Collect data through the surge.',
        risk: 'high',
        outcome: 'The payload stayed on. The radiation dose is now a large health penalty.',
        healthOffset: -18,
        scienceMultiplier: 1.03,
      },
      {
        id: 'rad-shed',
        label: 'Power down nonessential systems',
        detail: 'Keep one investigation running and shut the rest down.',
        risk: 'medium',
        outcome: 'A reduced configuration got through the surge with moderate damage.',
        healthOffset: -4,
        batteryOffset: 6,
        scienceMultiplier: 0.94,
      },
    ],
  },
  {
    id: 'dust-impact',
    title: 'Micrometeoroid impact',
    description:
      'A small impact has tripped a fault on the structure. Nothing is venting yet. You can inspect and patch, give up the current pointing, or press on.',
    destinations: ['lunar', 'asteroid'],
    minDifficulty: 'beginner',
    options: [
      {
        id: 'patch',
        label: 'Patch and continue',
        detail: 'Spend time on the fault and resume the timeline once the bus is stable.',
        risk: 'low',
        outcome: 'The impact site was secured. Health took a small hit and the mission continued.',
        healthOffset: -6,
        fuelLeakFraction: 0.01,
      },
      {
        id: 'repont',
        label: 'Abort the current pointing',
        detail: 'Drop this observation and put the spacecraft in a protected attitude.',
        risk: 'medium',
        outcome: 'The observation was lost. The bus came through the impact cleanly.',
        healthOffset: -2,
        scienceMultiplier: 0.93,
      },
      {
        id: 'ignore-impact',
        label: 'Ignore the fault',
        detail: 'Treat the alarm as a sensor glitch and keep the sequence.',
        risk: 'high',
        outcome: 'The fault was real. The structure and the health total both paid for it.',
        healthOffset: -15,
      },
    ],
  },
]

const eventMap = new Map(EVENTS.map((event) => [event.id, event]))

export function getEvent(id: string) {
  return eventMap.get(id) ?? null
}
