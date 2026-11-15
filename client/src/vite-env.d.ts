/// <reference types="vite/client" />

interface Window {
  __orbitxTicker?: number
  __ORBITX__?: {
    getState: () => {
      tick: (seconds: number) => void
      startSimulation: () => boolean
      resolveEvent: (optionId: string) => void
      missions: Array<{
        id: string
        name: string
        status: string
        flight: null | {
          pending: null | { title: string; options: { id: string; label: string }[] }
          finished: boolean
          outcome: string | null
          telemetry: { progressPct: number; fuelKg: number; health: number; temperatureC: number }
          failureReason: string | null
        }
        report: null | { outcome: string; score: { total: number } }
      }>
      activeMissionId: string | null
    }
  }
}
