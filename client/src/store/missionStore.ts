import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { deleteMissionRemote, fetchMissions, getHealth, saveMission } from '../services/api'
import type { Difficulty, MissionConfig, MissionStatus, SpacecraftSelection } from '../types'
import { emptySpacecraft } from '../engine/calculations'
import { computeMetrics } from '../engine/calculations'
import { buildReport } from '../engine/scoring'
import { advanceFlight, createFlight, missionHoursFor, resolveFlightEvent } from '../engine/simulation'
import { hashSeed } from '../engine/constants'

export type SyncState = 'device' | 'database' | 'offline'

interface MissionStore {
  missions: MissionConfig[]
  activeMissionId: string | null
  sync: SyncState
  hydrated: boolean
  ensureDraft: () => string
  createMission: () => string
  setActive: (id: string) => void
  updateActive: (recipe: (mission: MissionConfig) => MissionConfig) => void
  deleteMission: (id: string) => void
  duplicateMission: (id: string) => string | null
  startSimulation: () => boolean
  pauseSimulation: () => void
  resumeSimulation: () => void
  restartSimulation: () => void
  setSpeed: (speed: 1 | 2 | 4) => void
  resolveEvent: (optionId: string) => void
  tick: (realSeconds: number) => void
  syncFromServer: () => Promise<void>
}

let databaseEnabled = false
const dirty = new Set<string>()
let flushTimer: number | null = null

function newMission(): MissionConfig {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    name: 'Untitled mission',
    createdAt: now,
    updatedAt: now,
    status: 'draft',
    difficulty: 'beginner',
    destinationId: null,
    objectiveIds: [],
    spacecraft: emptySpacecraft(),
    instrumentIds: [],
    launchVehicleId: null,
    flight: null,
    report: null,
  }
}

function isMission(value: unknown): value is MissionConfig {
  if (!value || typeof value !== 'object') return false
  const mission = value as Partial<MissionConfig>
  return (
    typeof mission.id === 'string' &&
    typeof mission.name === 'string' &&
    typeof mission.createdAt === 'string' &&
    typeof mission.status === 'string' &&
    Boolean(mission.spacecraft) &&
    Array.isArray(mission.objectiveIds) &&
    Array.isArray(mission.instrumentIds)
  )
}

function queueSave(mission: MissionConfig) {
  if (!databaseEnabled) return
  dirty.add(mission.id)
  if (flushTimer) window.clearTimeout(flushTimer)
  flushTimer = window.setTimeout(() => {
    void flushSaves()
  }, 500)
}

async function flushSaves() {
  const ids = [...dirty]
  dirty.clear()
  const missions = useMissionStore.getState().missions
  for (const id of ids) {
    const mission = missions.find((item) => item.id === id)
    if (!mission) continue
    try {
      await saveMission(mission)
      useMissionStore.setState({ sync: 'database' })
    } catch {
      databaseEnabled = false
      useMissionStore.setState({ sync: 'offline' })
    }
  }
}

let queuedSave: { name: string; value: string } | null = null
let persistTimer: number | null = null

const browserStorage = {
  getItem: (name: string) => localStorage.getItem(name),
  setItem: (name: string, value: string) => {
    queuedSave = { name, value }
    if (persistTimer) window.clearTimeout(persistTimer)
    persistTimer = window.setTimeout(() => {
      if (queuedSave) localStorage.setItem(queuedSave.name, queuedSave.value)
      queuedSave = null
    }, 350)
  },
  removeItem: (name: string) => localStorage.removeItem(name),
}

window.addEventListener('beforeunload', () => {
  if (queuedSave) localStorage.setItem(queuedSave.name, queuedSave.value)
})

function replaceMission(missions: MissionConfig[], next: MissionConfig) {
  return missions.map((mission) => (mission.id === next.id ? next : mission))
}

export function designLocked(status: MissionStatus) {
  return status === 'running' || status === 'paused'
}

