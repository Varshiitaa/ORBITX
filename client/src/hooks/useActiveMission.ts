import { useMemo } from 'react'
import { computeMetrics } from '../engine/calculations'
import { useMissionStore } from '../store/missionStore'

export function useActiveMission() {
  const mission = useMissionStore((state) => state.missions.find((item) => item.id === state.activeMissionId) ?? null)
  const metrics = useMemo(() => (mission ? computeMetrics(mission) : null), [mission])
  return { mission, metrics }
}