export const useMissionStore = create<MissionStore>()(
  persist(
    (set, get) => ({
      missions: [],
      activeMissionId: null,
      sync: 'device',
      hydrated: false,
      ensureDraft: () => {
        const { missions, activeMissionId } = get()
        const active = missions.find((mission) => mission.id === activeMissionId)
        if (active && active.status === 'draft' && !active.destinationId && active.objectiveIds.length === 0) {
          const untouched = (Object.keys(active.spacecraft) as (keyof SpacecraftSelection)[]).every((key) => !active.spacecraft[key])
          if (untouched && active.instrumentIds.length === 0 && !active.launchVehicleId) return active.id
        }
        return get().createMission()
      },
      createMission: () => {
        const mission = newMission()
        set({ missions: [mission, ...get().missions], activeMissionId: mission.id })
        queueSave(mission)
        return mission.id
      },
      setActive: (id) => set({ activeMissionId: id }),
      updateActive: (recipe) => {
        const current = get().missions.find((mission) => mission.id === get().activeMissionId)
        if (!current || designLocked(current.status)) return
        let next = recipe(current)
        if (current.status === 'completed' || current.status === 'failed') {
          next = { ...next, status: 'draft', flight: null, report: null }
        }
        next = { ...next, updatedAt: new Date().toISOString() }
        set({ missions: replaceMission(get().missions, next) })
        queueSave(next)
      },
      deleteMission: (id) => {
        const missions = get().missions.filter((mission) => mission.id !== id)
        const activeMissionId = get().activeMissionId === id ? (missions[0]?.id ?? null) : get().activeMissionId
        set({ missions, activeMissionId })
        if (databaseEnabled) {
          void deleteMissionRemote(id).catch(() => {
            databaseEnabled = false
            set({ sync: 'offline' })
          })
        }
      },
      duplicateMission: (id) => {
        const source = get().missions.find((mission) => mission.id === id)
        if (!source) return null
        const now = new Date().toISOString()
        const copy = structuredClone(source)
        copy.id = crypto.randomUUID()
        copy.name = `${source.name} copy`.slice(0, 64)
        copy.createdAt = now
        copy.updatedAt = now
        if (copy.status === 'running' || copy.status === 'paused') {
          copy.status = 'draft'
          copy.flight = null
          copy.report = null
        }
        set({ missions: [copy, ...get().missions], activeMissionId: copy.id })
        queueSave(copy)
        return copy.id
      },
      startSimulation: () => {
        const current = get().missions.find((mission) => mission.id === get().activeMissionId)
        if (!current || current.status === 'running') return false
        const metrics = computeMetrics(current)
        if (!metrics.ready) return false
        const flight = createFlight(current, { seed: hashSeed(`${current.id}:${Date.now()}`) })
        const next: MissionConfig = {
          ...current,
          status: 'running',
          flight,
          report: null,
          updatedAt: new Date().toISOString(),
        }
        set({ missions: replaceMission(get().missions, next) })
        queueSave(next)
        return true
      },
      pauseSimulation: () => {
        const current = get().missions.find((mission) => mission.id === get().activeMissionId)
        if (!current?.flight || current.status !== 'running') return
        const next = { ...current, status: 'paused' as const, updatedAt: new Date().toISOString() }
        set({ missions: replaceMission(get().missions, next) })
        queueSave(next)
      },
      resumeSimulation: () => {
        const current = get().missions.find((mission) => mission.id === get().activeMissionId)
        if (!current?.flight || current.status !== 'paused' || current.flight.finished) return
        const next = { ...current, status: 'running' as const, updatedAt: new Date().toISOString() }
        set({ missions: replaceMission(get().missions, next) })
        queueSave(next)
      },
      restartSimulation: () => {
        const current = get().missions.find((mission) => mission.id === get().activeMissionId)
        if (!current) return
        const next: MissionConfig = {
          ...current,
          status: 'draft',
          flight: null,
          report: null,
          updatedAt: new Date().toISOString(),
        }
        set({ missions: replaceMission(get().missions, next) })
        queueSave(next)
      },
      setSpeed: (speed) => {
        const current = get().missions.find((mission) => mission.id === get().activeMissionId)
        if (!current?.flight || current.flight.finished) return
        const next = { ...current, flight: { ...current.flight, speed } }
        set({ missions: replaceMission(get().missions, next) })
      },
      resolveEvent: (optionId) => {
        const current = get().missions.find((mission) => mission.id === get().activeMissionId)
        if (!current?.flight?.pending) return
        const flight = resolveFlightEvent(current.flight, current, optionId)
        const next = { ...current, flight, updatedAt: new Date().toISOString() }
        set({ missions: replaceMission(get().missions, next) })
        queueSave(next)
      },
      tick: (realSeconds) => {
        const current = get().missions.find((mission) => mission.id === get().activeMissionId)
        if (!current?.flight || current.status !== 'running' || current.flight.pending || current.flight.finished) return
        const hours = missionHoursFor(current.flight, realSeconds)
        const flight = advanceFlight(current.flight, current, hours)
        let status: MissionStatus = current.status
        let report = current.report
        if (flight.finished) {
          status = flight.outcome === 'success' ? 'completed' : 'failed'
          report = buildReport({ ...current, flight, status })
        }
        const next: MissionConfig = {
          ...current,
          status,
          flight,
          report,
          updatedAt: flight.finished ? new Date().toISOString() : current.updatedAt,
        }
        set({ missions: replaceMission(get().missions, next) })
        if (flight.finished) queueSave(next)
      },
      syncFromServer: async () => {
        const health = await getHealth()
        if (!health) {
          set({ sync: 'offline' })
          return
        }
        if (!health.mongo) {
          databaseEnabled = false
          set({ sync: 'device' })
          return
        }
        const remote = await fetchMissions()
        if (!remote) {
          databaseEnabled = false
          set({ sync: 'offline' })
          return
        }
        databaseEnabled = true
        const merged = new Map(get().missions.map((mission) => [mission.id, mission]))
        for (const item of remote) {
          if (!isMission(item)) continue
          const current = merged.get(item.id)
          if (!current || item.updatedAt > current.updatedAt) merged.set(item.id, item)
        }
        const missions = [...merged.values()].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
        set({ missions, sync: 'database' })
        for (const mission of missions) {
          const remoteCopy = remote.find((item) => isMission(item) && item.id === mission.id)
          if (!remoteCopy || (isMission(remoteCopy) && mission.updatedAt > remoteCopy.updatedAt)) {
            try {
              await saveMission(mission)
            } catch {
              databaseEnabled = false
              set({ sync: 'offline' })
              break
            }
          }
        }
      },
    }),
    {
      name: 'orbitx-save',
      storage: createJSONStorage(() => browserStorage),
      partialize: (state) => ({ missions: state.missions, activeMissionId: state.activeMissionId }),
      onRehydrateStorage: () => () => {
        useMissionStore.setState({ hydrated: true })
      },
    },
  ),
)

export function activeMission(state: MissionStore) {
  return state.missions.find((mission) => mission.id === state.activeMissionId) ?? null
}

export const DIFFICULTY_ORDER: Difficulty[] = ['beginner', 'intermediate', 'expert']
